/**
 * LIVE Firebase Firestore + Storage emulator security tests (P0-A).
 *
 * Run:
 *   cd /workspace && npx --prefix backend firebase emulators:exec \
 *     --only firestore,storage \
 *     --project deergayu-rules-test \
 *     "node backend/tests/firestore.rules.emulator.test.js"
 *
 * Requires: Java, @firebase/rules-unit-testing, firebase-tools (devDeps).
 */
const fs = require('fs');
const path = require('path');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const {
  isProviderRole,
  isApprovedProviderStatus,
} = require('../security');

const PROJECT_ID = 'deergayu-rules-test';
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const STORAGE_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199';

const results = [];
function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function expectDenied(name, promise) {
  try {
    await assertFails(promise);
    record(name, true);
  } catch (e) {
    record(name, false, e.message || String(e));
  }
}

async function expectAllowed(name, promise) {
  try {
    await assertSucceeds(promise);
    record(name, true);
  } catch (e) {
    record(name, false, e.message || String(e));
  }
}

function tinyJpeg() {
  // Minimal valid-ish JPEG bytes for Storage content-type checks
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
  ]);
}

/** Mirror Express requireApprovedProvider gate (commerce APIs). */
function canAccessApprovedProviderCommerce({ role, status, isAdmin }) {
  if (isAdmin) return true;
  return isProviderRole(role) && isApprovedProviderStatus(status);
}

async function main() {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.error('FAIL: FIRESTORE_EMULATOR_HOST not set. Run via firebase emulators:exec');
    process.exit(1);
  }

  const [fsHost, fsPort] = FIRESTORE_HOST.split(':');
  const [stHost, stPort] = STORAGE_HOST.split(':');

  const firestoreRules = fs.readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8');
  const storageRules = fs.readFileSync(path.join(__dirname, '../../storage.rules'), 'utf8');

  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: firestoreRules,
      host: fsHost,
      port: Number(fsPort),
    },
    storage: {
      rules: storageRules,
      host: stHost,
      port: Number(stPort),
    },
  });

  await testEnv.clearFirestore();
  await testEnv.clearStorage();

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc('users/patient1').set({
      role: 'user',
      status: 'approved',
      name: 'Patient',
      email: 'patient@test.com',
    });
    await db.doc('users/pending1').set({
      role: 'doctor',
      status: 'pending',
      name: 'Pending Doc',
      email: 'pending@test.com',
    });
    await db.doc('users/approved1').set({
      role: 'vendor',
      status: 'approved',
      name: 'Approved Vendor',
      email: 'vendor@test.com',
      profileDetails: { schedule: { slotDuration: 30 } },
    });
    await db.doc('users/admin1').set({
      role: 'admin',
      status: 'approved',
      name: 'Admin',
      email: 'admin@test.com',
    });
    await db.doc('settings/admin').set({
      adminEmails: ['admin@test.com'],
      commissionPercent: 10,
      bankDetails: { accountNo: 'SECRET-ACCOUNT' },
    });
    await db.doc('products/p1').set({
      status: 'approved',
      vendorId: 'approved1',
      name: 'Oil',
      price: 100,
    });
    await db.doc('products/pending-prod').set({
      status: 'pending',
      vendorId: 'approved1',
      name: 'Pending Oil',
      price: 50,
    });
    await db.doc('orders/o1').set({
      customerId: 'patient1',
      vendorId: 'approved1',
      status: 'pending',
      totalPrice: 100,
    });
    await db.doc('appointments/a1').set({
      customerId: 'patient1',
      providerId: 'approved1',
      status: 'pending',
      date: '2026-08-01',
      time: '10:00',
    });
    // P0-B2 finance seed (Admin SDK / rules-disabled)
    await db.doc('providerCommercialTerms/approved1').set({
      providerId: 'approved1',
      currency: 'LKR',
      types: {
        in_person: {
          consultationType: 'in_person',
          consultationPrice: 1000,
          providerPayout: 600,
          platformGross: 400,
          facilityFee: 0,
          active: true,
          version: 1,
        },
      },
    });
    await db.doc('providerCommercialTerms/otherProvider').set({
      providerId: 'otherProvider',
      types: {
        in_person: {
          consultationPrice: 1500,
          providerPayout: 1000,
          platformGross: 500,
          active: true,
          version: 1,
        },
      },
    });
    await db.doc('payments/pay1').set({
      userId: 'patient1',
      providerUserId: 'approved1',
      status: 'PAID',
      providerPayout: 600,
      platformGrossRevenue: 400,
      grossAmount: 1000,
    });
    await db.doc('payments/payOther').set({
      userId: 'someoneElse',
      providerUserId: 'otherProvider',
      status: 'PAID',
      providerPayout: 1000,
      platformGrossRevenue: 500,
      grossAmount: 1500,
    });
    await db.doc('settlements/set1').set({
      providerId: 'approved1',
      amount: 600,
      status: 'OPEN',
    });
    await db.doc('settlements/setOther').set({
      providerId: 'otherProvider',
      amount: 1000,
      status: 'OPEN',
    });
    await db.doc('slotLocks/lock1').set({
      providerId: 'approved1',
      status: 'HOLDING',
      date: '2026-08-01',
      time: '10:00',
    });
    await db.doc('counters/appointment-2026').set({ seq: 1, kind: 'appointment', year: 2026 });
    await db.doc('settlementReconciliations/rec1').set({
      providerId: 'approved1',
      amount: 100,
      status: 'OPEN',
    });
  });

  console.log('\n=== P0-A LIVE EMULATOR RULES TESTS ===\n');
  console.log(`Firestore emulator: ${FIRESTORE_HOST}`);
  console.log(`Storage emulator: ${STORAGE_HOST}\n`);

  // ─── 1. UNAUTHENTICATED ───────────────────────────────────────────
  {
    const db = testEnv.unauthenticatedContext().firestore();
    const storage = testEnv.unauthenticatedContext().storage();
    await expectDenied('unauth: cannot read private settings', db.doc('settings/admin').get());
    await expectDenied('unauth: cannot update user', db.doc('users/patient1').update({ name: 'x' }));
    await expectDenied('unauth: cannot create product', db.collection('products').add({ name: 'X' }));
    await expectAllowed('unauth: can read approved product', db.doc('products/p1').get());
    await expectDenied('unauth: cannot write own-scoped upload', storage.ref('uploads/patient1/a.jpg').put(tinyJpeg(), { contentType: 'image/jpeg' }));
    await expectDenied('unauth: cannot read medical path', storage.ref('medical/patient1/record.pdf').getDownloadURL());
  }

  // ─── 2. NORMAL PATIENT ────────────────────────────────────────────
  {
    const ctx = testEnv.authenticatedContext('patient1', { email: 'patient@test.com' });
    const db = ctx.firestore();
    const storage = ctx.storage();

    await expectDenied('patient: cannot change role to admin', db.doc('users/patient1').update({ role: 'admin' }));
    await expectDenied('patient: cannot change status', db.doc('users/patient1').update({ status: 'suspended' }));
    await expectDenied('patient: cannot create product', db.collection('products').add({
      name: 'Hack',
      status: 'approved',
      vendorId: 'patient1',
    }));
    await expectDenied('patient: cannot edit another user', db.doc('users/approved1').update({ name: 'Hacked' }));
    await expectDenied('patient: cannot read private settings', db.doc('settings/admin').get());
    await expectAllowed('patient: legitimate own profile update', db.doc('users/patient1').update({
      name: 'Patient Updated',
      profileDetails: { telephone: '0711234567', address: 'Colombo' },
    }));
    await expectAllowed('patient: can read own appointment', db.doc('appointments/a1').get());
    await expectDenied('patient: cannot write appointment', db.doc('appointments/a1').update({ status: 'confirmed' }));

    await expectAllowed(
      'patient: UID-scoped upload allowed',
      storage.ref('uploads/patient1/photo.jpg').put(tinyJpeg(), { contentType: 'image/jpeg' })
    );
    await expectDenied(
      'patient: cannot upload under another UID path',
      storage.ref('uploads/approved1/steal.jpg').put(tinyJpeg(), { contentType: 'image/jpeg' })
    );
    await expectDenied(
      'patient: /medical/** write inaccessible',
      storage.ref('medical/patient1/lab.pdf').put(tinyJpeg(), { contentType: 'image/jpeg' })
    );
    await expectDenied(
      'patient: /medical/** read inaccessible',
      storage.ref('medical/patient1/lab.pdf').getDownloadURL()
    );
  }

  // ─── 3. PENDING PROVIDER ──────────────────────────────────────────
  {
    const ctx = testEnv.authenticatedContext('pending1', { email: 'pending@test.com' });
    const db = ctx.firestore();

    await expectDenied('pending provider: cannot self-approve status', db.doc('users/pending1').update({ status: 'approved' }));
    await expectDenied('pending provider: cannot set role admin', db.doc('users/pending1').update({ role: 'admin' }));
    await expectDenied('pending provider: cannot create product via client', db.collection('products').add({
      name: 'Early',
      status: 'pending',
      vendorId: 'pending1',
    }));
    await expectAllowed('pending provider: can update safe profile fields', db.doc('users/pending1').update({
      name: 'Pending Doc Updated',
      profileDetails: { telephone: '077', bio: 'awaiting approval' },
    }));
    await expectDenied('pending provider: cannot read private settings', db.doc('settings/admin').get());

    // Commerce API gate (Express requireApprovedProvider) — same predicates
    const commerceOk = canAccessApprovedProviderCommerce({
      role: 'doctor',
      status: 'pending',
      isAdmin: false,
    });
    record(
      'pending provider: cannot access approved-provider commerce APIs',
      commerceOk === false,
      commerceOk ? 'gate incorrectly allowed' : 'requireApprovedProvider would return 403'
    );
  }

  // ─── 4. APPROVED PROVIDER ─────────────────────────────────────────
  {
    const ctx = testEnv.authenticatedContext('approved1', { email: 'vendor@test.com' });
    const db = ctx.firestore();
    const storage = ctx.storage();

    // Client product create still denied — legitimate create is Admin SDK / Express API
    await expectDenied('approved provider: client product create denied (API-only)', db.collection('products').add({
      name: 'New',
      status: 'approved',
      vendorId: 'approved1',
    }));
    await expectDenied('approved provider: client product update denied (API-only)', db.doc('products/p1').update({ price: 1 }));
    await expectAllowed('approved provider: can read own product', db.doc('products/p1').get());
    await expectAllowed('approved provider: can read own pending product', db.doc('products/pending-prod').get());
    await expectAllowed('approved provider: can update schedule in profileDetails', db.doc('users/approved1').update({
      profileDetails: { schedule: { slotDuration: 15, workingDays: {} }, telephone: '070' },
    }));
    await expectDenied('approved provider: cannot self-change status', db.doc('users/approved1').update({ status: 'suspended' }));
    await expectDenied('approved provider: cannot read settings', db.doc('settings/admin').get());
    await expectAllowed('approved provider: can read own order', db.doc('orders/o1').get());
    await expectAllowed('approved provider: can read own appointment', db.doc('appointments/a1').get());

    const commerceOk = canAccessApprovedProviderCommerce({
      role: 'vendor',
      status: 'approved',
      isAdmin: false,
    });
    record(
      'approved provider: can perform legitimate product/schedule commerce ops (API gate)',
      commerceOk === true,
      commerceOk ? 'requireApprovedProvider allows' : 'gate incorrectly denied'
    );

    await expectAllowed(
      'approved provider: UID-scoped upload allowed',
      storage.ref('uploads/approved1/prod.jpg').put(tinyJpeg(), { contentType: 'image/jpeg' })
    );
    await expectDenied(
      'approved provider: /medical/** inaccessible',
      storage.ref('medical/approved1/x.jpg').put(tinyJpeg(), { contentType: 'image/jpeg' })
    );
  }

  // ─── 5. ADMIN ─────────────────────────────────────────────────────
  {
    const ctx = testEnv.authenticatedContext('admin1', { email: 'admin@test.com' });
    const db = ctx.firestore();
    const storage = ctx.storage();

    await expectAllowed('admin: can read any user', db.doc('users/patient1').get());
    await expectAllowed('admin: can read pending provider', db.doc('users/pending1').get());
    await expectAllowed('admin: can read pending product', db.doc('products/pending-prod').get());
    await expectAllowed('admin: can read orders', db.doc('orders/o1').get());
    await expectAllowed('admin: can read appointments', db.doc('appointments/a1').get());
    // Settings remain API-only even for admin client SDK (Admin SDK bypasses rules)
    await expectDenied('admin client SDK: settings still denied (Admin SDK/API only)', db.doc('settings/admin').get());
    // Admin cannot escalate via client update on another user (update only owner OR would need admin write — currently only owner update)
    await expectDenied('admin client: cannot update other user via rules (API/Admin SDK)', db.doc('users/patient1').update({ role: 'admin' }));

    const commerceOk = canAccessApprovedProviderCommerce({
      role: 'admin',
      status: 'approved',
      isAdmin: true,
    });
    record('admin: commerce APIs allowed via isAdmin', commerceOk === true);

    await expectAllowed(
      'admin: can upload to another user profile path',
      storage.ref('profiles/approved1/avatar.jpg').put(tinyJpeg(), { contentType: 'image/jpeg' })
    );
    await expectDenied(
      'admin: /medical/** still inaccessible to clients',
      storage.ref('medical/patient1/note.jpg').put(tinyJpeg(), { contentType: 'image/jpeg' })
    );
  }

  // ─── 6. P1-B FACILITIES / AFFILIATIONS / PROVIDER SLUGS ───────────
  console.log('\n=== P1-B FACILITY & SLUG RULES ===\n');
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc('facilities/activeClinic1').set({
      name: 'Active Clinic',
      type: 'clinic',
      status: 'active',
      slug: 'active-clinic',
    });
    await db.doc('facilities/draftClinic1').set({
      name: 'Draft Clinic',
      type: 'clinic',
      status: 'draft',
      slug: 'draft-clinic',
    });
    await db.doc('facilityAffiliations/aff1').set({
      facilityId: 'activeClinic1',
      providerId: 'approved1',
      status: 'active',
      consultationTypes: ['in_person'],
    });
    await db.doc('providerSlugs/dr-approved').set({
      providerId: 'approved1',
      slug: 'dr-approved',
    });
  });

  {
    const db = testEnv.unauthenticatedContext().firestore();
    await expectAllowed('unauth: can read active facility', db.doc('facilities/activeClinic1').get());
    await expectDenied('unauth: cannot read draft facility', db.doc('facilities/draftClinic1').get());
    await expectDenied('unauth: cannot create facility', db.doc('facilities/hack').set({
      name: 'Hack', type: 'clinic', status: 'active',
    }));
    await expectDenied('unauth: cannot update facility', db.doc('facilities/activeClinic1').update({ name: 'X' }));
    await expectDenied('unauth: cannot delete facility', db.doc('facilities/activeClinic1').delete());
    await expectAllowed('unauth: can read active affiliation', db.doc('facilityAffiliations/aff1').get());
    await expectDenied('unauth: cannot create affiliation', db.doc('facilityAffiliations/hack').set({
      facilityId: 'activeClinic1', providerId: 'patient1', status: 'active',
    }));
    await expectDenied('unauth: cannot update affiliation', db.doc('facilityAffiliations/aff1').update({ status: 'inactive' }));
    await expectDenied('unauth: cannot delete affiliation', db.doc('facilityAffiliations/aff1').delete());
    await expectAllowed('unauth: can read providerSlugs', db.doc('providerSlugs/dr-approved').get());
    await expectDenied('unauth: cannot write providerSlugs', db.doc('providerSlugs/hack').set({
      providerId: 'patient1', slug: 'hack',
    }));
  }
  {
    const db = testEnv.authenticatedContext('patient1', { email: 'patient@test.com' }).firestore();
    await expectAllowed('patient: can read active facility', db.doc('facilities/activeClinic1').get());
    await expectDenied('patient: cannot read draft facility', db.doc('facilities/draftClinic1').get());
    await expectDenied('patient: cannot create facility', db.doc('facilities/p-hack').set({
      name: 'P', type: 'hospital', status: 'active',
    }));
    await expectDenied('patient: cannot update facility', db.doc('facilities/activeClinic1').update({ status: 'inactive' }));
    await expectDenied('patient: cannot create affiliation', db.doc('facilityAffiliations/p-aff').set({
      facilityId: 'activeClinic1', providerId: 'patient1', status: 'active',
    }));
    await expectDenied('patient: cannot write providerSlugs', db.doc('providerSlugs/dr-patient').set({
      providerId: 'patient1', slug: 'dr-patient',
    }));
    await expectDenied('patient: cannot set publicSlug on self', db.doc('users/patient1').update({ publicSlug: 'hacked' }));
  }
  {
    const db = testEnv.authenticatedContext('approved1', { email: 'vendor@test.com' }).firestore();
    await expectDenied('provider: cannot create facility', db.doc('facilities/prov-clinic').set({
      name: 'Mine', type: 'clinic', status: 'active',
    }));
    await expectDenied('provider: cannot mutate facility', db.doc('facilities/activeClinic1').update({ name: 'Taken' }));
    await expectDenied('provider: cannot self-affiliate via Firestore', db.doc('facilityAffiliations/self').set({
      facilityId: 'activeClinic1', providerId: 'approved1', status: 'active',
    }));
    await expectDenied('provider: cannot change own publicSlug', db.doc('users/approved1').update({ publicSlug: 'new-slug' }));
    await expectDenied('provider: cannot write providerSlugs', db.doc('providerSlugs/dr-new').set({
      providerId: 'approved1', slug: 'dr-new',
    }));
    await expectAllowed('provider: can read own affiliation', db.doc('facilityAffiliations/aff1').get());
  }
  {
    const db = testEnv.authenticatedContext('admin1', { email: 'admin@test.com' }).firestore();
    await expectAllowed('admin: can read draft facility', db.doc('facilities/draftClinic1').get());
    await expectAllowed('admin: can read active facility', db.doc('facilities/activeClinic1').get());
    // Privileged writes remain Admin SDK / Express — client SDK denied
    await expectDenied('admin client: cannot create facility (API/Admin SDK)', db.doc('facilities/admin-new').set({
      name: 'Admin New', type: 'clinic', status: 'draft',
    }));
    await expectDenied('admin client: cannot update facility (API/Admin SDK)', db.doc('facilities/activeClinic1').update({ status: 'inactive' }));
    await expectDenied('admin client: cannot write affiliations (API/Admin SDK)', db.doc('facilityAffiliations/aff1').update({ status: 'inactive' }));
    await expectDenied('admin client: cannot write providerSlugs (API/Admin SDK)', db.doc('providerSlugs/dr-admin').set({
      providerId: 'approved1', slug: 'dr-admin',
    }));
  }

  // ─── 7. P0-B2 FINANCE COLLECTIONS ─────────────────────────────────
  console.log('\n=== P0-B2 FINANCE RULES ===\n');
  {
    const unauth = testEnv.unauthenticatedContext().firestore();
    await expectDenied('unauth: cannot read commercial terms', unauth.doc('providerCommercialTerms/approved1').get());
    await expectDenied('unauth: cannot write payments', unauth.doc('payments/pay1').set({ status: 'PAID' }));
    await expectDenied('unauth: cannot write counters', unauth.doc('counters/appointment-2026').set({ seq: 99 }));
    await expectDenied('unauth: cannot write slotLocks', unauth.doc('slotLocks/lock1').set({ status: 'RELEASED' }));
  }
  {
    const db = testEnv.authenticatedContext('patient1', { email: 'patient@test.com' }).firestore();
    // Patients must not read internal commercial split via client SDK
    await expectDenied('patient: cannot read commercial terms (API public price only)', db.doc('providerCommercialTerms/approved1').get());
    await expectDenied('patient: cannot write commercial terms', db.doc('providerCommercialTerms/approved1').set({ hack: true }));
    await expectAllowed('patient: can read own payment', db.doc('payments/pay1').get());
    await expectDenied('patient: cannot read other payment', db.doc('payments/payOther').get());
    await expectDenied('patient: cannot write payments', db.doc('payments/pay1').update({ providerPayout: 1 }));
    await expectDenied('patient: cannot write settlements', db.doc('settlements/set1').set({ amount: 0 }));
    await expectDenied('patient: cannot write counters', db.doc('counters/appointment-2026').update({ seq: 999 }));
    await expectDenied('patient: cannot manipulate slot locks', db.doc('slotLocks/lock1').update({ status: 'RELEASED' }));
    await expectDenied('patient: cannot read slot locks', db.doc('slotLocks/lock1').get());
  }
  {
    const db = testEnv.authenticatedContext('pending1', { email: 'pending@test.com' }).firestore();
    await expectDenied('pending provider: cannot read another provider terms', db.doc('providerCommercialTerms/approved1').get());
    await expectDenied('pending provider: cannot write own terms', db.doc('providerCommercialTerms/pending1').set({
      types: { in_person: { consultationPrice: 1, providerPayout: 1, platformGross: 0 } },
    }));
  }
  {
    const db = testEnv.authenticatedContext('approved1', { email: 'vendor@test.com' }).firestore();
    await expectAllowed('approved provider: can read own commercial terms', db.doc('providerCommercialTerms/approved1').get());
    await expectDenied('approved provider: cannot read other provider terms', db.doc('providerCommercialTerms/otherProvider').get());
    await expectDenied('approved provider: cannot modify own commercial terms', db.doc('providerCommercialTerms/approved1').update({
      types: { in_person: { consultationPrice: 1, providerPayout: 1, platformGross: 0, active: true } },
    }));
    await expectAllowed('approved provider: can read own payment', db.doc('payments/pay1').get());
    await expectDenied('approved provider: cannot read other provider payment', db.doc('payments/payOther').get());
    await expectDenied('approved provider: cannot write payments', db.doc('payments/pay1').update({ status: 'REFUNDED' }));
    await expectAllowed('approved provider: can read own settlement', db.doc('settlements/set1').get());
    await expectDenied('approved provider: cannot read other settlement', db.doc('settlements/setOther').get());
    await expectDenied('approved provider: cannot write settlements', db.doc('settlements/set1').update({ status: 'COMPLETED' }));
    await expectDenied('approved provider: cannot write counters', db.doc('counters/appointment-2026').update({ seq: 1 }));
    await expectDenied('approved provider: cannot write slotLocks', db.doc('slotLocks/lock1').update({ status: 'CONSUMED' }));
  }
  {
    const db = testEnv.authenticatedContext('admin1', { email: 'admin@test.com' }).firestore();
    await expectAllowed('admin: can read commercial terms', db.doc('providerCommercialTerms/approved1').get());
    await expectAllowed('admin: can read payments', db.doc('payments/pay1').get());
    await expectAllowed('admin: can read settlements', db.doc('settlements/set1').get());
    await expectAllowed('admin: can read reconciliations', db.doc('settlementReconciliations/rec1').get());
    // Sensitive writes remain Admin SDK / Express authoritative
    await expectDenied('admin client: cannot write commercial terms (API/Admin SDK)', db.doc('providerCommercialTerms/approved1').update({ version: 99 }));
    await expectDenied('admin client: cannot write payments', db.doc('payments/pay1').update({ status: 'REFUNDED' }));
    await expectDenied('admin client: cannot write settlements', db.doc('settlements/set1').update({ status: 'COMPLETED' }));
    await expectDenied('admin client: cannot write counters', db.doc('counters/appointment-2026').update({ seq: 50 }));
    await expectDenied('admin client: cannot write slotLocks', db.doc('slotLocks/lock1').update({ status: 'RELEASED' }));
  }

  await testEnv.cleanup();

  const failed = results.filter((r) => !r.ok);
  console.log('\n=== SUMMARY ===');
  console.log(`Total: ${results.length}  PASS: ${results.length - failed.length}  FAIL: ${failed.length}`);
  if (failed.length) {
    console.log('\nFailed cases:');
    failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`));
    process.exit(1);
  }
  console.log('\nAll live emulator security tests PASSED.');
}

main().catch((e) => {
  console.error('EMULATOR TEST CRASH:', e);
  process.exit(1);
});
