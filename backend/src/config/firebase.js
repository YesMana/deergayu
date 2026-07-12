const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const config = require('./index');

function initializeFirebase() {
  if (admin.apps.length) {
    return { db: getFirestore(), auth: getAuth() };
  }

  try {
    if (config.firebaseServiceAccount) {
      const serviceAccount = JSON.parse(config.firebaseServiceAccount);
      admin.initializeApp({ credential: admin.cert(serviceAccount) });
      console.log('[Firebase] Initialized with service account credentials.');
    } else {
      admin.initializeApp();
      console.log('[Firebase] Initialized with default credentials.');
    }
  } catch (error) {
    console.error('[Firebase] Initialization error:', error.message);
    throw error;
  }

  return { db: getFirestore(), auth: getAuth() };
}

const { db, auth } = initializeFirebase();

module.exports = { admin, db, auth };
