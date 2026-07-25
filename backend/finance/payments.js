/**
 * Provider-neutral payments ledger + state machine.
 *
 * Idempotency foundations (pre-Dialog Pay):
 * - PAID → PAID is a no-op (duplicate callback safe)
 * - PAID cannot regress to PENDING/PROCESSING
 * - providerPayableCredited is set once on first PAID; never double-credited
 * - refundApplied / refundLedgerKey prevents double refund ledger application
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
  idempotencyKey = null,
}) {
  if (!paymentReference) throw new Error('paymentReference required');
  if (!Object.values(PAYMENT_PURPOSES).includes(purpose)) {
    throw new Error(`Invalid purpose: ${purpose}`);
  }
  if (!userId) throw new Error('userId required');
  if (!snapshot) throw new Error('financial snapshot required');

  const platformGross = roundMoney(snapshot.platformGrossRevenue);
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
    grossAmount: roundMoney(snapshot.customerTotal ?? snapshot.grossAmount),
    customerTotal: roundMoney(snapshot.customerTotal ?? snapshot.grossAmount),
    consultationAmount: roundMoney(snapshot.consultationFee ?? snapshot.grossAmount),
    facilityFee: roundMoney(snapshot.facilityFee || 0),
    /** Always equals platformGrossRevenue (schema compat — not a separate concept) */
    platformFee: platformGross,
    discount: roundMoney(snapshot.discount || 0),
    gatewayFee: roundMoney(snapshot.gatewayFee || 0),
    providerPayout: roundMoney(snapshot.providerPayout || 0),
    platformGrossRevenue: platformGross,
    platformNetRevenue: roundMoney(snapshot.platformNetRevenue || 0),
    status,
    createdAt: now,
    updatedAt: now,
    paidAt: null,
    failedAt: null,
    cancelledAt: null,
    refundedAt: null,
    metadata: metadata || {},
    idempotencyKey: idempotencyKey || null,
    providerPaymentStatus: 'PENDING',
    /** Set true exactly once when payment first becomes PAID — blocks double settlement credit */
    providerPayableCredited: false,
    /** Set true when a refund ledger adjustment has been applied */
    refundApplied: false,
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

function applyStatusSideEffects(status, patch, previous) {
  const now = new Date().toISOString();
  if (status === PAYMENT_STATUSES.PAID) {
    patch.paidAt = previous.paidAt || now;
    patch.snapshotImmutable = true;
    // Credit provider payable tracking once
    if (!previous.providerPayableCredited) {
      patch.providerPayableCredited = true;
    }
  } else if (status === PAYMENT_STATUSES.FAILED) {
    patch.failedAt = previous.failedAt || now;
  } else if (status === PAYMENT_STATUSES.CANCELLED) {
    patch.cancelledAt = previous.cancelledAt || now;
  } else if (
    status === PAYMENT_STATUSES.REFUNDED ||
    status === PAYMENT_STATUSES.PARTIALLY_REFUNDED
  ) {
    patch.refundedAt = previous.refundedAt || now;
  }
}

async function transitionPayment(db, paymentId, toStatus, extra = {}) {
  const ref = db.collection('payments').doc(paymentId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
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
      err.code = 'INVALID_PAYMENT_TRANSITION';
      throw err;
    }
    // Idempotent: same status → return existing (duplicate webhook safe)
    if (check.same) {
      return { id: paymentId, ...data, _idempotent: true };
    }

    if (data.snapshotImmutable || data.status === PAYMENT_STATUSES.PAID) {
      const forbidden = [
        'grossAmount',
        'customerTotal',
        'consultationAmount',
        'providerPayout',
        'platformGrossRevenue',
        'platformNetRevenue',
        'facilityFee',
        'platformFee',
        'financialSnapshot',
        'providerPayableCredited',
      ];
      for (const key of forbidden) {
        if (Object.prototype.hasOwnProperty.call(extra, key)) {
          const err = new Error('Paid financial snapshot is immutable');
          err.statusCode = 409;
          err.code = 'SNAPSHOT_IMMUTABLE';
          throw err;
        }
      }
    }

    const patch = {
      status: toStatus,
      updatedAt: new Date().toISOString(),
      ...extra,
    };
    // Never allow clearing providerPayableCredited once set
    if (data.providerPayableCredited) {
      patch.providerPayableCredited = true;
    }
    applyStatusSideEffects(toStatus, patch, data);
    tx.update(ref, patch);
    return { id: paymentId, ...data, ...patch, _idempotent: false };
  });
}

/**
 * Apply refund ledger once. Second call with same outcome is rejected / no-op.
 */
async function applyRefundLedger(db, paymentId, impact, { force = false } = {}) {
  const ref = db.collection('payments').doc(paymentId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      const err = new Error('Payment not found');
      err.statusCode = 404;
      throw err;
    }
    const data = snap.data();
    if (data.refundApplied && !force) {
      return { id: paymentId, ...data, _idempotent: true, duplicateRefundBlocked: true };
    }
    if (data.status !== PAYMENT_STATUSES.PAID && data.status !== PAYMENT_STATUSES.PARTIALLY_REFUNDED) {
      const err = new Error('Only PAID payments can be refunded');
      err.statusCode = 400;
      throw err;
    }

    const nextStatus =
      impact.refundType === 'FULL_REFUND'
        ? PAYMENT_STATUSES.REFUNDED
        : impact.refundType === 'NO_REFUND'
          ? data.status
          : PAYMENT_STATUSES.PARTIALLY_REFUNDED;

    if (impact.refundType !== 'NO_REFUND') {
      const check = assertPaymentTransition(data.status, nextStatus);
      if (!check.ok && !check.same) {
        // REFUNDED → REFUNDED
        if (data.status === nextStatus) {
          return { id: paymentId, ...data, _idempotent: true, duplicateRefundBlocked: true };
        }
        const err = new Error(check.error);
        err.statusCode = 400;
        throw err;
      }
    }

    const now = new Date().toISOString();
    const patch = {
      updatedAt: now,
      lastRefund: impact,
      providerPaymentStatus: impact.nextProviderPaymentStatus,
      refundApplied: impact.refundType !== 'NO_REFUND' ? true : data.refundApplied,
    };
    if (impact.refundType !== 'NO_REFUND') {
      patch.status = nextStatus;
      patch.refundedAt = now;
    }
    tx.update(ref, patch);
    return { id: paymentId, ...data, ...patch, _idempotent: false };
  });
}

module.exports = {
  assertPaymentTransition,
  buildPaymentRecord,
  createPaymentDoc,
  transitionPayment,
  applyRefundLedger,
  PAYMENT_STATUSES,
  PAYMENT_TRANSITIONS,
};
