/**
 * Server-authoritative transactional slot locking.
 * Deterministic doc id: providerId_date_time_consultationType
 */

const { SLOT_HOLD_STATUSES } = require('./constants');
const { normalizeConsultationType } = require('./commercialTerms');

function slotLockId(providerId, date, time, consultationType) {
  const type = normalizeConsultationType(consultationType);
  const safeTime = String(time || '').replace(/:/g, '');
  return `${providerId}_${date}_${safeTime}_${type}`;
}

function isHoldActive(data, now = new Date()) {
  if (!data || data.status !== SLOT_HOLD_STATUSES.HOLDING) return false;
  if (!data.expiresAt) return true;
  return new Date(data.expiresAt).getTime() > now.getTime();
}

/**
 * Acquire a hold inside a Firestore transaction.
 * Releases expired holds automatically.
 */
async function acquireSlotHold(db, {
  providerId,
  date,
  time,
  consultationType,
  userId,
  holdMinutes = 10,
  appointmentId = null,
  paymentId = null,
  now = new Date(),
}) {
  if (!providerId || !date || !time || !userId) {
    throw Object.assign(new Error('providerId, date, time, userId required'), { statusCode: 400 });
  }
  const type = normalizeConsultationType(consultationType || 'in_person');
  const id = slotLockId(providerId, date, time, type);
  const ref = db.collection('slotLocks').doc(id);
  const minutes = Math.max(1, Number(holdMinutes) || 10);
  const expiresAt = new Date(now.getTime() + minutes * 60 * 1000).toISOString();

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const data = snap.data();
      if (data.status === SLOT_HOLD_STATUSES.CONSUMED) {
        throw Object.assign(new Error('This time slot is already booked.'), { statusCode: 409 });
      }
      if (isHoldActive(data, now) && data.holdByUserId !== userId) {
        throw Object.assign(new Error('This time slot is temporarily held by another patient.'), {
          statusCode: 409,
        });
      }
      // Same user can refresh hold; expired → re-acquire
    }

    const record = {
      providerId,
      date,
      time,
      consultationType: type,
      status: SLOT_HOLD_STATUSES.HOLDING,
      holdByUserId: userId,
      appointmentId: appointmentId || null,
      paymentId: paymentId || null,
      expiresAt,
      holdMinutes: minutes,
      createdAt: snap.exists ? snap.data().createdAt || now.toISOString() : now.toISOString(),
      updatedAt: now.toISOString(),
    };
    tx.set(ref, record, { merge: true });
    return { id, ...record };
  });

  return result;
}

async function releaseSlotHold(db, lockId, { reason = 'RELEASED', now = new Date() } = {}) {
  const ref = db.collection('slotLocks').doc(lockId);
  const status =
    reason === 'EXPIRED' ? SLOT_HOLD_STATUSES.EXPIRED : SLOT_HOLD_STATUSES.RELEASED;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const data = snap.data();
    if (data.status === SLOT_HOLD_STATUSES.CONSUMED) return;
    tx.update(ref, {
      status,
      updatedAt: now.toISOString(),
      releasedAt: now.toISOString(),
    });
  });
  return { id: lockId, status };
}

async function consumeSlotHold(db, lockId, { appointmentId, paymentId, now = new Date() } = {}) {
  const ref = db.collection('slotLocks').doc(lockId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw Object.assign(new Error('Slot hold not found'), { statusCode: 404 });
    }
    const data = snap.data();
    if (data.status === SLOT_HOLD_STATUSES.CONSUMED) return;
    if (!isHoldActive(data, now) && data.status === SLOT_HOLD_STATUSES.HOLDING) {
      throw Object.assign(new Error('Slot hold has expired'), { statusCode: 409 });
    }
    if (data.status !== SLOT_HOLD_STATUSES.HOLDING && data.status !== SLOT_HOLD_STATUSES.CONSUMED) {
      throw Object.assign(new Error(`Cannot consume slot in status ${data.status}`), {
        statusCode: 409,
      });
    }
    tx.update(ref, {
      status: SLOT_HOLD_STATUSES.CONSUMED,
      appointmentId: appointmentId || data.appointmentId || null,
      paymentId: paymentId || data.paymentId || null,
      updatedAt: now.toISOString(),
      consumedAt: now.toISOString(),
    });
  });
  return { id: lockId, status: SLOT_HOLD_STATUSES.CONSUMED };
}

/** Lazy expiry helper for availability reads. */
async function expireSlotHoldIfNeeded(db, lockDoc, now = new Date()) {
  if (!lockDoc?.exists && !lockDoc?.data) return null;
  const data = typeof lockDoc.data === 'function' ? lockDoc.data() : lockDoc;
  const id = lockDoc.id || data.id;
  if (data.status === SLOT_HOLD_STATUSES.HOLDING && !isHoldActive(data, now)) {
    await releaseSlotHold(db, id, { reason: 'EXPIRED', now });
    return { ...data, status: SLOT_HOLD_STATUSES.EXPIRED };
  }
  return data;
}

module.exports = {
  slotLockId,
  isHoldActive,
  acquireSlotHold,
  releaseSlotHold,
  consumeSlotHold,
  expireSlotHoldIfNeeded,
  SLOT_HOLD_STATUSES,
};
