/**
 * Firestore / Storage rules expectation matrix for P0-A.
 * These are executable documentation checks against the committed rules files
 * (static assertions). For live emulator tests, publish rules then run:
 *   firebase emulators:exec --only firestore,storage "node backend/tests/firestore.rules.emulator.test.js"
 *
 * Run: node backend/tests/firestore.rules.static.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const firestoreRules = fs.readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8');
const storageRules = fs.readFileSync(path.join(__dirname, '../../storage.rules'), 'utf8');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('P0-A firestore.rules.static.test.js');

test('users create denied for clients', () => {
  assert.match(firestoreRules, /match \/users\/\{userId\}[\s\S]*allow create:\s*if false/);
});

test('users cannot change privileged fields on update', () => {
  assert.match(firestoreRules, /privilegedUserKeys/);
  assert.match(firestoreRules, /userUpdateKeysSafe/);
  assert.match(firestoreRules, /allow update:\s*if isOwner\(userId\) && userUpdateKeysSafe\(\)/);
});

test('products client writes denied', () => {
  assert.match(firestoreRules, /match \/products\/\{productId\}[\s\S]*allow create, update, delete:\s*if false/);
});

test('settings private — client read/write denied', () => {
  assert.match(firestoreRules, /match \/settings\/\{docId\}[\s\S]*allow read, write:\s*if false/);
});

test('appointments / orders writes denied (API only)', () => {
  assert.match(firestoreRules, /match \/appointments\/\{id\}[\s\S]*allow create, update, delete:\s*if false/);
  assert.match(firestoreRules, /match \/orders\/\{id\}[\s\S]*allow create, update, delete:\s*if false/);
});

test('default deny present', () => {
  assert.match(firestoreRules, /match \/\{document=\*\*\}[\s\S]*allow read, write:\s*if false/);
});

test('storage: medical path deny-all reserved', () => {
  assert.match(storageRules, /match \/medical\/\{allPaths=\*\*\}[\s\S]*allow read, write:\s*if false/);
});

test('storage: uploads require uid ownership or admin', () => {
  assert.match(storageRules, /request\.auth\.uid == userId \|\| isAdminUser\(\)/);
});

test('storage: guide writes not open to all authenticated users', () => {
  assert.doesNotMatch(storageRules, /match \/guide\/\{allPaths=\*\*\}[\s\S]*allow write:\s*if request\.auth != null;/);
  assert.match(storageRules, /match \/guide\/\{allPaths=\*\*\}[\s\S]*allow write:\s*if isAdminUser\(\)/);
});

console.log('All static rules tests passed.');
