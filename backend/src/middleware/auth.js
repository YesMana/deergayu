const config = require('../config');
const { db, auth } = require('../config/firebase');
const { VENDOR_ROLES } = require('../constants');

function isAdminEmail(email) {
  return config.adminEmails.includes((email || '').toLowerCase());
}

async function verifyUser(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided', code: 'AUTH_REQUIRED' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;

    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (userDoc.exists) {
      req.userRole = userDoc.data().role || 'user';
      req.userStatus = userDoc.data().status || 'approved';
    } else {
      req.userRole = 'user';
      req.userStatus = 'approved';
    }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token', code: 'AUTH_INVALID' });
  }
}

async function verifyAdmin(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided', code: 'AUTH_REQUIRED' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    if (!isAdminEmail(decodedToken.email)) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required', code: 'FORBIDDEN' });
    }
    req.user = decodedToken;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token', code: 'AUTH_INVALID' });
  }
}

async function verifyVendor(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided', code: 'AUTH_REQUIRED' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;

    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return res.status(403).json({ error: 'User profile not found', code: 'PROFILE_NOT_FOUND' });
    }

    const userData = userDoc.data();
    if (!VENDOR_ROLES.includes(userData.role) && !isAdminEmail(decodedToken.email)) {
      return res.status(403).json({ error: 'Vendor/Doctor access required', code: 'FORBIDDEN' });
    }

    req.userRole = userData.role;
    req.userStatus = userData.status;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token', code: 'AUTH_INVALID' });
  }
}

module.exports = { verifyUser, verifyAdmin, verifyVendor, isAdminEmail };
