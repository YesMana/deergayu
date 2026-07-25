/** Helpers for public doctor directory — no payout/finance fields. */

export function specialtyToSlug(name = '') {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0d80-\u0dff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function slugToSpecialtyLookup(slug, specialties = []) {
  const s = String(slug || '').toLowerCase();
  return specialties.find((name) => specialtyToSlug(name) === s) || null;
}

export function getProviderSpecialties(provider) {
  const raw = provider?.profileDetails?.specialty;
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(/[,|/]/).map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

export function getProviderTitle(provider) {
  const pd = provider?.profileDetails || {};
  return pd.title || pd.doctorType || roleLabel(provider?.role) || 'Healthcare Provider';
}

export function roleLabel(role) {
  const map = {
    doctor: 'Doctor',
    clinic: 'Clinic',
    organization: 'Organisation',
    vendor: 'Provider',
  };
  return map[role] || 'Provider';
}

export function getConsultationTypes(provider) {
  const pd = provider?.profileDetails || {};
  const types = [];
  // Schedule presence implies in-person availability; video if explicitly enabled or default offer
  if (pd.offersInPerson !== false) types.push('in_person');
  if (pd.offersVideo === true || pd.videoConsultation === true || pd.consultationModes?.includes?.('video')) {
    types.push('video');
  }
  if (pd.offersAudio === true || pd.consultationModes?.includes?.('audio')) {
    types.push('audio');
  }
  // If nothing flagged, still show in_person as the platform default booking mode
  if (!types.length) types.push('in_person');
  return types;
}

export function consultationTypeLabel(type) {
  const map = {
    in_person: 'In person',
    video: 'Video',
    audio: 'Audio',
  };
  return map[type] || type;
}

/**
 * Platform listing approval only (admin reviewed account for public directory).
 * Does NOT mean professional credentials were independently verified.
 * UI must label this as "Deergayu Approved", never "Verified Doctor".
 *
 * Public GET /api/providers filters status==approved and returns status when available.
 * If status is omitted on a public listing payload, treat as approved (listing itself is the signal).
 */
export function isApprovedProvider(provider) {
  if (!provider) return false;
  if (provider.status != null && String(provider.status) !== '') {
    return String(provider.status) === 'approved';
  }
  return ['doctor', 'clinic', 'organization'].includes(String(provider.role || ''));
}

export function collectSpecialtiesFromProviders(providers = []) {
  const set = new Set();
  for (const p of providers) {
    getProviderSpecialties(p).forEach((s) => set.add(s));
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export async function fetchPublicConsultationPrice(apiUrl, providerId, consultationType = 'in_person') {
  try {
    const res = await fetch(`${apiUrl}/api/providers/${providerId}/consultation-prices`);
    if (!res.ok) return null;
    const data = await res.json();
    const prices = data.prices || {};
    const entry = prices[consultationType] || prices.in_person || Object.values(prices)[0];
    if (!entry || entry.consultationPrice == null) return null;
    return {
      consultationPrice: Number(entry.consultationPrice),
      currency: entry.currency || 'LKR',
      consultationType: entry.consultationType || consultationType,
    };
  } catch {
    return null;
  }
}
