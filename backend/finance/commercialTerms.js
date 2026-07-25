/**
 * Provider commercial terms — admin-writable, provider-readable (own), never patient-visible splits.
 * Collection: providerCommercialTerms/{providerId}
 * History: providerCommercialTerms/{providerId}/history/{autoId}
 * Change requests: providerCommercialChangeRequests/{id}
 */

const {
  CONSULTATION_TYPES,
  PRICING_MODELS,
  CURRENCY_LKR,
  DEFAULT_LAUNCH_COMMERCIAL_TEMPLATE,
} = require('./constants');
const { validateFixedSplitAmounts, roundMoney } = require('./pricing');

function normalizeConsultationType(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'in-person') return 'in_person';
  return t;
}

function buildTermPayload(input = {}, { actorUid, previousVersion = 0 } = {}) {
  const consultationType = normalizeConsultationType(input.consultationType);
  if (!CONSULTATION_TYPES.includes(consultationType)) {
    return { ok: false, error: `consultationType must be one of: ${CONSULTATION_TYPES.join(', ')}` };
  }

  const pricingModel = String(input.pricingModel || PRICING_MODELS.FIXED_SPLIT);
  if (!Object.values(PRICING_MODELS).includes(pricingModel)) {
    return { ok: false, error: `Invalid pricingModel: ${pricingModel}` };
  }

  const currency = String(input.currency || CURRENCY_LKR).toUpperCase();
  const facilityFee = roundMoney(input.facilityFee ?? 0);
  const now = new Date().toISOString();

  let term = {
    consultationType,
    currency,
    pricingModel,
    facilityFee,
    active: input.active !== false,
    effectiveFrom: input.effectiveFrom || now,
    version: previousVersion + 1,
    createdAt: input.createdAt || now,
    updatedAt: now,
    createdBy: input.createdBy || actorUid || null,
    updatedBy: actorUid || null,
  };

  if (pricingModel === PRICING_MODELS.PERCENTAGE_SPLIT) {
    const consultationPrice = roundMoney(input.consultationPrice);
    const doctorPercentage = Number(input.doctorPercentage);
    const platformPercentage = Number(input.platformPercentage);
    if (!(consultationPrice > 0)) return { ok: false, error: 'consultationPrice must be > 0' };
    if (!Number.isFinite(doctorPercentage) || !Number.isFinite(platformPercentage)) {
      return { ok: false, error: 'doctorPercentage and platformPercentage are required' };
    }
    if (roundMoney(doctorPercentage + platformPercentage) !== 100) {
      return { ok: false, error: 'doctorPercentage + platformPercentage must equal 100' };
    }
    if (facilityFee > consultationPrice) {
      return { ok: false, error: 'facilityFee cannot exceed consultationPrice' };
    }
    const priceAfterFacility = roundMoney(consultationPrice - facilityFee);
    const providerPayout = roundMoney((priceAfterFacility * doctorPercentage) / 100);
    const platformGross = roundMoney(priceAfterFacility - providerPayout);
    term = {
      ...term,
      consultationPrice,
      doctorPercentage,
      platformPercentage,
      providerPayout,
      platformGross,
    };
  } else {
    const checked = validateFixedSplitAmounts({
      consultationPrice: input.consultationPrice,
      providerPayout: input.providerPayout,
      platformGross: input.platformGross,
      facilityFee,
    });
    if (!checked.ok) return { ok: false, error: checked.errors.join('; ') };
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

/** Apply launch template defaults when admin omits fields (NOT used at booking time). */
function withLaunchTemplateDefaults(input = {}) {
  const t = DEFAULT_LAUNCH_COMMERCIAL_TEMPLATE;
  return {
    pricingModel: input.pricingModel || t.pricingModel,
    currency: input.currency || t.currency,
    consultationPrice: input.consultationPrice !== undefined ? input.consultationPrice : t.consultationPrice,
    providerPayout: input.providerPayout !== undefined ? input.providerPayout : t.providerPayout,
    platformGross: input.platformGross !== undefined ? input.platformGross : t.platformGross,
    facilityFee: input.facilityFee !== undefined ? input.facilityFee : t.facilityFee,
    consultationType: input.consultationType,
    active: input.active,
    effectiveFrom: input.effectiveFrom,
    doctorPercentage: input.doctorPercentage,
    platformPercentage: input.platformPercentage,
  };
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
  return { ...term, providerId, consultationType: type };
}

/**
 * Admin upsert for one consultation type. Increments version and writes history.
 */
async function upsertCommercialTerm(db, providerId, input, actorUid) {
  if (!providerId) throw new Error('providerId required');
  const ref = db.collection('providerCommercialTerms').doc(providerId);
  const existing = await ref.get();
  const data = existing.exists ? existing.data() || {} : {};
  const type = normalizeConsultationType(input.consultationType);
  const prev = data.types?.[type];
  const previousVersion = Number(prev?.version || data.version || 0);

  const built = buildTermPayload(withLaunchTemplateDefaults(input), {
    actorUid,
    previousVersion,
  });
  if (!built.ok) {
    const err = new Error(built.error);
    err.statusCode = 400;
    throw err;
  }

  const now = new Date().toISOString();
  const types = { ...(data.types || {}) };
  // Preserve createdAt/createdBy on update
  if (prev?.createdAt) {
    built.term.createdAt = prev.createdAt;
    built.term.createdBy = prev.createdBy || actorUid;
  }
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

  await ref.set(payload, { merge: true });
  await ref.collection('history').add({
    consultationType: type,
    term: built.term,
    action: prev ? 'update' : 'create',
    actorUid: actorUid || null,
    createdAt: now,
  });

  return { providerId, term: built.term, document: payload };
}

async function setTermActive(db, providerId, consultationType, active, actorUid) {
  const ref = db.collection('providerCommercialTerms').doc(providerId);
  const snap = await ref.get();
  if (!snap.exists) {
    const err = new Error('Commercial terms not found');
    err.statusCode = 404;
    throw err;
  }
  const type = normalizeConsultationType(consultationType);
  const data = snap.data() || {};
  const prev = data.types?.[type];
  if (!prev) {
    const err = new Error(`No terms for consultationType ${type}`);
    err.statusCode = 404;
    throw err;
  }
  const now = new Date().toISOString();
  const next = {
    ...prev,
    active: !!active,
    updatedAt: now,
    updatedBy: actorUid || null,
    version: Number(prev.version || 0) + 1,
  };
  await ref.set(
    {
      types: { ...(data.types || {}), [type]: next },
      version: Number(data.version || 0) + 1,
      updatedAt: now,
      updatedBy: actorUid || null,
    },
    { merge: true }
  );
  await ref.collection('history').add({
    consultationType: type,
    term: next,
    action: active ? 'activate' : 'deactivate',
    actorUid: actorUid || null,
    createdAt: now,
  });
  return next;
}

/** Provider may request a change; cannot apply it. */
async function createChangeRequest(db, providerId, requestedTerms, actorUid) {
  const type = normalizeConsultationType(requestedTerms.consultationType);
  if (!CONSULTATION_TYPES.includes(type)) {
    const err = new Error(`Invalid consultationType`);
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
  const ref = await db.collection('providerCommercialChangeRequests').add(doc);
  return { id: ref.id, ...doc };
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
  withLaunchTemplateDefaults,
  getCommercialTermsDoc,
  getActiveTermForType,
  upsertCommercialTerm,
  setTermActive,
  createChangeRequest,
  toProviderView,
  toPublicPrices,
  DEFAULT_LAUNCH_COMMERCIAL_TEMPLATE,
};
