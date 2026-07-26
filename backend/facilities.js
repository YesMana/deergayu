/**
 * P1-B facilities + provider affiliations — additive foundation.
 * No seed data. Public only for status === 'active'.
 *
 * Privileged writes are Admin SDK / Express only (Firestore client writes denied).
 */

const FACILITY_TYPES = ['clinic', 'hospital', 'ayurveda_centre', 'wellness_centre'];
const FACILITY_STATUSES = ['draft', 'active', 'inactive'];
const AFFILIATION_CONSULTATION_TYPES = ['in_person', 'video', 'audio'];
const ID_RE = /^[A-Za-z0-9_-]{6,128}$/;

function slugifyFacilityName(name = '') {
  return String(name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'facility';
}

function sanitizeFacilityInput(body = {}, { partial = false } = {}) {
  const out = {};
  const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);

  if (!partial || body.name !== undefined) out.name = str(body.name, 120);
  if (!partial || body.type !== undefined) {
    const t = str(body.type, 40);
    out.type = FACILITY_TYPES.includes(t) ? t : null;
  }
  if (!partial || body.address !== undefined) out.address = str(body.address, 300);
  if (!partial || body.district !== undefined) out.district = str(body.district, 80);
  if (!partial || body.city !== undefined) out.city = str(body.city, 80);
  if (!partial || body.province !== undefined) out.province = str(body.province, 80);
  if (!partial || body.country !== undefined) out.country = str(body.country || 'Sri Lanka', 80);
  if (!partial || body.contact !== undefined) out.contact = str(body.contact, 120);
  if (!partial || body.publicDescription !== undefined) {
    out.publicDescription = str(body.publicDescription, 2000);
  }
  // Internal notes never accepted from public clients; admin API may store separately later
  if (!partial || body.status !== undefined) {
    const s = str(body.status, 20);
    if (!s && !partial) {
      out.status = 'draft';
    } else if (s) {
      out.status = FACILITY_STATUSES.includes(s) ? s : null;
    }
  }
  return out;
}

function sanitizeAffiliationConsultationTypes(raw) {
  if (!Array.isArray(raw)) return null;
  const out = [];
  const seen = new Set();
  for (const t of raw) {
    const v = String(t || '').trim();
    if (!AFFILIATION_CONSULTATION_TYPES.includes(v)) return null;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out.length ? out : null;
}

function isValidEntityId(id) {
  return typeof id === 'string' && ID_RE.test(id);
}

/**
 * Server-side affiliation create validation (does not trust frontend labels).
 * Returns { ok: true, payload } or { ok: false, status, error }.
 */
async function validateAffiliationCreate(db, {
  facilityId,
  providerId,
  consultationTypes,
  status,
  consultationTypesFromProfile,
}) {
  if (!isValidEntityId(facilityId)) {
    return { ok: false, status: 400, error: 'Invalid facilityId' };
  }
  if (!isValidEntityId(providerId)) {
    return { ok: false, status: 400, error: 'Invalid providerId' };
  }
  const f = await db.collection('facilities').doc(facilityId).get();
  if (!f.exists) {
    return { ok: false, status: 404, error: 'Facility not found' };
  }
  const facility = f.data() || {};
  // Allow affiliation to draft/inactive for admin staging, but reject unknown status facilities
  if (!FACILITY_STATUSES.includes(String(facility.status || ''))) {
    return { ok: false, status: 400, error: 'Facility has invalid status' };
  }

  const u = await db.collection('users').doc(providerId).get();
  if (!u.exists) {
    return { ok: false, status: 400, error: 'Provider not found' };
  }
  const udata = u.data() || {};
  const role = String(udata.role || '');
  if (!['doctor', 'clinic', 'organization', 'vendor'].includes(role)) {
    return { ok: false, status: 400, error: 'Provider role is not eligible for affiliation' };
  }
  if (String(udata.status || '') === 'rejected') {
    return { ok: false, status: 400, error: 'Rejected providers cannot be affiliated' };
  }

  let types = sanitizeAffiliationConsultationTypes(consultationTypes);
  if (consultationTypes !== undefined && consultationTypes !== null && types === null) {
    return {
      ok: false,
      status: 400,
      error: `consultationTypes must be subset of ${AFFILIATION_CONSULTATION_TYPES.join(', ')}`,
    };
  }
  if (!types) {
    types = typeof consultationTypesFromProfile === 'function'
      ? consultationTypesFromProfile(udata.profileDetails || {})
      : ['in_person'];
    types = sanitizeAffiliationConsultationTypes(types) || ['in_person'];
  }

  const affStatus = status === 'inactive' ? 'inactive' : 'active';
  if (affStatus === 'active') {
    const dup = await db
      .collection('facilityAffiliations')
      .where('facilityId', '==', facilityId)
      .where('providerId', '==', providerId)
      .where('status', '==', 'active')
      .limit(1)
      .get();
    if (!dup.empty) {
      return { ok: false, status: 409, error: 'Active affiliation already exists for this provider and facility' };
    }
  }

  const now = new Date().toISOString();
  return {
    ok: true,
    payload: {
      facilityId,
      providerId,
      consultationTypes: types,
      status: affStatus,
      createdAt: now,
      updatedAt: now,
    },
  };
}

/** Public facility DTO — active only; no admin notes / audit dumps. */
function toPublicFacility(id, data = {}) {
  if (!data || data.status !== 'active') return null;
  if (!FACILITY_TYPES.includes(String(data.type || ''))) return null;
  return {
    id,
    name: data.name || '',
    slug: data.slug || id,
    type: data.type,
    address: data.address || '',
    district: data.district || '',
    city: data.city || '',
    province: data.province || '',
    country: data.country || 'Sri Lanka',
    // Facility public contact is intentionally published (clinic desk), not a private home phone
    contact: data.contact || '',
    publicDescription: data.publicDescription || '',
    status: 'active',
  };
}

function toAdminFacility(id, data = {}) {
  return {
    id,
    name: data.name || '',
    slug: data.slug || id,
    type: data.type || 'clinic',
    address: data.address || '',
    district: data.district || '',
    city: data.city || '',
    province: data.province || '',
    country: data.country || 'Sri Lanka',
    contact: data.contact || '',
    publicDescription: data.publicDescription || '',
    status: data.status || 'draft',
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

async function ensureUniqueFacilitySlug(db, base, excludeId = null) {
  let candidate = base;
  let n = 1;
  while (n < 100) {
    const snap = await db.collection('facilities').where('slug', '==', candidate).limit(1).get();
    if (snap.empty || (excludeId && snap.docs[0].id === excludeId)) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function toPublicAffiliation(id, data = {}, facilityPublic = null) {
  if (!data || data.status === 'inactive') return null;
  // Only surface affiliations tied to a public (active) facility
  if (!facilityPublic) return null;
  return {
    id,
    providerId: data.providerId,
    facilityId: data.facilityId,
    consultationTypes: Array.isArray(data.consultationTypes) ? data.consultationTypes : [],
    status: data.status || 'active',
    facility: facilityPublic,
  };
}

module.exports = {
  FACILITY_TYPES,
  FACILITY_STATUSES,
  AFFILIATION_CONSULTATION_TYPES,
  slugifyFacilityName,
  sanitizeFacilityInput,
  sanitizeAffiliationConsultationTypes,
  isValidEntityId,
  validateAffiliationCreate,
  toPublicFacility,
  toAdminFacility,
  ensureUniqueFacilitySlug,
  toPublicAffiliation,
};
