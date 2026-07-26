/**
 * P0-A security helpers — privilege fields, public settings, profile sanitization.
 * Used by Express middleware and unit tests. Does not talk to Firebase itself.
 */

const PROVIDER_ROLES = ['vendor', 'doctor', 'clinic', 'organization'];
const REGISTRABLE_ROLES = ['user', 'doctor', 'clinic', 'organization', 'vendor'];

/** Fields clients must never set/change on users/{uid}. */
const PRIVILEGED_USER_FIELDS = [
  'role',
  'status',
  'isAdmin',
  'admin',
  'approvalStatus',
  'verificationStatus',
  'commission',
  'commissionPercent',
  'permissions',
  'createdBy',
  'approvedBy',
  'rejectedBy',
  'adminEmails',
  // P1-B: server-managed SEO slug — clients must never set
  'publicSlug',
  'slugHistory',
];

/** Top-level user fields a user may update about themselves. */
const SAFE_USER_TOP_LEVEL_FIELDS = ['name', 'displayName', 'language', 'preferredLanguage'];

/** Nested profileDetails keys a user may update. */
const SAFE_PROFILE_DETAIL_FIELDS = [
  'telephone',
  'phone',
  'address',
  // P1-B additive structured location (keep free-text address)
  'country',
  'province',
  'district',
  'city',
  'profileImageUrl',
  'specialty',
  'experience',
  'doctorType',
  'bio',
  'astrologyServices',
  'schedule',
  'languages',
  'title',
  'qualifications',
  'registrationNumber',
  'offersInPerson',
  'offersVideo',
  'offersAudio',
  'videoConsultation',
  'consultationModes',
];

/** Settings safe for anonymous / storefront clients. */
const PUBLIC_SETTINGS_KEYS = [
  'shippingZones',
  'bankDetails', // checkout bank transfer — minimum payment instructions only
  'payhereEnabled',
  'contactEmail',
  'socialLinks',
  'appointmentPaymentsEnabled',
];

/** Settings that must never leave admin APIs. */
const PRIVATE_SETTINGS_KEYS = [
  'adminEmails',
  'commissionPercent',
  'bookingCommissionPercent',
  'minCommissionRs',
  'categories',
  'autoApproveExperts',
  'autoApproveProducts',
  'homeStatsFloor',
  'providerPayoutHoldHours',
  'settlementCadence',
  'gatewayFeeAmount',
  'absorbGatewayFees',
];

function isProviderRole(role) {
  return PROVIDER_ROLES.includes(String(role || ''));
}

function isApprovedProviderStatus(status) {
  return String(status || '') === 'approved';
}

function pickPublicSettings(settings = {}, { payhereConfigured = false } = {}) {
  return {
    shippingZones: settings.shippingZones || [],
    bankDetails: {
      bank: String(settings.bankDetails?.bank || ''),
      branch: String(settings.bankDetails?.branch || ''),
      accountName: String(settings.bankDetails?.accountName || ''),
      accountNo: String(settings.bankDetails?.accountNo || ''),
    },
    payhereEnabled: Boolean(settings.payhereEnabled && payhereConfigured),
    contactEmail: String(settings.contactEmail || ''),
    socialLinks: settings.socialLinks || {},
    // Safe flag only — never expose payout hold / gateway fee internals
    appointmentPaymentsEnabled: Boolean(settings.appointmentPaymentsEnabled),
  };
}

function pickVendorCategories(settings = {}) {
  return {
    categories: (settings.categories || []).map((c) => ({
      id: c.id,
      name: c.name,
      commissionPercent: Number(c.commissionPercent) || 10,
    })),
    defaultCommissionPercent: Number(settings.commissionPercent) || 10,
    minCommissionRs: Number(settings.minCommissionRs) || 300,
  };
}

function pickPublicCategories(settings = {}) {
  return {
    categories: (settings.categories || []).map((c) => ({
      id: c.id,
      name: c.name,
    })),
  };
}

/**
 * Build a safe profile update payload from client body.
 * Strips all privileged top-level fields; only merges approved profileDetails keys.
 */
function sanitizeSelfProfileUpdate(body = {}, existingProfileDetails = {}) {
  const updates = {};
  for (const key of SAFE_USER_TOP_LEVEL_FIELDS) {
    if (body[key] !== undefined) {
      updates[key] = typeof body[key] === 'string' ? body[key].trim() : body[key];
    }
  }

  const incoming = body.profileDetails;
  if (incoming && typeof incoming === 'object') {
    const next = { ...(existingProfileDetails || {}) };
    for (const key of SAFE_PROFILE_DETAIL_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(incoming, key)) {
        next[key] = incoming[key];
      }
    }
    // Never allow privilege-like keys inside profileDetails
    for (const bad of PRIVILEGED_USER_FIELDS) {
      delete next[bad];
    }
    updates.profileDetails = next;
  }

  // Reject if client tried to smuggle privileged fields at top level
  const attempted = PRIVILEGED_USER_FIELDS.filter((f) =>
    Object.prototype.hasOwnProperty.call(body, f)
  );
  return { updates, attemptedPrivileged: attempted };
}

function normalizeRegistrableRole(role) {
  const r = String(role || 'user').toLowerCase();
  if (r === 'astrologer') return 'doctor';
  if (!REGISTRABLE_ROLES.includes(r)) return null;
  if (r === 'admin') return null;
  return r;
}

function registrationStatusForRole(role) {
  return role === 'user' ? 'approved' : 'pending';
}

module.exports = {
  PROVIDER_ROLES,
  REGISTRABLE_ROLES,
  PRIVILEGED_USER_FIELDS,
  SAFE_USER_TOP_LEVEL_FIELDS,
  SAFE_PROFILE_DETAIL_FIELDS,
  PUBLIC_SETTINGS_KEYS,
  PRIVATE_SETTINGS_KEYS,
  isProviderRole,
  isApprovedProviderStatus,
  pickPublicSettings,
  pickVendorCategories,
  pickPublicCategories,
  sanitizeSelfProfileUpdate,
  normalizeRegistrableRole,
  registrationStatusForRole,
};
