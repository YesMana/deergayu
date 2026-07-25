/**
 * Canonical appointment slot time helpers.
 *
 * Authoritative representation:
 *   date: "YYYY-MM-DD" (calendar date in Asia/Colombo business timezone)
 *   time: "HH:mm"      (24-hour clock, Asia/Colombo)
 *   canonicalSlotStart: "YYYY-MM-DDTHH:mm:00+05:30"
 *   slotLockId: "{providerId}_{YYYYMMDD}_{HHmm}"  (capacity = 1 per provider instant)
 *
 * Client display strings such as "10:00 AM" / locale variants are REJECTED.
 * Browser timezone cannot invent a second lock for the same Colombo slot.
 */

const BUSINESS_TZ_OFFSET = '+05:30'; // Asia/Colombo (no DST)

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseCanonicalDate(date) {
  const m = DATE_RE.exec(String(date || '').trim());
  if (!m) {
    return { ok: false, error: 'date must be YYYY-MM-DD' };
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  // Validate real calendar date via UTC components (date parts are civil Colombo date)
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return { ok: false, error: 'date is not a valid calendar day' };
  }
  return { ok: true, date: `${m[1]}-${m[2]}-${m[3]}`, year, month, day };
}

function parseCanonicalTime(time) {
  const raw = String(time || '').trim();
  // Reject AM/PM and other locale forms explicitly
  if (/[ap]\.?m\.?/i.test(raw) || raw.includes(' ')) {
    return { ok: false, error: 'time must be 24-hour HH:mm (not AM/PM)' };
  }
  const m = TIME_RE.exec(raw);
  if (!m) {
    return { ok: false, error: 'time must be HH:mm (24-hour)' };
  }
  return { ok: true, time: `${m[1]}:${m[2]}`, hour: Number(m[1]), minute: Number(m[2]) };
}

/**
 * Validate and return canonical slot identity fields.
 */
function canonicalizeSlot(date, time) {
  const d = parseCanonicalDate(date);
  if (!d.ok) return d;
  const t = parseCanonicalTime(time);
  if (!t.ok) return t;

  const canonicalSlotStart = `${d.date}T${t.time}:00${BUSINESS_TZ_OFFSET}`;
  const dateCompact = d.date.replace(/-/g, '');
  const timeCompact = t.time.replace(':', '');

  return {
    ok: true,
    date: d.date,
    time: t.time,
    canonicalSlotStart,
    dateCompact,
    timeCompact,
    businessTimezone: 'Asia/Colombo',
    utcOffset: BUSINESS_TZ_OFFSET,
  };
}

/** Capacity-1 lock id: provider + canonical Colombo slot start (no consultationType). */
function providerSlotLockId(providerId, date, time) {
  const c = canonicalizeSlot(date, time);
  if (!c.ok) {
    const err = new Error(c.error);
    err.statusCode = 400;
    err.code = 'INVALID_SLOT_TIME';
    throw err;
  }
  if (!providerId) {
    const err = new Error('providerId required');
    err.statusCode = 400;
    throw err;
  }
  return {
    lockId: `${providerId}_${c.dateCompact}_${c.timeCompact}`,
    ...c,
  };
}

module.exports = {
  BUSINESS_TZ_OFFSET,
  parseCanonicalDate,
  parseCanonicalTime,
  canonicalizeSlot,
  providerSlotLockId,
};
