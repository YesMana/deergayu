/**
 * Public-safe provider DTO for directory/profile — never payout/telephone/admin notes.
 */

const {
  hasRealSchedule,
  findNextAvailability,
  consultationTypesFromProfile,
  specialtiesFromProfile,
} = require('./availability');

const PUBLIC_PROFILE_KEYS = [
  'address',
  'province',
  'district',
  'city',
  'country',
  'profileImageUrl',
  'specialty',
  'experience',
  'doctorType',
  'bio',
  'astrologyServices',
  'languages',
  'title',
  'qualifications',
  'registrationNumber',
  'offersInPerson',
  'offersVideo',
  'offersAudio',
  'videoConsultation',
  'consultationModes',
  // schedule omitted from list DTO by default — availabilitySummary used instead
];

function pickPublicProfileDetails(pd = {}, { includeSchedule = false } = {}) {
  const src = pd && typeof pd === 'object' ? pd : {};
  const out = {};
  for (const key of PUBLIC_PROFILE_KEYS) {
    if (src[key] !== undefined) out[key] = src[key];
  }
  if (includeSchedule && src.schedule) {
    // Compact schedule presence only for profile detail if needed — prefer summary
    out.hasSchedule = hasRealSchedule(src.schedule);
  } else {
    out.hasSchedule = hasRealSchedule(src.schedule);
  }
  return out;
}

function locationSummary(pd = {}) {
  const parts = [pd.address, pd.city, pd.district, pd.province, pd.country]
    .map((x) => (x == null ? '' : String(x).trim()))
    .filter(Boolean);
  // Dedupe consecutive duplicates
  const deduped = [];
  for (const p of parts) {
    if (!deduped.length || deduped[deduped.length - 1].toLowerCase() !== p.toLowerCase()) {
      deduped.push(p);
    }
  }
  return deduped.join(', ');
}

function toPublicProvider(id, data = {}, opts = {}) {
  const pd = data.profileDetails || {};
  const slug = data.publicSlug || null;
  const dto = {
    id,
    publicSlug: slug,
    name: data.name || '',
    role: data.role,
    status: data.status || 'approved',
    profileDetails: pickPublicProfileDetails(pd, { includeSchedule: opts.includeSchedule }),
    rating: Number(data.rating) || 0,
    reviewCount: Number(data.reviewCount) || 0,
    consultationTypes: consultationTypesFromProfile(pd),
    specialties: specialtiesFromProfile(pd),
    locationSummary: locationSummary(pd) || null,
  };
  if (opts.availabilitySummary) {
    dto.availabilitySummary = opts.availabilitySummary;
  }
  if (opts.affiliations) {
    dto.affiliations = opts.affiliations;
  }
  return dto;
}

function buildAvailabilitySummary(schedule, bookedByDate, fromDate) {
  if (!hasRealSchedule(schedule)) return null;
  return findNextAvailability(schedule, bookedByDate, fromDate, 21);
}

module.exports = {
  PUBLIC_PROFILE_KEYS,
  pickPublicProfileDetails,
  locationSummary,
  toPublicProvider,
  buildAvailabilitySummary,
};
