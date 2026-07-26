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

/** Trim and drop empty / whitespace-only public display strings. */
export function cleanDisplayText(value) {
  if (value == null) return '';
  const s = String(value).trim().replace(/\s+/g, ' ');
  return s;
}

export function isDisplayableText(value) {
  return Boolean(cleanDisplayText(value));
}

/**
 * Heuristic for admin cleanup reports only — never auto-delete DB data.
 * Flags very short gibberish / keyboard-mash looking specialty labels.
 */
export function looksLikeTestPlaceholder(value) {
  const s = cleanDisplayText(value).toLowerCase();
  if (!s) return false;
  if (s.length <= 3) return true;
  if (/^(test|xxx|asdf|qwer|hgfh|fghf|asdfg|lorem|dummy|placeholder)$/i.test(s)) return true;
  if (/^(.)\1{3,}$/.test(s)) return true;
  // Short keyboard-mash: few/no vowels, letters only
  if (s.length <= 5 && /^[a-z]+$/.test(s) && (s.match(/[aeiou]/g) || []).length === 0) {
    return true;
  }
  return false;
}

export function getProviderSpecialties(provider) {
  const raw = provider?.profileDetails?.specialty;
  let list = [];
  if (Array.isArray(raw)) list = raw.map(String);
  else if (typeof raw === 'string' && raw.trim()) {
    list = raw.split(/[,|/]/).map((x) => x.trim());
  }
  // Trim / drop empties; keep real stored values (even if low-quality) for honesty
  const seen = new Set();
  return list
    .map(cleanDisplayText)
    .filter(Boolean)
    .filter((s) => {
      const key = s.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function formatDoctorTypeLabel(doctorType) {
  const raw = cleanDisplayText(doctorType);
  if (!raw) return '';
  const map = {
    traditional: 'Traditional practitioner',
    'ayurvedic physician': 'Ayurvedic physician',
    'vedic astrologer': 'Vedic astrologer',
  };
  const key = raw.toLowerCase();
  if (map[key]) return map[key];
  // Title-case single tokens like "traditional"
  if (!/\s/.test(raw) && raw === raw.toLowerCase()) {
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  return raw;
}

export function getProviderTitle(provider) {
  const pd = provider?.profileDetails || {};
  const custom = cleanDisplayText(pd.title);
  if (custom) return custom;
  const typed = formatDoctorTypeLabel(pd.doctorType);
  if (typed) return typed;
  return roleLabel(provider?.role) || 'Healthcare Provider';
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
