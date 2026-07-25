/**
 * Emulator-based Firestore rules tests (optional — requires Firebase emulator).
 * Skips cleanly when FIRESTORE_EMULATOR_HOST is unset.
 *
 * Expected outcomes (manual / emulator):
 * A. unauthenticated — deny privileged reads/writes
 * B. patient — deny role escalate, deny product create, allow own profile safe update
 * C. pending provider — deny product create
 * D. approved provider — product create still denied (API/Admin SDK only)
 * E. admin — allow admin reads of users/orders
 */
const fs = require('fs');
const path = require('path');

async function main() {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.log('SKIP: FIRESTORE_EMULATOR_HOST not set — static rules tests cover CI.');
    console.log('To run live: firebase emulators:exec --only firestore "node backend/tests/firestore.rules.emulator.test.js"');
    process.exit(0);
  }

  let rulesTesting;
  try {
    rulesTesting = require('@firebase/rules-unit-testing');
  } catch {
    console.log('SKIP: @firebase/rules-unit-testing not installed');
    process.exit(0);
  }

  const projectId = 'deergayu-rules-test';
  const rules = fs.readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8');
  const testEnv = await rulesTesting.initializeTestEnvironment({
    projectId,
    firestore: { rules, host: '127.0.0.1', port: 8080 },
  });

  const assertDenied = rulesTesting.assertFails;
  const assertAllowed = rulesTesting.assertSucceeds;

  await testEnv.clearFirestore();
  // Seed via admin context
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc('users/patient1').set({ role: 'user', status: 'approved', name: 'Patient', email: 'p@test.com' });
    await db.doc('users/pending1').set({ role: 'doctor', status: 'pending', name: 'Doc', email: 'd@test.com' });
    await db.doc('users/approved1').set({ role: 'vendor', status: 'approved', name: 'Ven', email: 'v@test.com' });
    await db.doc('users/admin1').set({ role: 'admin', status: 'approved', name: 'Admin', email: 'a@test.com' });
    await db.doc('settings/admin').set({ adminEmails: ['a@test.com'], commissionPercent: 10, bankDetails: { accountNo: 'SECRET' } });
    await db.doc('products/p1').set({ status: 'approved', vendorId: 'approved1', name: 'Oil', price: 100 });
  });

  console.log('Emulator rules tests');

  // 1. change own role to admin → DENIED
  {
    const db = testEnv.authenticatedContext('patient1', { email: 'p@test.com' }).firestore();
    await assertDenied(db.doc('users/patient1').update({ role: 'admin' }));
    console.log('  ✓ patient cannot set role=admin');
  }

  // 2. change own approval status → DENIED
  {
    const db = testEnv.authenticatedContext('pending1', { email: 'd@test.com' }).firestore();
    await assertDenied(db.doc('users/pending1').update({ status: 'approved' }));
    console.log('  ✓ pending doctor cannot self-approve');
  }

  // 3/4. create product as patient / provider → DENIED (API only)
  {
    const patientDb = testEnv.authenticatedContext('patient1', { email: 'p@test.com' }).firestore();
    await assertDenied(patientDb.collection('products').add({ name: 'X', status: 'approved', vendorId: 'patient1' }));
    console.log('  ✓ patient cannot create product');
    const vendorDb = testEnv.authenticatedContext('approved1', { email: 'v@test.com' }).firestore();
    await assertDenied(vendorDb.collection('products').add({ name: 'Y', status: 'approved', vendorId: 'approved1' }));
    console.log('  ✓ approved vendor cannot create product via client (must use API)');
  }

  // 5. read private settings → DENIED
  {
    const db = testEnv.authenticatedContext('patient1', { email: 'p@test.com' }).firestore();
    await assertDenied(db.doc('settings/admin').get());
    console.log('  ✓ patient cannot read settings');
  }

  // 6. edit another user's account → DENIED
  {
    const db = testEnv.authenticatedContext('patient1', { email: 'p@test.com' }).firestore();
    await assertDenied(db.doc('users/approved1').update({ name: 'Hacked' }));
    console.log('  ✓ patient cannot edit another user');
  }

  // 7. legitimate profile update → ALLOWED
  {
    const db = testEnv.authenticatedContext('patient1', { email: 'p@test.com' }).firestore();
    await assertAllowed(db.doc('users/patient1').update({ name: 'Patient Updated', profileDetails: { telephone: '071' } }));
    console.log('  ✓ patient can update safe profile fields');
  }

  // 8. approved provider can read own product
  {
    const db = testEnv.authenticatedContext('approved1', { email: 'v@test.com' }).firestore();
    await assertAllowed(db.doc('products/p1').get());
    console.log('  ✓ approved provider can read own product');
  }

  // 9. admin can read users
  {
    const db = testEnv.authenticatedContext('admin1', { email: 'a@test.com' }).firestore();
    await assertAllowed(db.doc('users/patient1').get());
    console.log('  ✓ admin can read user docs');
  }

  // A. unauthenticated denied
  {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertDenied(db.doc('settings/admin').get());
    await assertDenied(db.doc('users/patient1').update({ name: 'x' }));
    console.log('  ✓ unauthenticated denied for settings + user write');
  }

  await testEnv.cleanup();
  console.log('All emulator rules tests passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
