/**
 * Concurrency-safe human-readable business references.
 * Uses Firestore transactional counters — never in-memory increments.
 *
 * Formats:
 *   DG-APT-YYYY-######
 *   DG-PAY-YYYY-######
 *   DG-ORD-YYYY-######
 *   DG-SET-YYYY-######
 */

const { REFERENCE_PREFIXES } = require('./constants');

function padSeq(n, width = 6) {
  return String(n).padStart(width, '0');
}

function counterDocId(kind, year) {
  return `${kind}-${year}`;
}

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {'appointment'|'payment'|'order'|'settlement'} kind
 * @param {Date} [at]
 */
async function nextBusinessReference(db, kind, at = new Date()) {
  const prefix = REFERENCE_PREFIXES[kind];
  if (!prefix) throw new Error(`Unknown reference kind: ${kind}`);
  if (!db || typeof db.runTransaction !== 'function') {
    throw new Error('Firestore db with runTransaction is required');
  }

  const year = at.getUTCFullYear();
  const ref = db.collection('counters').doc(counterDocId(kind, year));

  const seq = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? Number(snap.data().seq || 0) : 0;
    const next = current + 1;
    tx.set(
      ref,
      {
        kind,
        year,
        seq: next,
        updatedAt: at.toISOString(),
      },
      { merge: true }
    );
    return next;
  });

  return `${prefix}-${year}-${padSeq(seq)}`;
}

async function nextAppointmentReference(db, at) {
  return nextBusinessReference(db, 'appointment', at);
}
async function nextPaymentReference(db, at) {
  return nextBusinessReference(db, 'payment', at);
}
async function nextOrderReference(db, at) {
  return nextBusinessReference(db, 'order', at);
}
async function nextSettlementReference(db, at) {
  return nextBusinessReference(db, 'settlement', at);
}

module.exports = {
  padSeq,
  counterDocId,
  nextBusinessReference,
  nextAppointmentReference,
  nextPaymentReference,
  nextOrderReference,
  nextSettlementReference,
};
