/**
 * Provider commercial terms — admin-writable, provider-readable (own), never patient-visible splits.
 *
 * Collection: providerCommercialTerms/{providerId}
 * History: providerCommercialTerms/{providerId}/history/{autoId}  (append-only)
 * Change requests: providerCommercialChangeRequests/{id}
 *
 * Money fields are ALWAYS required explicitly on create/update.
 * SUGGESTED_ADMIN_FORM_TEMPLATE (1000/600/400) is documentation/UI hint only —
 * never applied silently by the backend.
 */

const {
  CONSULTATION_TYPES,
  PRICING_MODELS,
  CURRENCY_LKR,
  DEFAULT_LAUNCH_COMMERCIAL_TEMPLATE,
} = require('./constants');
const { validateFixedSplitAmounts, roundMoney } = require('./pricing');
const { toMinor, toMinorOrZero, fromMinor } = require('./money');

/** Suggested admin form values — NOT applied when fields are omitted. */
const SUGGESTED_ADMIN_FORM_TEMPLATE = { ...DEFAULT_LAUNCH_COMMERCIAL_TEMPLATE };

function normalizeConsultationType(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'in-person') return 'in_person';
  return t;
}

function isMissingMoney(v) {
  return v === undefined || v === null || v === '';
}

/**
 * Build + validate a term. Requires explicit money fields (no silent defaults).
 */
function buildTermPayload(input = {}, { actorUid, previousVersion = 0 } = {}) {
  const consultationType = normalizeConsultationType(input.consultationType);
  if (!CONSULTATION_TYPES.includes(consultationType)) {
    return {
      ok: false,
      code: 'INVALID_CONSULTATION_TYPE',
      error: `consultationType must be one of: ${CONSULTATION_TYPES.join(', ')}`,
    };
  }

  const pricingModel = String(input.pricingModel || PRICING_MODELS.FIXED_SPLIT);
  if (!Object.values(PRICING_MODELS).includes(pricingModel)) {
    return { ok: false, code: 'INVALID_PRICING_MODEL', error: `Invalid pricingModel: ${pricingModel}` };
  }

  const currency = String(input.currency || CURRENCY_LKR).toUpperCase();
  // facilityFee may default to 0 (optional component); other money fields cannot
  const facilityFee = isMissingMoney(input.facilityFee) ? 0 : input.facilityFee;
  const now = new Date().toISOString();

  let term = {
    consultationType,
    currency,
    pricingModel,
    facilityFee: roundMoney(facilityFee),
    active: input.active !== false,
    effectiveFrom: input.effectiveFrom || now,
    version: previousVersion + 1,
    createdAt: input.createdAt || now,
    updatedAt: now,
    createdBy: input.createdBy || actorUid || null,
    updatedBy: actorUid || null,
  };

  if (pricingModel === PRICING_MODELS.PERCENTAGE_SPLIT) {
    if (isMissingMoney(input.consultationPrice)) {
      return {
        ok: false,
        code: 'COMMERCIAL_TERMS_INCOMPLETE',
        error: 'consultationPrice is required (no silent defaults)',
      };
    }
    if (isMissingMoney(input.doctorPercentage) || isMissingMoney(input.platformPercentage)) {
      return {
        ok: false,
        code: 'COMMERCIAL_TERMS_INCOMPLETE',
        error: 'doctorPercentage and platformPercentage are required',
      };
    }
    const consultationPrice = roundMoney(input.consultationPrice);
    const doctorPercentage = Number(input.doctorPercentage);
    const platformPercentage = Number(input.platformPercentage);
    if (!(consultationPrice > 0)) return { ok: false, error: 'consultationPrice must be > 0' };
    if (!Number.isFinite(doctorPercentage) || !Number.isFinite(platformPercentage)) {
      return { ok: false, error: 'doctorPercentage and platformPercentage must be numbers' };
    }
    if (Math.round((doctorPercentage + platformPercentage) * 100) !== 10000) {
      return { ok: false, error: 'doctorPercentage + platformPercentage must equal 100' };
    }
    const facilityM = toMinorOrZero(facilityFee);
    const priceM = toMinor(consultationPrice, 'consultationPrice');
    if (facilityM > priceM) {
      return { ok: false, error: 'facilityFee cannot exceed consultationPrice' };
    }
    const after = priceM - facilityM;
    const payoutM = Math.floor((after * doctorPercentage) / 100);
    const platformM = after - payoutM;
    term = {
      ...term,
      consultationPrice,
      doctorPercentage,
      platformPercentage,
      providerPayout: fromMinor(payoutM),
      platformGross: fromMinor(platformM),
      facilityFee: fromMinor(facilityM),
    };
  } else {
    if (
      isMissingMoney(input.consultationPrice) ||
      isMissingMoney(input.providerPayout) ||
      isMissingMoney(input.platformGross)
    ) {
      return {
        ok: false,
        code: 'COMMERCIAL_TERMS_INCOMPLETE',
        error:
          'consultationPrice, providerPayout, and platformGross are required (no silent money defaults)',
      };
    }
    const checked = validateFixedSplitAmounts({
      consultationPrice: input.consultationPrice,
      providerPayout: input.providerPayout,
      platformGross: input.platformGross,
      facilityFee,
    });
    if (!checked.ok) {
      return { ok: false, code: 'INVALID_COMMERCIAL_SPLIT', error: checked.errors.join('; ') };
    }
    term = {
      ...term,
      consultationPrice: checked.normalized.consultationPrice,
      providerPayout: checked.normalized.providerPayout,
      platformGross: checked.normalized.platformGross,
      facilityFee: checked.normalized.facilityFee,
    };
  }

  return { ok: true, term };
}

async function getCommercialTermsDoc(db, providerId) {
  const ref = db.collection('providerCommercialTerms').doc(providerId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function getActiveTermForType(db, providerId, consultationType) {
  const doc = await getCommercialTermsDoc(db, providerId);
  if (!doc) return null;
  const type = normalizeConsultationType(consultationType);
  const term = doc.types?.[type];
  if (!term || term.active === false) return null;
  // Ensure money fields present — refuse incomplete stored terms
  if (
    term.consultationPrice === undefined ||
    term.providerPayout === undefined ||
    term.platformGross === undefined
  ) {
    return null;
  }
  return { ...term, providerId, consultationType: type };
}

/**
 * Admin upsert for one consultation type. Version server-controlled; history append-only.
 */
async function upsertCommercialTerm(db, providerId, input, actorUid) {
  if (!providerId) throw new Error('providerId required');
  const ref = db.collection('providerCommercialTerms').doc(providerId);

  // Atomic read-modify-write via transaction where supported
  const result = await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    const data = existing.exists ? existing.data() || {} : {};
    const type = normalizeConsultationType(input.consultationType);
    const prev = data.types?.[type];
    const previousVersion = Number(prev?.version || 0);

    const built = buildTermPayload(input, { actorUid, previousVersion });
    if (!built.ok) {
      const err = new Error(built.error);
      err.statusCode = 400;
      err.code = built.code || 'COMMERCIAL_TERMS_INVALID';
      throw err;
    }

    const now = new Date().toISOString();
    if (prev?.createdAt) {
      built.term.createdAt = prev.createdAt;
      built.term.createdBy = prev.createdBy || actorUid;
    }

    // Deactivate is separate; upsert of active:true replaces the single active version for this type
    const types = { ...(data.types || {}) };
    types[type] = built.term;

    const payload = {
      providerId,
      currency: built.term.currency,
      types,
      version: Number(data.version || 0) + 1,
      updatedAt: now,
      updatedBy: actorUid || null,
      createdAt: data.createdAt || now,
      createdBy: data.createdBy || actorUid || null,
    };

    tx.set(ref, payload, { merge: true });
    return { payload, term: built.term, type, now, action: prev ? 'update' : 'create' };
  });

  // History is append-only (outside tx is acceptable; failure won't roll back terms —
  // use separate add). For stronger guarantees, history write could be in same tx if
  // memory/mock supports it — our mock does.
  await db
    .collection('providerCommercialTerms')
    .doc(providerId)
    .collection('history')
    .add({
      consultationType: result.type,
      term: result.term,
      action: result.action,
      actorUid: actorUid || null,
      createdAt: result.now,
      // history docs are never updated by this module
      immutable: true,
    });

  return { providerId, term: result.term, document: result.payload };
}

async function setTermActive(db, providerId, consultationType, active, actorUid) {
  const ref = db.collection('providerCommercialTerms').doc(providerId);
  const type = normalizeConsultationType(consultationType);

  const next = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      const err = new Error('Commercial terms not found');
      err.statusCode = 404;
      err.code = 'COMMERCIAL_TERMS_NOT_CONFIGURED';
      throw err;
    }
    const data = snap.data() || {};
    const prev = data.types?.[type];
    if (!prev) {
      const err = new Error(`No terms for consultationType ${type}`);
      err.statusCode = 404;
      err.code = 'COMMERCIAL_TERMS_NOT_CONFIGURED';
      throw err;
    }
    const now = new Date().toISOString();
    const updated = {
      ...prev,
      active: !!active,
      updatedAt: now,
      updatedBy: actorUid || null,
      version: Number(prev.version || 0) + 1,
    };
    tx.set(
      ref,
      {
        types: { ...(data.types || {}), [type]: updated },
        version: Number(data.version || 0) + 1,
        updatedAt: now,
        updatedBy: actorUid || null,
      },
      { merge: true }
    );
    return { updated, now };
  });

  await ref.collection('history').add({
    consultationType: type,
    term: next.updated,
    action: active ? 'activate' : 'deactivate',
    actorUid: actorUid || null,
    createdAt: next.now,
    immutable: true,
  });
  return next.updated;
}

async function createChangeRequest(db, providerId, requestedTerms, actorUid) {
  const type = normalizeConsultationType(requestedTerms.consultationType);
  if (!CONSULTATION_TYPES.includes(type)) {
    const err = new Error('Invalid consultationType');
    err.statusCode = 400;
    throw err;
  }
  const now = new Date().toISOString();
  const doc = {
    providerId,
    consultationType: type,
    requested: {
      consultationPrice: requestedTerms.consultationPrice,
      providerPayout: requestedTerms.providerPayout,
      platformGross: requestedTerms.platformGross,
      facilityFee: requestedTerms.facilityFee,
      pricingModel: requestedTerms.pricingModel,
      doctorPercentage: requestedTerms.doctorPercentage,
      platformPercentage: requestedTerms.platformPercentage,
    },
    status: 'PENDING_ADMIN',
    createdAt: now,
    updatedAt: now,
    createdBy: actorUid,
  };
  const creRef = await db.collection('providerCommercialChangeRequests').add(doc);
  return { id: creRef.id, ...doc };
}

function toProviderView(doc) {
  if (!doc) return null;
  const types = {};
  for (const t of CONSULTATION_TYPES) {
    const term = doc.types?.[t];
    if (!term) continue;
    types[t] = {
      consultationType: t,
      currency: term.currency,
      pricingModel: term.pricingModel,
      consultationPrice: term.consultationPrice,
      providerPayout: term.providerPayout,
      platformGross: term.platformGross,
      facilityFee: term.facilityFee || 0,
      doctorPercentage: term.doctorPercentage,
      platformPercentage: term.platformPercentage,
      active: term.active !== false,
      effectiveFrom: term.effectiveFrom,
      version: term.version,
      updatedAt: term.updatedAt,
    };
  }
  return {
    providerId: doc.providerId,
    currency: doc.currency || CURRENCY_LKR,
    types,
    updatedAt: doc.updatedAt,
  };
}

function toPublicPrices(doc) {
  if (!doc?.types) return {};
  const out = {};
  for (const t of CONSULTATION_TYPES) {
    const term = doc.types[t];
    if (!term || term.active === false) continue;
    out[t] = {
      consultationType: t,
      currency: term.currency || CURRENCY_LKR,
      consultationPrice: roundMoney(term.consultationPrice),
    };
    if (roundMoney(term.facilityFee || 0) > 0) {
      out[t].facilityFee = roundMoney(term.facilityFee);
    }
  }
  return out;
}

module.exports = {
  normalizeConsultationType,
  buildTermPayload,
  getCommercialTermsDoc,
  getActiveTermForType,
  upsertCommercialTerm,
  setTermActive,
  createChangeRequest,
  toProviderView,
  toPublicPrices,
  SUGGESTED_ADMIN_FORM_TEMPLATE,
  /** @deprecated alias — suggested form only */
  DEFAULT_LAUNCH_COMMERCIAL_TEMPLATE: SUGGESTED_ADMIN_FORM_TEMPLATE,
};
