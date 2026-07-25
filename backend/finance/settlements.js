/**
 * Settlement ledger foundation — admin-operated, no automatic bank transfers.
 */

const {
  SETTLEMENT_STATUSES,
  PROVIDER_PAYMENT_STATUSES,
} = require('./constants');
const { roundMoney } = require('./pricing');
const { nextSettlementReference } = require('./references');

function buildSettlementRecord({
  settlementReference,
  providerId,
  periodStart,
  periodEnd,
  amount,
  appointmentIds = [],
  paymentIds = [],
  status = SETTLEMENT_STATUSES.DRAFT,
  settlementMethod = 'manual_bank_transfer',
  notes = '',
}) {
  if (!settlementReference) throw new Error('settlementReference required');
  if (!providerId) throw new Error('providerId required');
  const now = new Date().toISOString();
  return {
    settlementReference,
    providerId,
    periodStart: periodStart || null,
    periodEnd: periodEnd || null,
    amount: roundMoney(amount),
    status,
    appointmentIds: [...appointmentIds],
    paymentIds: [...paymentIds],
    settledAt: null,
    settlementMethod,
    notes: notes || '',
    createdAt: now,
    updatedAt: now,
  };
}

async function createSettlementDraft(db, fields) {
  const settlementReference =
    fields.settlementReference || (await nextSettlementReference(db));
  const record = buildSettlementRecord({ ...fields, settlementReference });
  const ref = await db.collection('settlements').add(record);
  return { id: ref.id, ...record };
}

/**
 * Sum outstanding ELIGIBLE provider payables for a provider.
 * Expects payment docs with providerPaymentStatus + providerPayout.
 */
function calculateOutstandingPayable(payments = []) {
  return roundMoney(
    payments
      .filter((p) => p.providerPaymentStatus === PROVIDER_PAYMENT_STATUSES.ELIGIBLE)
      .reduce((s, p) => s + Number(p.providerPayout || 0), 0)
  );
}

/**
 * Mark payments as PAID under a settlement; create reconciliation rows if needed.
 */
async function completeSettlement(db, settlementId, { actorUid, notes } = {}) {
  const ref = db.collection('settlements').doc(settlementId);
  const snap = await ref.get();
  if (!snap.exists) {
    const err = new Error('Settlement not found');
    err.statusCode = 404;
    throw err;
  }
  const data = snap.data();
  if (data.status === SETTLEMENT_STATUSES.COMPLETED) {
    return { id: settlementId, ...data };
  }
  const now = new Date().toISOString();
  const batchPayments = data.paymentIds || [];
  for (const pid of batchPayments) {
    const pref = db.collection('payments').doc(pid);
    const ps = await pref.get();
    if (!ps.exists) continue;
    const pdata = ps.data();
    if (pdata.providerPaymentStatus === PROVIDER_PAYMENT_STATUSES.PAID) continue;
    if (pdata.providerPaymentStatus === PROVIDER_PAYMENT_STATUSES.REVERSED) continue;
    await pref.update({
      providerPaymentStatus: PROVIDER_PAYMENT_STATUSES.PAID,
      settlementId,
      settlementReference: data.settlementReference,
      updatedAt: now,
    });
  }
  const patch = {
    status: SETTLEMENT_STATUSES.COMPLETED,
    settledAt: now,
    updatedAt: now,
    settledBy: actorUid || null,
    notes: notes !== undefined ? notes : data.notes,
  };
  await ref.update(patch);
  return { id: settlementId, ...data, ...patch };
}

/**
 * Reconciliation / reversal record when refund occurs after settlement.
 */
async function createReconciliationRecord(db, {
  providerId,
  paymentId,
  appointmentId,
  amount,
  reason,
  actorUid,
}) {
  const now = new Date().toISOString();
  const doc = {
    providerId,
    paymentId: paymentId || null,
    appointmentId: appointmentId || null,
    amount: roundMoney(amount),
    reason: reason || 'post_settlement_refund',
    status: 'OPEN',
    createdAt: now,
    updatedAt: now,
    createdBy: actorUid || null,
  };
  const ref = await db.collection('settlementReconciliations').add(doc);
  return { id: ref.id, ...doc };
}

module.exports = {
  buildSettlementRecord,
  createSettlementDraft,
  calculateOutstandingPayable,
  completeSettlement,
  createReconciliationRecord,
  SETTLEMENT_STATUSES,
  PROVIDER_PAYMENT_STATUSES,
};
