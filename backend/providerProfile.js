/**
 * P1-C provider profile quality — specialties, qualifications, completion.
 * Additive / backward-compatible. Never fabricates provider data.
 */

const { hasRealSchedule } = require('./availability');

/** Controlled specialty catalog (admin may override via settings.providerSpecialtyCatalog). */
const DEFAULT_SPECIALTY_CATALOG = [
  'General Ayurveda',
  'Panchakarma',
  'Weight management',
  'Non-communicable disorders',
  'Digestive health',
  'Skin & hair',
  'Women\'s health',
  'Joint & bone care',
  'Mental wellness',
  'Pediatric Ayurveda',
  'Pulse diagnosis',
  'Herbal medicine',
  'Yoga therapy',
  'Vedic astrology',
  'Other',
];

const DEFAULT_LANGUAGES = ['Sinhala', 'Tamil', 'English'];

const REQUIRED_COMPLETION_FIELDS = [
  { key: 'name', label: 'Provider name', action: 'Add display name' },
  { key: 'title', label: 'Professional title / type', action: 'Add professional title' },
  { key: 'specialty', label: 'Specialty', action: 'Add specialty' },
  { key: 'bio', label: 'Professional bio', action: 'Add professional bio' },
  { key: 'consultationTypes', label: 'Consultation type', action: 'Set consultation type' },
  { key: 'schedule', label: 'Schedule', action: 'Set schedule' },
  { key: 'location', label: 'District / city', action: 'Add city or district' },
];

const RECOMMENDED_COMPLETION_FIELDS = [
  { key: 'photo', label: 'Profile photo', action: 'Add profile photo' },
  { key: 'qualifications', label: 'Qualifications', action: 'Add qualification' },
  { key: 'registrationNumber', label: 'Registration number', action: 'Add registration number' },
  { key: 'languages', label: 'Languages', action: 'Add languages' },
];

function cleanText(value) {
  if (value == null) return '';
  return String(value).trim().replace(/\s+/g, ' ');
}

/** Heuristic for suspicious/junk specialty labels — report only; never auto-delete. */
function looksLikeSuspiciousSpecialty(value) {
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

function parseSpecialtyList(raw) {
  let list = [];
  if (Array.isArray(raw)) list = raw.map(String);
  else if (typeof raw === 'string' && raw.trim()) {
    list = raw.split(/[,|/]/).map((x) => x.trim());
  }
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

/** Public specialties — omit suspicious junk so it is not promoted as trusted data. */
function publicSpecialtiesFromProfile(profileDetails = {}) {
  return parseSpecialtyList(profileDetails?.specialty).filter((s) => !looksLikeSuspiciousSpecialty(s));
}

function normalizeLanguages(raw) {
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

/**
 * Normalize qualifications to [{ qualificationName, institution?, country?, year? }].
 * Accepts legacy string arrays / free-text.
 */
function normalizeQualifications(raw) {
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
      const qualificationName = cleanText(
        item.qualificationName || item.name || item.title || ''
      );
      if (!qualificationName) continue;
      const entry = { qualificationName };
      const institution = cleanText(item.institution || item.school || '');
      const country = cleanText(item.country || '');
      const yearRaw = item.year;
      if (institution) entry.institution = institution;
      if (country) entry.country = country;
      if (yearRaw != null && String(yearRaw).trim() !== '') {
        const y = Number(yearRaw);
        if (Number.isFinite(y) && y >= 1900 && y <= 2100) entry.year = y;
        else {
          const ys = cleanText(yearRaw);
          if (ys) entry.year = ys;
        }
      }
      out.push(entry);
    }
  }
  return out;
}

function hasExplicitConsultationChoice(pd = {}) {
  if (pd.offersInPerson === true || pd.offersInPerson === false) return true;
  if (pd.offersVideo === true || pd.offersAudio === true) return true;
  if (pd.videoConsultation === true) return true;
  if (Array.isArray(pd.consultationModes) && pd.consultationModes.length) return true;
  return false;
}

function hasStructuredLocation(pd = {}) {
  return Boolean(cleanText(pd.city) || cleanText(pd.district));
}

function fieldPresence(user = {}) {
  const pd = user.profileDetails || {};
  const name = cleanText(user.name || user.displayName);
  const title = cleanText(pd.title || pd.doctorType);
  const specs = parseSpecialtyList(pd.specialty).filter((s) => !looksLikeSuspiciousSpecialty(s));
  const bio = cleanText(pd.bio);
  const photo = cleanText(pd.profileImageUrl);
  const quals = normalizeQualifications(pd.qualifications);
  const reg = cleanText(pd.registrationNumber);
  const langs = normalizeLanguages(pd.languages);
  return {
    name: Boolean(name),
    title: Boolean(title),
    specialty: specs.length > 0,
    bio: Boolean(bio) && bio.length >= 20,
    consultationTypes: hasExplicitConsultationChoice(pd),
    schedule: hasRealSchedule(pd.schedule),
    location: hasStructuredLocation(pd),
    photo: Boolean(photo),
    qualifications: quals.length > 0,
    registrationNumber: Boolean(reg),
    languages: langs.length > 0,
  };
}

/**
 * Profile completion — required fields drive percent; recommended listed separately.
 * Does not fake completion.
 */
function computeProfileCompletion(user = {}) {
  const presence = fieldPresence(user);
  const missingRequired = REQUIRED_COMPLETION_FIELDS.filter((f) => !presence[f.key]).map((f) => ({
    key: f.key,
    label: f.label,
    action: f.action,
    required: true,
  }));
  const missingRecommended = RECOMMENDED_COMPLETION_FIELDS.filter((f) => !presence[f.key]).map((f) => ({
    key: f.key,
    label: f.label,
    action: f.action,
    required: false,
  }));
  const requiredTotal = REQUIRED_COMPLETION_FIELDS.length;
  const requiredDone = requiredTotal - missingRequired.length;
  const percent = Math.round((requiredDone / requiredTotal) * 100);
  const suspiciousSpecialties = parseSpecialtyList(user.profileDetails?.specialty).filter(
    looksLikeSuspiciousSpecialty
  );
  return {
    percent,
    requiredDone,
    requiredTotal,
    missingRequired,
    missingRecommended,
    suspiciousSpecialties,
    presence,
  };
}

function resolveSpecialtyCatalog(settings = {}) {
  const fromSettings = settings.providerSpecialtyCatalog;
  if (Array.isArray(fromSettings) && fromSettings.length) {
    return fromSettings.map(cleanText).filter(Boolean);
  }
  return [...DEFAULT_SPECIALTY_CATALOG];
}

module.exports = {
  DEFAULT_SPECIALTY_CATALOG,
  DEFAULT_LANGUAGES,
  REQUIRED_COMPLETION_FIELDS,
  RECOMMENDED_COMPLETION_FIELDS,
  cleanText,
  looksLikeSuspiciousSpecialty,
  parseSpecialtyList,
  publicSpecialtiesFromProfile,
  normalizeLanguages,
  normalizeQualifications,
  computeProfileCompletion,
  resolveSpecialtyCatalog,
  hasExplicitConsultationChoice,
  hasStructuredLocation,
};
