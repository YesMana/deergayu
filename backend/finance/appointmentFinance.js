/**
 * Payment-capable appointment orchestration (behind appointmentPaymentsEnabled).
 * Legacy POST /api/appointments remains unchanged when the flag is false.
 */

const {
  APPOINTMENT_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_PURPOSES,
  PAYMENT_PROVIDERS,
  PROVIDER_PAYMENT_STATUSES,
  LEGACY_APPOINTMENT_STATUSES,
  PAID_APPOINTMENT_STATUSES,
} = require('./constants');
const { getActiveTermForType, normalizeConsultationType } = require('./commercialTerms');
const { createFinancialSnapshot } = require('./pricing');
const { nextAppointmentReference } = require('./references');
const { createPaymentDoc, transitionPayment } = require('./payments');
const {
  acquireSlotHold,
  releaseSlotHold,
  consumeSlotHold,
  slotLockId,
} = require('./slotLock');

function isLegacyAppointmentStatus(status) {
  return LEGACY_APPOINTMENT_STATUSES.includes(String(status));
}

function isPaidLifecycleStatus(status) {
  return PAID_APPOINTMENT_STATUSES.includes(String(status));
}

function assertAppointmentStatusTransition(from, to) {
  const f = String(from);
  const t = String(to);
  if (f === t) return { ok: true };

  // Legacy path — keep permissive for old admin/vendor flows
  if (isLegacyAppointmentStatus(f) && (isLegacyAppointmentStatus(t) || t === 'confirmed')) {
    return { ok: true, legacy: true };
  }

  const allowed = {
    PAYMENT_PENDING: ['CONFIRMED', 'CANCELLED', 'EXPIRED'],
    CONFIRMED: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
    COMPLETED: [],
    CANCELLED: [],
    NO_SHOW: [],
    EXPIRED: [],
  };

  if (!allowed[f]) return { ok: false, error: `Unknown appointment status: ${f}` };
  if (!allowed[f].includes(t)) {
    return { ok: false, error: `Invalid appointment transition ${f} → ${t}` };
  }
  return { ok: true };
}

/**
 * Create hold + appointment (PAYMENT_PENDING) + payment (CREATED/PENDING) with snapshot.
 * Requires appointmentPaymentsEnabled === true at the route layer.
 */
async function createPaymentPendingAppointment(db, {
  user,
  providerId,
  providerName,
  date,
  time,
  consultationType,
  notes,
  phone,
  customerName,
  discount = 0,
  slotHoldMinutes = 10,
  gatewayConfig = {},
}) {
  const type = normalizeConsultationType(consultationType || 'in_person');
  const term = await getActiveTermForType(db, providerId, type);
  if (!term) {
    const err = new Error('No active commercial terms for this provider/consultation type');
    err.statusCode = 400;
    throw err;
  }

  const snapshot = createFinancialSnapshot(term, {
    discount,
    gatewayConfig,
    termsCopiedAt: new Date().toISOString(),
  });

  const hold = await acquireSlotHold(db, {
    providerId,
    date,
    time,
    consultationType: type,
    userId: user.uid,
    holdMinutes: slotHoldMinutes,
  });

  try {
    const appointmentReference = await nextAppointmentReference(db);
    const now = new Date().toISOString();

    const appointmentData = {
      appointmentReference,
      customerId: user.uid,
      customerName: customerName || user.email,
      customerEmail: user.email,
      customerPhone: phone || '',
      providerId,
      providerName: providerName || '',
      date,
      time,
      consultationType: type,
      notes: notes || '',
      status: APPOINTMENT_STATUSES.PAYMENT_PENDING,
      paymentStatus: PAYMENT_STATUSES.PENDING,
      paymentReference: null,
      paymentId: null,
      slotLockId: hold.id,
      // Financial snapshot (immutable after PAID except refund/reconciliation)
      financialSnapshot: snapshot,
      consultationFee: snapshot.consultationFee,
      facilityFee: snapshot.facilityFee,
      platformFee: snapshot.platformFee,
      discount: snapshot.discount,
      totalAmount: snapshot.grossAmount,
      providerPayout: snapshot.providerPayout,
      gatewayFee: snapshot.gatewayFee,
      platformNetRevenue: snapshot.platformNetRevenue,
      providerPaymentStatus: PROVIDER_PAYMENT_STATUSES.PENDING,
      termsVersion: snapshot.termsVersion,
      createdAt: now,
      updatedAt: now,
    };

    const apptRef = await db.collection('appointments').add(appointmentData);

    const payment = await createPaymentDoc(db, {
      provider: PAYMENT_PROVIDERS.NONE, // Dialog Pay later
      purpose: PAYMENT_PURPOSES.APPOINTMENT,
      appointmentId: apptRef.id,
      resourceId: apptRef.id,
      userId: user.uid,
      providerUserId: providerId,
      snapshot,
      status: PAYMENT_STATUSES.PENDING,
      metadata: { slotLockId: hold.id, appointmentReference },
    });

    await apptRef.update({
      paymentId: payment.id,
      paymentReference: payment.paymentReference,
      updatedAt: new Date().toISOString(),
    });

    await db.collection('slotLocks').doc(hold.id).set(
      { appointmentId: apptRef.id, paymentId: payment.id, updatedAt: new Date().toISOString() },
      { merge: true }
    );

    return {
      appointment: { id: apptRef.id, ...appointmentData, paymentId: payment.id, paymentReference: payment.paymentReference },
      payment,
      hold,
    };
  } catch (err) {
    await releaseSlotHold(db, hold.id, { reason: 'RELEASED' }).catch(() => {});
    throw err;
  }
}

/**
 * Mark payment PAID → confirm appointment → consume hold.
 */
async function confirmAppointmentPayment(db, { paymentId, providerTransactionId = null }) {
  const payment = await transitionPayment(db, paymentId, PAYMENT_STATUSES.PAID, {
    providerTransactionId,
  });

  if (!payment.appointmentId) return { payment };

  const apptRef = db.collection('appointments').doc(payment.appointmentId);
  const apptSnap = await apptRef.get();
  if (!apptSnap.exists) return { payment };

  const appt = apptSnap.data();
  const check = assertAppointmentStatusTransition(appt.status, APPOINTMENT_STATUSES.CONFIRMED);
  if (!check.ok && appt.status !== APPOINTMENT_STATUSES.CONFIRMED) {
    const err = new Error(check.error);
    err.statusCode = 400;
    throw err;
  }

  const now = new Date().toISOString();
  await apptRef.update({
    status: APPOINTMENT_STATUSES.CONFIRMED,
    paymentStatus: PAYMENT_STATUSES.PAID,
    updatedAt: now,
    confirmedAt: now,
  });

  if (appt.slotLockId) {
    await consumeSlotHold(db, appt.slotLockId, {
      appointmentId: payment.appointmentId,
      paymentId,
    });
  }

  return {
    payment,
    appointment: { id: payment.appointmentId, ...appt, status: APPOINTMENT_STATUSES.CONFIRMED },
  };
}

/**
 * Payment failure / cancel → release slot, expire/cancel appointment, no provider payable.
 */
async function failOrCancelAppointmentPayment(db, { paymentId, outcome = 'FAILED' }) {
  const to =
    outcome === 'CANCELLED' ? PAYMENT_STATUSES.CANCELLED : PAYMENT_STATUSES.FAILED;
  const payment = await transitionPayment(db, paymentId, to);

  if (payment.appointmentId) {
    const apptRef = db.collection('appointments').doc(payment.appointmentId);
    const apptSnap = await apptRef.get();
    if (apptSnap.exists) {
      const appt = apptSnap.data();
      const now = new Date().toISOString();
      const nextStatus =
        outcome === 'CANCELLED' ? APPOINTMENT_STATUSES.CANCELLED : APPOINTMENT_STATUSES.EXPIRED;
      await apptRef.update({
        status: nextStatus,
        paymentStatus: to,
        providerPaymentStatus: PROVIDER_PAYMENT_STATUSES.REVERSED,
        providerPayout: 0,
        updatedAt: now,
      });
      if (appt.slotLockId) {
        await releaseSlotHold(db, appt.slotLockId, {
          reason: outcome === 'CANCELLED' ? 'RELEASED' : 'EXPIRED',
        });
      }
    }
  }

  return { payment };
}

module.exports = {
  isLegacyAppointmentStatus,
  isPaidLifecycleStatus,
  assertAppointmentStatusTransition,
  createPaymentPendingAppointment,
  confirmAppointmentPayment,
  failOrCancelAppointmentPayment,
  slotLockId,
};
