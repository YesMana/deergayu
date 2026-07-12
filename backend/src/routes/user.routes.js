const express = require('express');
const { db } = require('../config/firebase');
const { verifyUser } = require('../middleware/auth');
const { ACTIVE_APPOINTMENT_STATUSES } = require('../constants');
const asyncHandler = require('../utils/asyncHandler');
const { sendEmail } = require('../services/email.service');

const router = express.Router();

router.get('/wishlist', verifyUser, asyncHandler(async (req, res) => {
  const doc = await db.collection('wishlists').doc(req.user.uid).get();
  res.json({ items: doc.exists ? (doc.data().items || []) : [] });
}));

router.post('/wishlist/:productId', verifyUser, asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const wishlistRef = db.collection('wishlists').doc(req.user.uid);
  const doc = await wishlistRef.get();
  let items = doc.exists ? (doc.data().items || []) : [];

  const idx = items.indexOf(productId);
  if (idx >= 0) {
    items.splice(idx, 1);
    await wishlistRef.set({ items, updatedAt: new Date().toISOString() });
    res.json({ added: false, items });
  } else {
    items.push(productId);
    await wishlistRef.set({ items, updatedAt: new Date().toISOString() });
    res.json({ added: true, items });
  }
}));

router.get('/cart', verifyUser, asyncHandler(async (req, res) => {
  const doc = await db.collection('carts').doc(req.user.uid).get();
  res.json(doc.exists ? doc.data() : { items: [] });
}));

router.post('/cart', verifyUser, asyncHandler(async (req, res) => {
  const { productId, name, price, quantity, vendorId, vendorName, imageUrl, category } = req.body;
  if (!productId || !name || !price) {
    return res.status(400).json({ error: 'productId, name, and price are required' });
  }

  const cartRef = db.collection('carts').doc(req.user.uid);
  const cartDoc = await cartRef.get();
  let items = cartDoc.exists ? (cartDoc.data().items || []) : [];

  const existingIndex = items.findIndex((item) => item.productId === productId);
  if (existingIndex >= 0) {
    items[existingIndex].quantity = (items[existingIndex].quantity || 1) + (quantity || 1);
  } else {
    items.push({
      productId,
      name,
      price: Number(price),
      quantity: quantity || 1,
      vendorId: vendorId || '',
      vendorName: vendorName || '',
      imageUrl: imageUrl || '',
      category: category || '',
      addedAt: new Date().toISOString(),
    });
  }

  await cartRef.set({ items, updatedAt: new Date().toISOString() });
  res.json({ items, message: 'Cart updated' });
}));

router.put('/cart/:productId', verifyUser, asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  const cartRef = db.collection('carts').doc(req.user.uid);
  const cartDoc = await cartRef.get();
  if (!cartDoc.exists) return res.status(404).json({ error: 'Cart not found' });

  let items = cartDoc.data().items || [];
  const index = items.findIndex((item) => item.productId === productId);
  if (index < 0) return res.status(404).json({ error: 'Item not in cart' });

  if (quantity <= 0) items.splice(index, 1);
  else items[index].quantity = quantity;

  await cartRef.set({ items, updatedAt: new Date().toISOString() });
  res.json({ items, message: 'Cart updated' });
}));

router.delete('/cart/:productId', verifyUser, asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const cartRef = db.collection('carts').doc(req.user.uid);
  const cartDoc = await cartRef.get();
  if (!cartDoc.exists) return res.status(404).json({ error: 'Cart not found' });

  const items = (cartDoc.data().items || []).filter((item) => item.productId !== productId);
  await cartRef.set({ items, updatedAt: new Date().toISOString() });
  res.json({ items, message: 'Item removed from cart' });
}));

router.post('/checkout', verifyUser, asyncHandler(async (req, res) => {
  const { paymentMethod, deliveryAddress, phone, notes } = req.body;

  const cartDoc = await db.collection('carts').doc(req.user.uid).get();
  if (!cartDoc.exists || !cartDoc.data().items?.length) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const items = cartDoc.data().items;
  const userDoc = await db.collection('users').doc(req.user.uid).get();
  const userName = userDoc.exists ? userDoc.data().name : req.user.email;

  const vendorGroups = {};
  items.forEach((item) => {
    const vid = item.vendorId || 'unknown';
    if (!vendorGroups[vid]) {
      vendorGroups[vid] = { items: [], vendorName: item.vendorName || 'Unknown Vendor' };
    }
    vendorGroups[vid].items.push(item);
  });

  const orderIds = [];

  for (const [vendorId, group] of Object.entries(vendorGroups)) {
    const totalPrice = group.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderData = {
      customerId: req.user.uid,
      customerName: userName,
      customerEmail: req.user.email,
      vendorId,
      vendorName: group.vendorName,
      items: group.items,
      totalPrice,
      status: 'pending',
      paymentMethod: paymentMethod || 'cash_on_delivery',
      deliveryAddress: deliveryAddress || '',
      phone: phone || '',
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection('orders').add(orderData);
    orderIds.push(docRef.id);

    try {
      const vendorDoc = await db.collection('users').doc(vendorId).get();
      if (vendorDoc.exists && vendorDoc.data().email) {
        const itemsHtml = group.items.map((i) =>
          `<tr><td style="padding:6px 12px">${i.name}</td><td style="padding:6px 12px">x${i.quantity}</td><td style="padding:6px 12px">Rs. ${(i.price * i.quantity).toLocaleString()}</td></tr>`
        ).join('');
        const vendorHtml = `<div style="font-family:Arial,sans-serif;padding:20px;color:#333">
          <h2 style="color:#2e7d32">&#128717; New Order Received!</h2>
          <p>Hello ${group.vendorName},</p>
          <p>You have a new order from <strong>${userName}</strong>.</p>
          <table style="border-collapse:collapse;width:100%;margin:16px 0">
            <thead><tr style="background:#f5f5f5"><th style="padding:6px 12px;text-align:left">Item</th><th style="padding:6px 12px">Qty</th><th style="padding:6px 12px">Price</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot><tr><td colspan="2" style="padding:8px 12px;font-weight:bold">Total</td><td style="padding:8px 12px;font-weight:bold">Rs. ${totalPrice.toLocaleString()}</td></tr></tfoot>
          </table>
          <p><strong>Payment:</strong> ${paymentMethod}</p>
          <p><strong>Delivery Address:</strong> ${deliveryAddress}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p>Please log in to your Deergayu dashboard to process this order.</p>
          <br/><p>Thanks,<br/>Deergayu Platform</p>
        </div>`;
        sendEmail(vendorDoc.data().email, `New Order - Rs. ${totalPrice.toLocaleString()} - Deergayu`, '', vendorHtml)
          .catch((e) => console.error('[Email] Vendor order notification failed:', e.message));
      }
    } catch (emailErr) {
      console.error('[Email] Vendor order prep error:', emailErr.message);
    }
  }

  try {
    const allItemsHtml = items.map((i) =>
      `<tr><td style="padding:6px 12px">${i.name}</td><td style="padding:6px 12px">x${i.quantity}</td><td style="padding:6px 12px">Rs. ${(i.price * i.quantity).toLocaleString()}</td></tr>`
    ).join('');
    const grandTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const paymentInstructions = (paymentMethod === 'bank_transfer' || paymentMethod === 'qr_pay')
      ? `<div style="background:#fff8e1;border-left:4px solid #ffc107;padding:16px;margin:16px 0;border-radius:4px">
          <h3 style="margin:0 0 8px 0;color:#f57f17">Payment Pending</h3>
          <p style="margin:0">Your order is reserved. Please complete your payment via <strong>${paymentMethod === 'qr_pay' ? 'QR Pay' : 'Bank Transfer'}</strong> and your order will be confirmed.</p>
          <p style="margin:8px 0 0 0"><strong>Bank:</strong> People's Bank | <strong>Acc:</strong> 123-4567-8901 | <strong>Name:</strong> Deergayu (Pvt) Ltd | <strong>Ref:</strong> ${orderIds[0]?.slice(-8).toUpperCase()}</p>
        </div>`
      : '';
    const customerHtml = `<div style="font-family:Arial,sans-serif;padding:20px;color:#333">
      <h2 style="color:#2e7d32">Order Confirmed!</h2>
      <p>Hello ${userName},</p>
      <p>Thank you for shopping at Deergayu! Your order has been placed successfully.</p>
      <p><strong>Order Reference:</strong> ${orderIds.map((id) => id.slice(-8).toUpperCase()).join(', ')}</p>
      ${paymentInstructions}
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <thead><tr style="background:#f5f5f5"><th style="padding:6px 12px;text-align:left">Item</th><th style="padding:6px 12px">Qty</th><th style="padding:6px 12px">Price</th></tr></thead>
        <tbody>${allItemsHtml}</tbody>
        <tfoot><tr><td colspan="2" style="padding:8px 12px;font-weight:bold">Total</td><td style="padding:8px 12px;font-weight:bold">Rs. ${grandTotal.toLocaleString()}</td></tr></tfoot>
      </table>
      <p><strong>Delivery to:</strong> ${deliveryAddress}</p>
      <p><strong>Payment Method:</strong> ${paymentMethod}</p>
      <br/><p>Thanks for your order!<br/>Deergayu Team</p>
    </div>`;
    sendEmail(req.user.email, `Order Confirmed - Rs. ${grandTotal.toLocaleString()} | Deergayu`, '', customerHtml)
      .catch((e) => console.error('[Email] Customer order confirmation failed:', e.message));
  } catch (emailErr) {
    console.error('[Email] Customer order prep error:', emailErr.message);
  }

  await db.collection('carts').doc(req.user.uid).set({ items: [], updatedAt: new Date().toISOString() });
  res.json({ message: 'Order placed successfully', orderIds });
}));

router.get('/my-orders', verifyUser, asyncHandler(async (req, res) => {
  const snapshot = await db.collection('orders').where('customerId', '==', req.user.uid).get();
  const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  res.json(orders);
}));

router.post('/appointments', verifyUser, asyncHandler(async (req, res) => {
  const { providerId, providerName, date, time, notes } = req.body;
  if (!providerId || !date || !time) {
    return res.status(400).json({ error: 'providerId, date, and time are required' });
  }

  const existing = await db.collection('appointments')
    .where('providerId', '==', providerId)
    .where('date', '==', date)
    .where('time', '==', time)
    .where('status', 'in', ACTIVE_APPOINTMENT_STATUSES)
    .get();

  if (!existing.empty) {
    return res.status(400).json({ error: 'This time slot is already booked.' });
  }

  const userDoc = await db.collection('users').doc(req.user.uid).get();
  const userName = userDoc.exists ? userDoc.data().name : req.user.email;

  const appointmentData = {
    customerId: req.user.uid,
    customerName: userName,
    customerEmail: req.user.email,
    customerPhone: req.body.phone || '',
    providerId,
    providerName: providerName || '',
    date,
    time,
    status: 'pending',
    notes: notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const docRef = await db.collection('appointments').add(appointmentData);

  try {
    const providerDoc = await db.collection('users').doc(providerId).get();
    if (providerDoc.exists && providerDoc.data().email) {
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2e7d32;">New Appointment Request</h2>
          <p>Hello ${providerName},</p>
          <p>You have a new appointment booking request from <strong>${userName}</strong>.</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${time}</p>
            <p style="margin: 5px 0;"><strong>Patient Note:</strong> ${notes || 'None'}</p>
          </div>
          <p>Please log in to your Deergayu Vendor Dashboard to accept or decline this request.</p>
          <br/>
          <p>Thanks,<br/>Deergayu Platform Team</p>
        </div>`;
      sendEmail(providerDoc.data().email, 'New Appointment Booking - Deergayu', '', htmlBody)
        .catch((err) => console.error('[Email] Booking notification failed:', err.message));
    }
  } catch (emailErr) {
    console.error('[Email] Booking prep error:', emailErr.message);
  }

  res.json({ id: docRef.id, ...appointmentData, message: 'Appointment booked successfully' });
}));

router.get('/my-appointments', verifyUser, asyncHandler(async (req, res) => {
  const snapshot = await db.collection('appointments').where('customerId', '==', req.user.uid).get();
  const appointments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  appointments.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  res.json(appointments);
}));

router.post('/my-appointments/:id/cancel', verifyUser, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const apptDoc = await db.collection('appointments').doc(id).get();
  if (!apptDoc.exists) return res.status(404).json({ error: 'Appointment not found' });
  if (apptDoc.data().customerId !== req.user.uid) {
    return res.status(403).json({ error: 'You can only cancel your own appointments' });
  }
  if (apptDoc.data().status === 'completed') {
    return res.status(400).json({ error: 'Cannot cancel a completed appointment' });
  }

  await db.collection('appointments').doc(id).update({
    status: 'cancelled',
    updatedAt: new Date().toISOString(),
  });
  res.json({ message: 'Appointment cancelled successfully' });
}));

module.exports = router;
