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
  providerSlotLockId,
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
  if (f === t) return { ok: true, same: true };

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
    const err = new Error('COMMERCIAL_TERMS_NOT_CONFIGURED');
    err.statusCode = 400;
    err.code = 'COMMERCIAL_TERMS_NOT_CONFIGURED';
    throw err;
  }

  // Validate canonical time before any writes
  const slotMeta = providerSlotLockId(providerId, date, time);

  const snapshot = createFinancialSnapshot(term, {
    discount,
    gatewayConfig,
    termsCopiedAt: new Date().toISOString(),
  });

  const hold = await acquireSlotHold(db, {
    providerId,
    date: slotMeta.date,
    time: slotMeta.time,
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
      date: slotMeta.date,
      time: slotMeta.time,
      canonicalSlotStart: slotMeta.canonicalSlotStart,
      businessTimezone: slotMeta.businessTimezone,
      consultationType: type,
      notes: notes || '',
      status: APPOINTMENT_STATUSES.PAYMENT_PENDING,
      paymentStatus: PAYMENT_STATUSES.PENDING,
      paymentReference: null,
      paymentId: null,
      slotLockId: hold.id,
      financialSnapshot: snapshot,
      consultationFee: snapshot.consultationFee,
      facilityFee: snapshot.facilityFee,
      platformGrossRevenue: snapshot.platformGrossRevenue,
      discount: snapshot.discount,
      customerTotal: snapshot.customerTotal,
      totalAmount: snapshot.customerTotal,
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
      provider: PAYMENT_PROVIDERS.NONE,
      purpose: PAYMENT_PURPOSES.APPOINTMENT,
      appointmentId: apptRef.id,
      resourceId: apptRef.id,
      userId: user.uid,
      providerUserId: providerId,
      snapshot,
      status: PAYMENT_STATUSES.PENDING,
      metadata: { slotLockId: hold.id, appointmentReference },
      idempotencyKey: `appt-hold:${apptRef.id}`,
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
      appointment: {
        id: apptRef.id,
        ...appointmentData,
        paymentId: payment.id,
        paymentReference: payment.paymentReference,
      },
      payment,
      hold,
    };
  } catch (err) {
    await releaseSlotHold(db, hold.id, { reason: 'RELEASED' }).catch(() => {});
    throw err;
  }
}

async function confirmAppointmentPayment(db, { paymentId, providerTransactionId = null }) {
  const payment = await transitionPayment(db, paymentId, PAYMENT_STATUSES.PAID, {
    providerTransactionId: providerTransactionId || null,
  });

  if (!payment.appointmentId) return { payment };

  const apptRef = db.collection('appointments').doc(payment.appointmentId);
  const apptSnap = await apptRef.get();
  if (!apptSnap.exists) return { payment };

  const appt = apptSnap.data();

  // Idempotent: already confirmed
  if (appt.status === APPOINTMENT_STATUSES.CONFIRMED && appt.paymentStatus === PAYMENT_STATUSES.PAID) {
    return {
      payment,
      appointment: { id: payment.appointmentId, ...appt },
      _idempotent: true,
    };
  }

  const check = assertAppointmentStatusTransition(appt.status, APPOINTMENT_STATUSES.CONFIRMED);
  if (!check.ok && !check.same) {
    const err = new Error(check.error);
    err.statusCode = 400;
    throw err;
  }

  const now = new Date().toISOString();
  await apptRef.update({
    status: APPOINTMENT_STATUSES.CONFIRMED,
    paymentStatus: PAYMENT_STATUSES.PAID,
    updatedAt: now,
    confirmedAt: appt.confirmedAt || now,
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
    _idempotent: !!payment._idempotent,
  };
}

async function failOrCancelAppointmentPayment(db, { paymentId, outcome = 'FAILED' }) {
  const to =
    outcome === 'CANCELLED' ? PAYMENT_STATUSES.CANCELLED : PAYMENT_STATUSES.FAILED;
  const payment = await transitionPayment(db, paymentId, to);

  if (payment.appointmentId) {
    const apptRef = db.collection('appointments').doc(payment.appointmentId);
    const apptSnap = await apptRef.get();
    if (apptSnap.exists) {
      const appt = apptSnap.data();
      // Already terminal — idempotent
      if (['CANCELLED', 'EXPIRED'].includes(appt.status) && payment._idempotent) {
        return { payment, _idempotent: true };
      }
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
