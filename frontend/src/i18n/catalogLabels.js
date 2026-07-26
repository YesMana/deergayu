/**
 * Localized display labels for controlled catalogs / enums.
 * Backend identifiers stay English; only presentation is translated.
 * Never write these labels back to the database.
 */

/** Slugify specialty for translation key lookup. */
export function specialtyKey(name = '') {
  return `specialty_${String(name)
    .trim()
    .replace(/&/g, '')
    .replace(/'/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')}`;
}

/**
 * @param {string} specialtyCanonical - stored English specialty string
 * @param {(key: string) => string} t
 */
export function localizeSpecialty(specialtyCanonical, t) {
  if (!specialtyCanonical) return '';
  const key = specialtyKey(specialtyCanonical);
  const translated = t(key);
  // If missing translation, t() returns key or English — avoid showing raw key
  if (translated && translated !== key) return translated;
  const direct = t(specialtyCanonical);
  if (direct && direct !== specialtyCanonical) return direct;
  if (direct && direct !== key) return direct;
  return translated;
}

const CONSULT_KEYS = {
  in_person: 'consult_in_person',
  video: 'consult_video',
  audio: 'consult_audio',
};

/**
 * @param {string} type - in_person | video | audio
 * @param {(key: string) => string} t
 */
export function localizeConsultationType(type, t) {
  const key = CONSULT_KEYS[type];
  if (!key) return type;
  return t(key);
}

const FACILITY_KEYS = {
  clinic: 'facility_clinic',
  hospital: 'facility_hospital',
  ayurveda_centre: 'facility_ayurveda_centre',
  wellness_centre: 'facility_wellness_centre',
};

export function localizeFacilityType(type, t) {
  const key = FACILITY_KEYS[type];
  if (!key) return type;
  return t(key);
}

const STATUS_KEYS = {
  approved: 'status_approved',
  pending: 'status_pending',
  rejected: 'status_rejected',
  hidden: 'status_hidden',
  active: 'status_active',
  inactive: 'status_inactive',
  draft: 'status_draft',
};

export function localizeStatus(status, t) {
  const key = STATUS_KEYS[String(status || '').toLowerCase()];
  if (!key) return status;
  return t(key);
}
