/**
 * P1-C profile completion + specialty quality helpers (frontend mirror of backend).
 * Heuristic only — never auto-deletes provider data.
 */

export const DEFAULT_SPECIALTY_CATALOG = [
  'General Ayurveda',
  'Panchakarma',
  'Weight management',
  'Non-communicable disorders',
  'Digestive health',
  'Skin & hair',
  "Women's health",
  'Joint & bone care',
  'Mental wellness',
  'Pediatric Ayurveda',
  'Pulse diagnosis',
  'Herbal medicine',
  'Yoga therapy',
  'Vedic astrology',
  'Other',
];

export const DEFAULT_LANGUAGES = ['Sinhala', 'Tamil', 'English'];

export function cleanText(value) {
  if (value == null) return '';
  return String(value).trim().replace(/\s+/g, ' ');
}

export function looksLikeSuspiciousSpecialty(value) {
  const s = cleanText(value).toLowerCase();
  if (!s) return false;
  if (s.length <= 3) return true;
  if (/^(test|xxx|asdf|qwer|hgfh|fghf|asdfg|lorem|dummy|placeholder|n\/a|na|null|undefined)$/i.test(s)) {
    return true;
  }
  if (/^(.)\1{3,}$/.test(s)) return true;
  if (s.length <= 5 && /^[a-z]+$/.test(s) && (s.match(/[aeiou]/g) || []).length === 0) {
    return true;
  }
  return false;
}

export function parseSpecialtyList(raw) {
  let list = [];
  if (Array.isArray(raw)) list = raw.map(String);
  else if (typeof raw === 'string' && raw.trim()) list = raw.split(/[,|/]/).map((x) => x.trim());
  const seen = new Set();
  return list
    .map(cleanText)
    .filter(Boolean)
    .filter((s) => {
      const k = s.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

/** Public-safe specialty labels (omit suspicious). */
export function getTrustedSpecialties(providerOrPd) {
  const pd = providerOrPd?.profileDetails || providerOrPd || {};
  const fromDto = Array.isArray(providerOrPd?.specialties) ? providerOrPd.specialties : null;
  const list = fromDto && fromDto.length ? fromDto.map(cleanText).filter(Boolean) : parseSpecialtyList(pd.specialty);
  return list.filter((s) => !looksLikeSuspiciousSpecialty(s));
}

export function normalizeQualifications(raw) {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  const out = [];
  for (const item of list) {
    if (item == null) continue;
    if (typeof item === 'string') {
      const name = cleanText(item);
      if (name) out.push({ qualificationName: name });
      continue;
    }
    if (typeof item === 'object') {
      const qualificationName = cleanText(item.qualificationName || item.name || item.title || '');
      if (!qualificationName) continue;
      const entry = { qualificationName };
      const institution = cleanText(item.institution || '');
      const country = cleanText(item.country || '');
      if (institution) entry.institution = institution;
      if (country) entry.country = country;
      if (item.year != null && String(item.year).trim() !== '') {
        const y = Number(item.year);
        entry.year = Number.isFinite(y) ? y : cleanText(item.year);
      }
      out.push(entry);
    }
  }
  return out;
}

export function normalizeLanguages(raw) {
  let list = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === 'string' && raw.trim()) list = raw.split(/[,|/]/);
  const seen = new Set();
  return list
    .map(cleanText)
    .filter(Boolean)
    .filter((s) => {
      const k = s.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

function hasRealSchedule(schedule) {
  if (!schedule || typeof schedule !== 'object') return false;
  const days = schedule.workingDays || {};
  return Object.values(days).some(
    (d) => d && d.active !== false && d.start && d.end
  );
}

function hasExplicitConsultationChoice(pd = {}) {
  if (pd.offersInPerson === true || pd.offersInPerson === false) return true;
  if (pd.offersVideo === true || pd.offersAudio === true) return true;
  if (pd.videoConsultation === true) return true;
  if (Array.isArray(pd.consultationModes) && pd.consultationModes.length) return true;
  return false;
}

const REQUIRED = [
  { key: 'name', label: 'Provider name', action: 'Add display name' },
  { key: 'title', label: 'Professional title / type', action: 'Add professional title' },
  { key: 'specialty', label: 'Specialty', action: 'Add specialty' },
  { key: 'bio', label: 'Professional bio', action: 'Add professional bio' },
  { key: 'consultationTypes', label: 'Consultation type', action: 'Set consultation type' },
  { key: 'schedule', label: 'Schedule', action: 'Set schedule' },
  { key: 'location', label: 'District / city', action: 'Add city or district' },
];

const RECOMMENDED = [
  { key: 'photo', label: 'Profile photo', action: 'Add profile photo' },
  { key: 'qualifications', label: 'Qualifications', action: 'Add qualification' },
  { key: 'registrationNumber', label: 'Registration number', action: 'Add registration number' },
  { key: 'languages', label: 'Languages', action: 'Add languages' },
];

export function computeProfileCompletion(user = {}) {
  const pd = user.profileDetails || {};
  const presence = {
    name: Boolean(cleanText(user.name || user.displayName)),
    title: Boolean(cleanText(pd.title || pd.doctorType)),
    specialty: getTrustedSpecialties({ profileDetails: pd }).length > 0,
    bio: cleanText(pd.bio).length >= 20,
    consultationTypes: hasExplicitConsultationChoice(pd),
    schedule: hasRealSchedule(pd.schedule),
    location: Boolean(cleanText(pd.city) || cleanText(pd.district)),
    photo: Boolean(cleanText(pd.profileImageUrl)),
    qualifications: normalizeQualifications(pd.qualifications).length > 0,
    registrationNumber: Boolean(cleanText(pd.registrationNumber)),
    languages: normalizeLanguages(pd.languages).length > 0,
  };
  const missingRequired = REQUIRED.filter((f) => !presence[f.key]).map((f) => ({ ...f, required: true }));
  const missingRecommended = RECOMMENDED.filter((f) => !presence[f.key]).map((f) => ({
    ...f,
    required: false,
  }));
  const requiredTotal = REQUIRED.length;
  const requiredDone = requiredTotal - missingRequired.length;
  const percent = Math.round((requiredDone / requiredTotal) * 100);
  const suspiciousSpecialties = parseSpecialtyList(pd.specialty).filter(looksLikeSuspiciousSpecialty);
  const suspiciousAddress = looksLikeSuspiciousSpecialty(pd.address) ? [cleanText(pd.address)] : [];
  return {
    percent,
    requiredDone,
    requiredTotal,
    missingRequired,
    missingRecommended,
    suspiciousSpecialties,
    suspiciousAddress,
    presence,
  };
}
