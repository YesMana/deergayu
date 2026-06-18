const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Initialize Firebase Admin (Using ENV variables for the service account)
try {
  // If FIREBASE_SERVICE_ACCOUNT is provided as a JSON string
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin initialized with ENV credentials.");
  } else {
    // Attempt default initialization if hosted in GCP/Firebase or if no env provided (will fail on cPanel without env)
    admin.initializeApp();
    console.log("Firebase Admin initialized with default credentials.");
  }
} catch (error) {
  console.error("Firebase Admin initialization error:", error);
}

const db = admin.firestore();

// Middleware to verify Admin Token
const verifyAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    // In our system, yes.manujaya@gmail.com is the hardcoded superadmin
    if (decodedToken.email !== 'yes.manujaya@gmail.com') {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Route: Get all users (optional, currently using Firestore from frontend, but good to have)
app.get('/api/users', verifyAdmin, async (req, res) => {
  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    res.json(listUsersResult.users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route: Delete a user
app.delete('/api/users/:uid', verifyAdmin, async (req, res) => {
  const { uid } = req.params;
  try {
    await admin.auth().deleteUser(uid);
    await db.collection('users').doc(uid).delete();
    res.json({ message: 'User successfully deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route: Update user role
app.put('/api/users/:uid/role', verifyAdmin, async (req, res) => {
  const { uid } = req.params;
  const { role } = req.body;
  
  if (!['user', 'doctor', 'clinic', 'organization'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    // Update in Firestore
    await db.collection('users').doc(uid).set({ role }, { merge: true });
    // Note: We don't change Firebase Auth custom claims here since we rely on Firestore for roles.
    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Deergayu API is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
