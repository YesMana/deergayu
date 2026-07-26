/**
 * P1-B facilities + provider affiliations — additive foundation.
 * No seed data. Public only for status === 'active'.
 */

const FACILITY_TYPES = ['clinic', 'hospital', 'ayurveda_centre', 'wellness_centre'];
const FACILITY_STATUSES = ['active', 'inactive', 'draft'];

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
  if (!partial || body.status !== undefined) {
    const s = str(body.status, 20) || 'draft';
    out.status = FACILITY_STATUSES.includes(s) ? s : 'draft';
  }
  return out;
}

function toPublicFacility(id, data = {}) {
  if (!data || data.status !== 'active') return null;
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
  return {
    id,
    providerId: data.providerId,
    facilityId: data.facilityId,
    consultationTypes: Array.isArray(data.consultationTypes) ? data.consultationTypes : [],
    status: data.status || 'active',
    facility: facilityPublic || undefined,
  };
}

module.exports = {
  FACILITY_TYPES,
  FACILITY_STATUSES,
  slugifyFacilityName,
  sanitizeFacilityInput,
  toPublicFacility,
  toAdminFacility,
  ensureUniqueFacilitySlug,
  toPublicAffiliation,
};
