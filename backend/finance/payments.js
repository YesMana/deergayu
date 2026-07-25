/**
 * Provider-neutral payments ledger + state machine.
 */

const {
  PAYMENT_STATUSES,
  PAYMENT_TRANSITIONS,
  PAYMENT_PURPOSES,
  PAYMENT_PROVIDERS,
  CURRENCY_LKR,
} = require('./constants');
const { roundMoney } = require('./pricing');
const { nextPaymentReference } = require('./references');

function assertPaymentTransition(from, to) {
  const current = String(from || PAYMENT_STATUSES.CREATED);
  const next = String(to);
  if (current === next) return { ok: true, same: true };
  const allowed = PAYMENT_TRANSITIONS[current];
  if (!allowed) {
    return { ok: false, error: `Unknown payment status: ${current}` };
  }
  if (!allowed.includes(next)) {
    return { ok: false, error: `Invalid payment transition ${current} → ${next}` };
  }
  return { ok: true, same: false };
}

function buildPaymentRecord({
  paymentReference,
  provider = PAYMENT_PROVIDERS.NONE,
  purpose,
  resourceId,
  appointmentId = null,
  orderId = null,
  userId,
  providerUserId = null,
  snapshot,
  status = PAYMENT_STATUSES.CREATED,
  metadata = {},
}) {
  if (!paymentReference) throw new Error('paymentReference required');
  if (!Object.values(PAYMENT_PURPOSES).includes(purpose)) {
    throw new Error(`Invalid purpose: ${purpose}`);
  }
  if (!userId) throw new Error('userId required');
  if (!snapshot) throw new Error('financial snapshot required');

  const now = new Date().toISOString();
  return {
    paymentReference,
    provider,
    providerTransactionId: null,
    purpose,
    resourceId: resourceId || appointmentId || orderId || null,
    appointmentId: appointmentId || null,
    orderId: orderId || null,
    userId,
    providerUserId,
    currency: snapshot.currency || CURRENCY_LKR,
    grossAmount: roundMoney(snapshot.grossAmount),
    consultationAmount: roundMoney(snapshot.consultationFee ?? snapshot.grossAmount),
    facilityFee: roundMoney(snapshot.facilityFee || 0),
    platformFee: roundMoney(snapshot.platformFee || 0),
    discount: roundMoney(snapshot.discount || 0),
    gatewayFee: roundMoney(snapshot.gatewayFee || 0),
    providerPayout: roundMoney(snapshot.providerPayout || 0),
    platformGrossRevenue: roundMoney(snapshot.platformGrossRevenue || 0),
    platformNetRevenue: roundMoney(snapshot.platformNetRevenue || 0),
    status,
    createdAt: now,
    updatedAt: now,
    paidAt: null,
    failedAt: null,
    cancelledAt: null,
    refundedAt: null,
    metadata: metadata || {},
    // Settlement tracking on the payment line
    providerPaymentStatus: 'PENDING',
    financialSnapshot: { ...snapshot },
    snapshotImmutable: false,
  };
}

async function createPaymentDoc(db, fields) {
  const paymentReference = fields.paymentReference || (await nextPaymentReference(db));
  const record = buildPaymentRecord({ ...fields, paymentReference });
  const ref = await db.collection('payments').add(record);
  return { id: ref.id, ...record };
}

function applyStatusSideEffects(status, patch) {
  const now = new Date().toISOString();
  if (status === PAYMENT_STATUSES.PAID) {
    patch.paidAt = now;
    patch.snapshotImmutable = true;
  } else if (status === PAYMENT_STATUSES.FAILED) {
    patch.failedAt = now;
  } else if (status === PAYMENT_STATUSES.CANCELLED) {
    patch.cancelledAt = now;
  } else if (
    status === PAYMENT_STATUSES.REFUNDED ||
    status === PAYMENT_STATUSES.PARTIALLY_REFUNDED
  ) {
    patch.refundedAt = now;
  }
}

async function transitionPayment(db, paymentId, toStatus, extra = {}) {
  const ref = db.collection('payments').doc(paymentId);
  const snap = await ref.get();
  if (!snap.exists) {
    const err = new Error('Payment not found');
    err.statusCode = 404;
    throw err;
  }
  const data = snap.data();
  const check = assertPaymentTransition(data.status, toStatus);
  if (!check.ok) {
    const err = new Error(check.error);
    err.statusCode = 400;
    throw err;
  }
  if (check.same) return { id: paymentId, ...data };

  // Paid snapshot immutability: block financial field edits after PAID
  if (data.snapshotImmutable || data.status === PAYMENT_STATUSES.PAID) {
    const forbidden = [
      'grossAmount',
      'consultationAmount',
      'providerPayout',
      'platformGrossRevenue',
      'platformNetRevenue',
      'facilityFee',
      'platformFee',
      'financialSnapshot',
    ];
    for (const key of forbidden) {
      if (Object.prototype.hasOwnProperty.call(extra, key)) {
        const err = new Error('Paid financial snapshot is immutable');
        err.statusCode = 409;
        throw err;
      }
    }
  }

  const patch = {
    status: toStatus,
    updatedAt: new Date().toISOString(),
    ...extra,
  };
  applyStatusSideEffects(toStatus, patch);
  await ref.update(patch);
  return { id: paymentId, ...data, ...patch };
}

module.exports = {
  assertPaymentTransition,
  buildPaymentRecord,
  createPaymentDoc,
  transitionPayment,
  PAYMENT_STATUSES,
  PAYMENT_TRANSITIONS,
};
