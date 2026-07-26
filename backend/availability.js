/**
 * P1-B schedule / availability helpers — Asia/Colombo civil dates.
 * Does not invent schedules; empty/missing schedule → no availability.
 */

const { parseCanonicalDate } = require('./finance/time');

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Weekday name for a YYYY-MM-DD civil date in Asia/Colombo (+05:30). */
function colomboWeekdayName(dateStr) {
  const d = parseCanonicalDate(dateStr);
  if (!d.ok) return null;
  // Noon UTC+5:30 on that civil day → unambiguous weekday
  const ms = Date.UTC(d.year, d.month - 1, d.day, 6, 30, 0); // 12:00 Colombo = 06:30 UTC
  const wd = new Date(ms).getUTCDay();
  return WEEKDAYS[wd];
}

function todayColomboDateString(now = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(now);
}

/** Current HH:mm in Asia/Colombo. */
function nowColomboTimeString(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const hour = parts.find((p) => p.type === 'hour')?.value || '00';
  const minute = parts.find((p) => p.type === 'minute')?.value || '00';
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

function addDaysColombo(dateStr, days) {
  const d = parseCanonicalDate(dateStr);
  if (!d.ok) return null;
  const ms = Date.UTC(d.year, d.month - 1, d.day) + days * 86400000;
  const nd = new Date(ms);
  const y = nd.getUTCFullYear();
  const m = String(nd.getUTCMonth() + 1).padStart(2, '0');
  const day = String(nd.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function hasRealSchedule(schedule) {
  if (!schedule || typeof schedule !== 'object') return false;
  const days = schedule.workingDays;
  if (!days || typeof days !== 'object') return false;
  return Object.values(days).some((wd) => {
    if (!wd || typeof wd !== 'object') return false;
    if (wd.active === false) return false;
    return Boolean(wd.start && wd.end);
  });
}

/**
 * Drop slots that are already in the past for "today" (Asia/Colombo).
 * Past calendar dates → empty. Future dates unchanged.
 */
function filterBookableSlots(dateStr, slots, now = new Date()) {
  const parsed = parseCanonicalDate(dateStr);
  if (!parsed.ok) return [];
  const today = todayColomboDateString(now);
  if (parsed.date < today) return [];
  if (parsed.date > today) return (slots || []).slice();
  const nowHm = nowColomboTimeString(now);
  return (slots || []).filter((s) => String(s) > nowHm);
}

/**
 * Generate HH:mm slot strings for a date from schedule.
 * Honors unavailableDates and workingDays[day].active === false.
 */
function generateDaySlots(schedule, dateStr) {
  const parsed = parseCanonicalDate(dateStr);
  if (!parsed.ok) return { ok: false, error: parsed.error, allSlots: [] };
  if (!hasRealSchedule(schedule)) {
    return { ok: true, allSlots: [], reason: 'NO_SCHEDULE' };
  }
  const unavailable = Array.isArray(schedule.unavailableDates) ? schedule.unavailableDates : [];
  if (unavailable.includes(parsed.date)) {
    return { ok: true, allSlots: [], reason: 'UNAVAILABLE_DATE' };
  }
  const dayName = colomboWeekdayName(parsed.date);
  const workingDay = schedule.workingDays?.[dayName];
  if (!workingDay || workingDay.active === false || !workingDay.start || !workingDay.end) {
    return { ok: true, allSlots: [], reason: 'CLOSED' };
  }
  const [startH, startM] = String(workingDay.start).split(':').map(Number);
  const [endH, endM] = String(workingDay.end).split(':').map(Number);
  if (![startH, startM, endH, endM].every((n) => Number.isFinite(n))) {
    return { ok: true, allSlots: [], reason: 'INVALID_HOURS' };
  }
  let currentMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;
  const slotDuration = Number(schedule.slotDuration) || 30;
  if (slotDuration < 5 || slotDuration > 240) {
    return { ok: true, allSlots: [], reason: 'INVALID_DURATION' };
  }
  const allSlots = [];
  while (currentMins + slotDuration <= endMins) {
    const h = Math.floor(currentMins / 60).toString().padStart(2, '0');
    const m = (currentMins % 60).toString().padStart(2, '0');
    allSlots.push(`${h}:${m}`);
    currentMins += slotDuration;
  }
  return { ok: true, allSlots, dayName };
}

function freeSlots(allSlots, bookedSlots = []) {
  const booked = new Set((bookedSlots || []).map(String));
  return (allSlots || []).filter((s) => !booked.has(s));
}

/**
 * Next open slot within horizonDays from fromDate (inclusive), using real schedule.
 * bookedByDate: { 'YYYY-MM-DD': ['09:00', ...] }
 * For "today", past times are excluded.
 */
function findNextAvailability(schedule, bookedByDate = {}, fromDate, horizonDays = 21, now = new Date()) {
  if (!hasRealSchedule(schedule)) return null;
  let cursor = fromDate || todayColomboDateString(now);
  for (let i = 0; i < horizonDays; i += 1) {
    const gen = generateDaySlots(schedule, cursor);
    const free = filterBookableSlots(cursor, freeSlots(gen.allSlots, bookedByDate[cursor] || []), now);
    if (free.length) {
      return {
        nextDate: cursor,
        nextTime: free[0],
        freeCount: free.length,
        sample: free.slice(0, 4),
      };
    }
    cursor = addDaysColombo(cursor, 1);
    if (!cursor) break;
  }
  return null;
}

function providerHasAvailabilityOnDate(schedule, dateStr, bookedSlots = [], now = new Date()) {
  const gen = generateDaySlots(schedule, dateStr);
  const free = filterBookableSlots(dateStr, freeSlots(gen.allSlots, bookedSlots), now);
  return free.length > 0;
}

/**
 * Consultation types from profile flags — same semantics as frontend.
 * Never invents video/audio. Legacy profiles without explicit flags → in_person only.
 * When provider/admin set explicit flags, only selected types are returned (may be empty).
 */
function consultationTypesFromProfile(profileDetails = {}) {
  const pd = profileDetails || {};
  const modes = Array.isArray(pd.consultationModes) ? pd.consultationModes : [];
  const explicit =
    typeof pd.offersInPerson === 'boolean' ||
    pd.offersVideo === true ||
    pd.offersAudio === true ||
    pd.videoConsultation === true ||
    modes.length > 0;
  const types = [];
  if (explicit) {
    if (pd.offersInPerson === true || modes.includes('in_person')) types.push('in_person');
    if (pd.offersVideo === true || pd.videoConsultation === true || modes.includes('video')) {
      types.push('video');
    }
    if (pd.offersAudio === true || modes.includes('audio')) types.push('audio');
    return types;
  }
  return ['in_person'];
}

function specialtiesFromProfile(profileDetails = {}) {
  const { publicSpecialtiesFromProfile } = require('./providerProfile');
  return publicSpecialtiesFromProfile(profileDetails || {});
}

/** Run async mapper with bounded concurrency. */
async function mapPool(items, concurrency, mapper) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i;
      i += 1;
      results[idx] = await mapper(items[idx], idx);
    }
  }
  const n = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

module.exports = {
  WEEKDAYS,
  colomboWeekdayName,
  todayColomboDateString,
  nowColomboTimeString,
  addDaysColombo,
  hasRealSchedule,
  generateDaySlots,
  freeSlots,
  filterBookableSlots,
  findNextAvailability,
  providerHasAvailabilityOnDate,
  consultationTypesFromProfile,
  specialtiesFromProfile,
  mapPool,
};
