const express = require('express');
const { db } = require('../config/firebase');
const { PROVIDER_ROLES, ACTIVE_APPOINTMENT_STATUSES } = require('../constants');
const asyncHandler = require('../utils/asyncHandler');
const { chat, analyzeSymptoms, matchByName } = require('../services/ai.service');

const router = express.Router();

router.get('/home-stats', asyncHandler(async (_req, res) => {
  const [providersSnap, productsSnap, ordersSnap, appointmentsSnap] = await Promise.all([
    db.collection('users').where('role', 'in', PROVIDER_ROLES).where('status', '==', 'approved').get(),
    db.collection('products').where('status', '==', 'approved').get(),
    db.collection('orders').get(),
    db.collection('appointments').get(),
  ]);
  res.json({
    expertCount: providersSnap.size,
    productCount: productsSnap.size,
    orderCount: ordersSnap.size,
    appointmentCount: appointmentsSnap.size,
  });
}));

router.get('/featured-providers', asyncHandler(async (_req, res) => {
  const snapshot = await db.collection('users')
    .where('role', 'in', PROVIDER_ROLES)
    .where('status', '==', 'approved')
    .limit(6)
    .get();
  const providers = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      role: data.role,
      profileDetails: data.profileDetails || {},
      rating: data.rating || 4.5,
      reviewCount: data.reviewCount || 0,
    };
  });
  res.json(providers);
}));

router.get('/featured-products', asyncHandler(async (_req, res) => {
  const snapshot = await db.collection('products')
    .where('status', '==', 'approved')
    .limit(6)
    .get();
  res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
}));

router.get('/providers', asyncHandler(async (_req, res) => {
  const snapshot = await db.collection('users')
    .where('role', 'in', PROVIDER_ROLES)
    .where('status', '==', 'approved')
    .get();
  const providers = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      role: data.role,
      profileDetails: data.profileDetails || {},
      rating: data.rating || 0,
      reviewCount: data.reviewCount || 0,
    };
  });
  res.json(providers);
}));

router.post('/symptom-check', asyncHandler(async (req, res) => {
  const { symptom, lang } = req.body;
  if (!symptom) return res.status(400).json({ error: 'Symptom is required' });

  const [providersSnap, productsSnap] = await Promise.all([
    db.collection('users').where('role', 'in', PROVIDER_ROLES).where('status', '==', 'approved').get(),
    db.collection('products').where('status', '==', 'approved').get(),
  ]);

  const providersList = providersSnap.docs.map((d) => {
    const data = d.data();
    return `${data.name} (${data.role}) - Specialty: ${data.profileDetails?.specialty || 'General Ayurveda'} - Location: ${data.profileDetails?.address || 'Sri Lanka'}`;
  }).join('\n');

  const productsList = productsSnap.docs.map((d) => {
    const data = d.data();
    return `${data.name} - Category: ${data.category} - Price: Rs.${data.price}`;
  }).join('\n');

  const aiData = await analyzeSymptoms(symptom, lang, providersList, productsList);

  const matchedProviders = matchByName(providersSnap.docs, aiData.recommendedDoctors);
  const matchedProducts = productsSnap.docs
    .filter((d) =>
      aiData.recommendedProducts?.some((name) => {
        const docName = d.data().name?.toLowerCase() || '';
        const recName = name.toLowerCase();
        return docName.includes(recName) || recName.includes(docName);
      })
    )
    .map((d) => ({ id: d.id, ...d.data() }))
    .slice(0, 3);

  res.json({
    analysis: aiData.analysis || '',
    remedies: aiData.remedies || [],
    doctors: matchedProviders,
    products: matchedProducts,
  });
}));

router.post('/chat', asyncHandler(async (req, res) => {
  const { message, lang } = req.body;
  const reply = await chat(message, lang);
  res.json({ reply });
}));

router.get('/appointments/available/:providerId', asyncHandler(async (req, res) => {
  const { providerId } = req.params;
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date query param required' });

  const providerDoc = await db.collection('users').doc(providerId).get();
  if (!providerDoc.exists) return res.status(404).json({ error: 'Provider not found' });

  const profile = providerDoc.data().profileDetails || {};
  const schedule = profile.schedule || {
    slotDuration: 30,
    workingDays: {
      Monday: { start: '09:00', end: '17:00' },
      Tuesday: { start: '09:00', end: '17:00' },
      Wednesday: { start: '09:00', end: '17:00' },
      Thursday: { start: '09:00', end: '17:00' },
      Friday: { start: '09:00', end: '17:00' },
    },
    unavailableDates: [],
  };

  if (schedule.unavailableDates?.includes(date)) {
    return res.json({ allSlots: [], bookedSlots: [] });
  }

  const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
  const workingDay = schedule.workingDays?.[dayOfWeek];
  if (!workingDay?.start || !workingDay?.end) {
    return res.json({ allSlots: [], bookedSlots: [] });
  }

  const apptsSnapshot = await db.collection('appointments')
    .where('providerId', '==', providerId)
    .where('date', '==', date)
    .where('status', 'in', ACTIVE_APPOINTMENT_STATUSES)
    .get();

  const bookedSlots = apptsSnapshot.docs.map((doc) => doc.data().time);

  const availableSlots = [];
  const [startH, startM] = workingDay.start.split(':').map(Number);
  const [endH, endM] = workingDay.end.split(':').map(Number);
  let currentMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;
  const slotDuration = Number(schedule.slotDuration) || 30;

  while (currentMins + slotDuration <= endMins) {
    const h = Math.floor(currentMins / 60).toString().padStart(2, '0');
    const m = (currentMins % 60).toString().padStart(2, '0');
    availableSlots.push(`${h}:${m}`);
    currentMins += slotDuration;
  }

  res.json({ allSlots: availableSlots, bookedSlots });
}));

module.exports = router;
