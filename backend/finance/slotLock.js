/**
 * Server-authoritative transactional slot locking.
 *
 * Capacity model: ONE simultaneous consultation per provider.
 * Lock identity: providerId + canonical Colombo slot start (NOT consultationType).
 * consultationType is metadata only and cannot bypass availability.
 */

const { SLOT_HOLD_STATUSES } = require('./constants');
const { normalizeConsultationType } = require('./commercialTerms');
const { providerSlotLockId, canonicalizeSlot } = require('./time');

/** @deprecated use providerSlotLockId — kept for call-site migration */
function slotLockId(providerId, date, time /* consultationType ignored */) {
  return providerSlotLockId(providerId, date, time).lockId;
}

function isHoldActive(data, now = new Date()) {
  if (!data || data.status !== SLOT_HOLD_STATUSES.HOLDING) return false;
  if (!data.expiresAt) return true;
  return new Date(data.expiresAt).getTime() > now.getTime();
}

/**
 * Acquire a hold inside a Firestore transaction.
 * Lazy-expires HOLDING locks whose expiresAt has passed (crashed checkout cannot block forever).
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

  const slot = providerSlotLockId(providerId, date, time);
  const type = normalizeConsultationType(consultationType || 'in_person');
  const id = slot.lockId;
  const ref = db.collection('slotLocks').doc(id);
  const minutes = Math.max(1, Number(holdMinutes) || 10);
  const expiresAt = new Date(now.getTime() + minutes * 60 * 1000).toISOString();

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const data = snap.data();

      // Lazy-expire stale HOLDING locks inside the transaction
      if (data.status === SLOT_HOLD_STATUSES.HOLDING && !isHoldActive(data, now)) {
        tx.set(
          ref,
          {
            ...data,
            status: SLOT_HOLD_STATUSES.EXPIRED,
            updatedAt: now.toISOString(),
            releasedAt: now.toISOString(),
          },
          { merge: true }
        );
        // fall through to re-acquire
      } else if (data.status === SLOT_HOLD_STATUSES.CONSUMED) {
        throw Object.assign(new Error('This time slot is already booked.'), {
          statusCode: 409,
          code: 'SLOT_CONSUMED',
        });
      } else if (isHoldActive(data, now) && data.holdByUserId !== userId) {
        throw Object.assign(new Error('This time slot is temporarily held by another patient.'), {
          statusCode: 409,
          code: 'SLOT_HELD',
        });
      }
      // Same user may refresh an active hold; EXPIRED/RELEASED → re-acquire
    }

    const record = {
      providerId,
      date: slot.date,
      time: slot.time,
      canonicalSlotStart: slot.canonicalSlotStart,
      businessTimezone: slot.businessTimezone,
      consultationType: type, // metadata only
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
    if (data.status === SLOT_HOLD_STATUSES.CONSUMED) return; // idempotent
    if (data.status === SLOT_HOLD_STATUSES.HOLDING && !isHoldActive(data, now)) {
      throw Object.assign(new Error('Slot hold has expired'), {
        statusCode: 409,
        code: 'SLOT_EXPIRED',
      });
    }
    if (data.status !== SLOT_HOLD_STATUSES.HOLDING) {
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
  canonicalizeSlot,
  providerSlotLockId,
  SLOT_HOLD_STATUSES,
};
