/**
 * Unit tests for P0-A security helpers (no Firebase required).
 * Run: node backend/tests/security.unit.test.js
 */
const assert = require('assert');
const {
  PRIVILEGED_USER_FIELDS,
  sanitizeSelfProfileUpdate,
  normalizeRegistrableRole,
  registrationStatusForRole,
  pickPublicSettings,
  pickPublicCategories,
  pickVendorCategories,
  isProviderRole,
  isApprovedProviderStatus,
} = require('../security');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('P0-A security.unit.test.js');

test('rejects admin role on registration', () => {
  assert.strictEqual(normalizeRegistrableRole('admin'), null);
  assert.strictEqual(normalizeRegistrableRole('superadmin'), null);
});

test('normalizes astrologer → doctor', () => {
  assert.strictEqual(normalizeRegistrableRole('astrologer'), 'doctor');
});

test('registration status pending for providers', () => {
  assert.strictEqual(registrationStatusForRole('doctor'), 'pending');
  assert.strictEqual(registrationStatusForRole('user'), 'approved');
});

test('strips privileged fields from self profile update', () => {
  const { updates, attemptedPrivileged } = sanitizeSelfProfileUpdate(
    {
      name: 'Dilshan',
      role: 'admin',
      status: 'approved',
      isAdmin: true,
      profileDetails: {
        telephone: '077',
        role: 'admin',
        status: 'approved',
        address: 'Colombo',
      },
    },
    { bio: 'old' }
  );
  assert.ok(attemptedPrivileged.includes('role'));
  assert.ok(attemptedPrivileged.includes('status'));
  assert.strictEqual(updates.name, 'Dilshan');
  assert.strictEqual(updates.profileDetails.telephone, '077');
  assert.strictEqual(updates.profileDetails.address, 'Colombo');
  assert.strictEqual(updates.profileDetails.bio, 'old');
  assert.strictEqual(updates.profileDetails.role, undefined);
  assert.strictEqual(updates.role, undefined);
});

test('public settings never include adminEmails or commissions', () => {
  const pub = pickPublicSettings({
    adminEmails: ['a@b.com'],
    commissionPercent: 99,
    bankDetails: { bank: 'PB', accountNo: '1' },
    socialLinks: { facebook: 'https://fb.com/x' },
    payhereEnabled: true,
    contactEmail: 'info@deergayu.com',
    shippingZones: [{ id: 'island', fee: 500 }],
    appointmentPaymentsEnabled: false,
    gatewayFeeAmount: 99,
    providerPayoutHoldHours: 24,
  }, { payhereConfigured: true });
  assert.strictEqual(pub.adminEmails, undefined);
  assert.strictEqual(pub.commissionPercent, undefined);
  assert.strictEqual(pub.bankDetails.bank, 'PB');
  assert.strictEqual(pub.payhereEnabled, true);
  assert.strictEqual(pub.appointmentPaymentsEnabled, false);
  assert.strictEqual(pub.gatewayFeeAmount, undefined);
  assert.strictEqual(pub.providerPayoutHoldHours, undefined);
  assert.ok(!('categories' in pub));
});

test('public categories omit commission percentages', () => {
  const pub = pickPublicCategories({
    categories: [{ id: 'medicine', name: 'Medicine', commissionPercent: 10 }],
  });
  assert.strictEqual(pub.categories[0].name, 'Medicine');
  assert.strictEqual(pub.categories[0].commissionPercent, undefined);
});

test('vendor categories include commission', () => {
  const v = pickVendorCategories({
    categories: [{ id: 'medicine', name: 'Medicine', commissionPercent: 12 }],
    commissionPercent: 10,
    minCommissionRs: 300,
  });
  assert.strictEqual(v.categories[0].commissionPercent, 12);
});

test('provider role / approval helpers', () => {
  assert.ok(isProviderRole('doctor'));
  assert.ok(!isProviderRole('user'));
  assert.ok(isApprovedProviderStatus('approved'));
  assert.ok(!isApprovedProviderStatus('pending'));
  assert.ok(PRIVILEGED_USER_FIELDS.includes('role'));
});

console.log('All security unit tests passed.');
