const express = require('express');
const { db } = require('../config/firebase');
const { verifyVendor, verifyUser } = require('../middleware/auth');
const { VENDOR_ORDER_STATUSES, APPOINTMENT_STATUSES } = require('../constants');
const asyncHandler = require('../utils/asyncHandler');
const { sendEmail } = require('../services/email.service');

const router = express.Router();

router.get('/vendor/products', verifyVendor, asyncHandler(async (req, res) => {
  const snapshot = await db.collection('products').where('vendorId', '==', req.user.uid).get();
  const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  res.json(products);
}));

router.post('/vendor/products', verifyVendor, asyncHandler(async (req, res) => {
  const { name, description, price, category, imageUrl, stock } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Name and price are required' });

  const userDoc = await db.collection('users').doc(req.user.uid).get();
  const vendorName = userDoc.exists ? userDoc.data().name : req.user.email;

  const productData = {
    name,
    description: description || '',
    basePrice: req.body.basePrice ? Number(req.body.basePrice) : Number(price),
    price: Number(price),
    category: category || 'General',
    imageUrl: imageUrl || '',
    stock: Number(stock) || 0,
    vendorId: req.user.uid,
    vendorEmail: req.user.email,
    vendorName,
    status: 'pending',
    rating: 0,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const docRef = await db.collection('products').add(productData);
  res.status(201).json({ id: docRef.id, ...productData });
}));

router.put('/vendor/products/:id', verifyVendor, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, price, category, imageUrl, stock } = req.body;

  const productDoc = await db.collection('products').doc(id).get();
  if (!productDoc.exists) return res.status(404).json({ error: 'Product not found' });
  if (productDoc.data().vendorId !== req.user.uid) {
    return res.status(403).json({ error: 'You can only edit your own products' });
  }

  const updateData = { updatedAt: new Date().toISOString() };
  if (name) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (price) updateData.price = Number(price);
  if (category) updateData.category = category;
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
  if (stock !== undefined) updateData.stock = Number(stock);

  await db.collection('products').doc(id).update(updateData);
  res.json({ message: 'Product updated successfully' });
}));

router.delete('/vendor/products/:id', verifyVendor, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const productDoc = await db.collection('products').doc(id).get();
  if (!productDoc.exists) return res.status(404).json({ error: 'Product not found' });
  if (productDoc.data().vendorId !== req.user.uid) {
    return res.status(403).json({ error: 'You can only delete your own products' });
  }
  await db.collection('products').doc(id).delete();
  res.json({ message: 'Product deleted successfully' });
}));

router.get('/vendor/orders', verifyVendor, asyncHandler(async (req, res) => {
  const snapshot = await db.collection('orders').where('vendorId', '==', req.user.uid).get();
  const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  res.json(orders);
}));

router.post('/vendor/orders/:id/status', verifyVendor, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!VENDOR_ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const orderDoc = await db.collection('orders').doc(id).get();
  if (!orderDoc.exists) return res.status(404).json({ error: 'Order not found' });
  if (orderDoc.data().vendorId !== req.user.uid) {
    return res.status(403).json({ error: 'You can only manage your own orders' });
  }

  await db.collection('orders').doc(id).update({ status, updatedAt: new Date().toISOString() });
  res.json({ message: 'Order status updated' });
}));

router.get('/vendor/appointments', verifyVendor, asyncHandler(async (req, res) => {
  const snapshot = await db.collection('appointments').where('providerId', '==', req.user.uid).get();
  const appointments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  appointments.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  res.json(appointments);
}));

router.post('/vendor/appointments/:id/status', verifyVendor, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!APPOINTMENT_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${APPOINTMENT_STATUSES.join(', ')}` });
  }

  const apptDoc = await db.collection('appointments').doc(id).get();
  if (!apptDoc.exists) return res.status(404).json({ error: 'Appointment not found' });
  if (apptDoc.data().providerId !== req.user.uid) {
    return res.status(403).json({ error: 'You can only manage your own appointments' });
  }

  await db.collection('appointments').doc(id).update({ status, updatedAt: new Date().toISOString() });

  const apptData = apptDoc.data();
  if (apptData.customerEmail) {
    const statusText = status === 'accepted' ? '✅ Confirmed' : status === 'rejected' ? '❌ Declined' : status;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: ${status === 'accepted' ? '#2e7d32' : '#c62828'};">Appointment ${statusText}</h2>
        <p>Hello ${apptData.customerName || 'Patient'},</p>
        <p>Your appointment request has been <strong>${status}</strong> by <strong>${apptData.providerName}</strong>.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Date:</strong> ${apptData.date}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${apptData.time}</p>
        </div>
        ${status === 'accepted' ? '<p>Please be ready 10 minutes before your appointment time.</p>' : '<p>You may try booking another available slot.</p>'}
        <br/>
        <p>Thanks,<br/>Deergayu Platform Team</p>
      </div>`;
    sendEmail(apptData.customerEmail, `Appointment ${statusText} - Deergayu`, '', htmlBody)
      .catch((err) => console.error('[Email] Appointment status notification failed:', err.message));
  }

  res.json({ message: 'Appointment status updated' });
}));

router.post('/vendor/schedule', verifyUser, asyncHandler(async (req, res) => {
  const { schedule } = req.body;
  await db.collection('users').doc(req.user.uid).update({
    'profileDetails.schedule': schedule,
  });
  res.json({ message: 'Schedule updated successfully' });
}));

module.exports = router;
