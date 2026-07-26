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
  // Format now as YYYY-MM-DD in Asia/Colombo
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA → YYYY-MM-DD
  return fmt.format(now);
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
 */
function findNextAvailability(schedule, bookedByDate = {}, fromDate, horizonDays = 21) {
  if (!hasRealSchedule(schedule)) return null;
  let cursor = fromDate || todayColomboDateString();
  for (let i = 0; i < horizonDays; i += 1) {
    const gen = generateDaySlots(schedule, cursor);
    const free = freeSlots(gen.allSlots, bookedByDate[cursor] || []);
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

function providerHasAvailabilityOnDate(schedule, dateStr, bookedSlots = []) {
  const gen = generateDaySlots(schedule, dateStr);
  return freeSlots(gen.allSlots, bookedSlots).length > 0;
}

/** Consultation types from profile flags — same semantics as frontend. */
function consultationTypesFromProfile(profileDetails = {}) {
  const pd = profileDetails || {};
  const types = [];
  if (pd.offersInPerson !== false) types.push('in_person');
  if (pd.offersVideo === true || pd.videoConsultation === true || pd.consultationModes?.includes?.('video')) {
    types.push('video');
  }
  if (pd.offersAudio === true || pd.consultationModes?.includes?.('audio')) {
    types.push('audio');
  }
  if (!types.length) types.push('in_person');
  return types;
}

function specialtiesFromProfile(profileDetails = {}) {
  const raw = profileDetails?.specialty;
  let list = [];
  if (Array.isArray(raw)) list = raw.map(String);
  else if (typeof raw === 'string' && raw.trim()) {
    list = raw.split(/[,|/]/).map((x) => x.trim());
  }
  const seen = new Set();
  return list
    .map((s) => String(s).trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .filter((s) => {
      const k = s.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

module.exports = {
  WEEKDAYS,
  colomboWeekdayName,
  todayColomboDateString,
  addDaysColombo,
  hasRealSchedule,
  generateDaySlots,
  freeSlots,
  findNextAvailability,
  providerHasAvailabilityOnDate,
  consultationTypesFromProfile,
  specialtiesFromProfile,
};
