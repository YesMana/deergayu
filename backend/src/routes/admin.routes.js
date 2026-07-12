const express = require('express');
const { db, auth } = require('../config/firebase');
const { verifyAdmin } = require('../middleware/auth');
const { USER_ROLES, USER_STATUSES, PRODUCT_STATUSES, ORDER_STATUSES } = require('../constants');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/users', verifyAdmin, asyncHandler(async (_req, res) => {
  const listUsersResult = await auth.listUsers(1000);
  res.json(listUsersResult.users);
}));

router.post('/users/:uid/delete', verifyAdmin, asyncHandler(async (req, res) => {
  const { uid } = req.params;
  try {
    await auth.deleteUser(uid);
  } catch (authError) {
    if (authError.code !== 'auth/user-not-found') throw authError;
    console.log(`[Admin] User ${uid} not in Auth, deleting Firestore profile only.`);
  }
  await db.collection('users').doc(uid).delete();
  res.json({ message: 'User successfully deleted' });
}));

router.post('/users/:uid/role', verifyAdmin, asyncHandler(async (req, res) => {
  const { uid } = req.params;
  const { role } = req.body;
  if (!USER_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  await db.collection('users').doc(uid).set({ role }, { merge: true });
  res.json({ message: 'User role updated successfully' });
}));

router.post('/users/:uid/status', verifyAdmin, asyncHandler(async (req, res) => {
  const { uid } = req.params;
  const { status } = req.body;
  if (!USER_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  await db.collection('users').doc(uid).set({ status }, { merge: true });
  res.json({ message: 'User status updated successfully' });
}));

router.post('/products/:id/status', verifyAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!PRODUCT_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  await db.collection('products').doc(id).set({ status }, { merge: true });
  res.json({ message: 'Product status updated successfully' });
}));

router.get('/orders', verifyAdmin, asyncHandler(async (_req, res) => {
  const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
  res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
}));

router.post('/orders/:id/status', verifyAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  await db.collection('orders').doc(id).update({ status, updatedAt: new Date().toISOString() });
  res.json({ message: 'Order status updated successfully' });
}));

router.get('/appointments', verifyAdmin, asyncHandler(async (_req, res) => {
  const snapshot = await db.collection('appointments').orderBy('createdAt', 'desc').get();
  res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
}));

router.get('/settings', verifyAdmin, asyncHandler(async (_req, res) => {
  const doc = await db.collection('settings').doc('admin').get();
  if (doc.exists) {
    res.json(doc.data());
  } else {
    res.json({ commissionPercent: 10, autoApproveExperts: false, autoApproveProducts: false });
  }
}));

router.post('/settings', verifyAdmin, asyncHandler(async (req, res) => {
  const { commissionPercent, autoApproveExperts, autoApproveProducts } = req.body;
  await db.collection('settings').doc('admin').set({
    commissionPercent: commissionPercent || 10,
    autoApproveExperts: autoApproveExperts || false,
    autoApproveProducts: autoApproveProducts || false,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  res.json({ message: 'Settings saved successfully' });
}));

module.exports = router;
