const SUPER_ADMIN_EMAIL = 'yes.manujaya@gmail.com';

const DEFAULT_CATEGORIES = [
  { id: 'medicine', name: 'Medicine', commissionPercent: 10 },
  { id: 'hair-care', name: 'Hair Care', commissionPercent: 12 },
  { id: 'skin-care', name: 'Skin Care', commissionPercent: 12 },
  { id: 'wellness', name: 'Wellness', commissionPercent: 10 },
  { id: 'general', name: 'General', commissionPercent: 10 },
];

const DEFAULT_SETTINGS = {
  commissionPercent: 10,
  bookingCommissionPercent: 10,
  minCommissionRs: 300,
  autoApproveExperts: false,
  autoApproveProducts: false,
  adminEmails: [SUPER_ADMIN_EMAIL],
  categories: DEFAULT_CATEGORIES,
  shippingZones: [
    { id: 'colombo', name: 'Colombo Metro', fee: 250 },
    { id: 'western', name: 'Western Province', fee: 350 },
    { id: 'island', name: 'Island-wide', fee: 500 },
  ],
  bankDetails: {
    bank: "People's Bank",
    branch: 'Colombo 03',
    accountName: 'Deergayu (Pvt) Ltd',
    accountNo: '123-4567-8901-00',
  },
  payhereEnabled: false,
  contactEmail: 'info@deergayu.com',
};

async function getSettings(db) {
  const doc = await db.collection('settings').doc('admin').get();
  if (!doc.exists) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...doc.data() };
}

async function isAdminUser(db, decodedToken) {
  if (!decodedToken?.email) return false;
  if (decodedToken.email.toLowerCase() === SUPER_ADMIN_EMAIL) return true;

  const settings = await getSettings(db);
  const adminEmails = (settings.adminEmails || []).map((e) => e.toLowerCase());
  if (adminEmails.includes(decodedToken.email.toLowerCase())) return true;

  const userDoc = await db.collection('users').doc(decodedToken.uid).get();
  return userDoc.exists && userDoc.data().role === 'admin';
}

function calcProductPricing(basePrice, commissionPercent, minCommissionRs = 300) {
  const base = Number(basePrice) || 0;
  if (base === 0) {
    return { basePrice: 0, commissionPercent, commissionAmount: 0, price: 0 };
  }
  const pct = Number(commissionPercent) || 10;
  const min = Number(minCommissionRs) || 300;
  const commissionAmount = Math.max(min, base * pct / 100);
  return {
    basePrice: base,
    commissionPercent: pct,
    commissionAmount: Number(commissionAmount.toFixed(2)),
    price: Number((base + commissionAmount).toFixed(1)),
  };
}

async function getCategoryCommission(db, categoryName) {
  const settings = await getSettings(db);
  const categories = settings.categories || DEFAULT_CATEGORIES;
  const match = categories.find(
    (c) => c.name.toLowerCase() === String(categoryName || 'General').toLowerCase()
  );
  return match?.commissionPercent ?? settings.commissionPercent ?? 10;
}

function calcOrderEarnings(items, defaultCommissionPercent = 10) {
  let vendorEarnings = 0;
  let platformFee = 0;
  const enrichedItems = (items || []).map((item) => {
    const qty = Number(item.quantity) || 1;
    const lineTotal = Number(item.price || 0) * qty;
    const base = Number(item.basePrice ?? item.price ?? 0) * qty;
    const fee = Math.max(0, lineTotal - base);
    vendorEarnings += base;
    platformFee += fee;
    return { ...item, lineTotal, vendorLineEarnings: base, platformLineFee: fee };
  });
  return { vendorEarnings, platformFee, enrichedItems };
}

async function updateReviewAggregates(db, targetType, targetId) {
  const col =
    targetType === 'product'
      ? db.collection('products').doc(targetId).collection('reviews')
      : db.collection('users').doc(targetId).collection('reviews');

  const snap = await col.get();
  const reviews = snap.docs
    .map((d) => d.data())
    .filter((r) => !r.status || r.status === 'published');
  const count = reviews.length;
  const avg = count
    ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count
    : 0;

  const targetRef =
    targetType === 'product'
      ? db.collection('products').doc(targetId)
      : db.collection('users').doc(targetId);

  await targetRef.set(
    { rating: Number(avg.toFixed(1)), reviewCount: count },
    { merge: true }
  );
  return { rating: Number(avg.toFixed(1)), reviewCount: count };
}

module.exports = {
  SUPER_ADMIN_EMAIL,
  DEFAULT_CATEGORIES,
  DEFAULT_SETTINGS,
  getSettings,
  isAdminUser,
  calcProductPricing,
  getCategoryCommission,
  calcOrderEarnings,
  updateReviewAggregates,
};
