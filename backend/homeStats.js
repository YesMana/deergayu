/**
 * Public home/platform counters.
 *
 * CRITICAL TRUST RULE: return REAL counts only.
 * Never apply homeStatsFloor / Math.max(real, floor) inflation.
 *
 * Count definitions:
 * - expertCount: approved public providers only
 *   (role in doctor|clinic|organization AND status === 'approved').
 *   Excludes patients, admins, pending/rejected/hidden providers.
 * - productCount: approved (public shop) products only.
 * - appointmentCount: total appointment documents in Firestore.
 *   Includes cancelled and rejected records (total recorded bookings).
 * - orderCount: total order documents.
 *
 * Zero is a valid truthful value.
 */

function toNonNegInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/**
 * @param {{ expertCount?: number, productCount?: number, appointmentCount?: number, orderCount?: number }} counts
 * @returns {{ expertCount: number, productCount: number, appointmentCount: number, orderCount: number }}
 */
function buildHomeStatsPayload(counts = {}) {
  return {
    expertCount: toNonNegInt(counts.expertCount),
    productCount: toNonNegInt(counts.productCount),
    appointmentCount: toNonNegInt(counts.appointmentCount),
    orderCount: toNonNegInt(counts.orderCount),
  };
}

/**
 * Query real counts from Firestore. Ignores any settings.homeStatsFloor.
 * @param {FirebaseFirestore.Firestore} db
 */
async function fetchHomeStats(db) {
  const [providersSnap, productsSnap, ordersSnap, appointmentsSnap] = await Promise.all([
    db
      .collection('users')
      .where('role', 'in', ['doctor', 'clinic', 'organization'])
      .where('status', '==', 'approved')
      .get(),
    db.collection('products').where('status', '==', 'approved').get(),
    db.collection('orders').get(),
    db.collection('appointments').get(),
  ]);

  return buildHomeStatsPayload({
    expertCount: providersSnap.size,
    productCount: productsSnap.size,
    appointmentCount: appointmentsSnap.size,
    orderCount: ordersSnap.size,
  });
}

module.exports = {
  buildHomeStatsPayload,
  fetchHomeStats,
};
