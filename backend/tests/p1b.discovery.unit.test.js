/**
 * P1-B discovery: slugs, availability (Colombo), facilities sanitization.
 */
const assert = require('assert');
const {
  slugifyProviderName,
  isValidSlug,
} = require('../providerSlugs');
const {
  colomboWeekdayName,
  generateDaySlots,
  freeSlots,
  findNextAvailability,
  hasRealSchedule,
  providerHasAvailabilityOnDate,
  consultationTypesFromProfile,
} = require('../availability');
const {
  sanitizeFacilityInput,
  toPublicFacility,
  slugifyFacilityName,
  FACILITY_TYPES,
} = require('../facilities');
const { toPublicProvider } = require('../providerPublic');
const { SAFE_PROFILE_DETAIL_FIELDS, PRIVILEGED_USER_FIELDS } = require('../security');
const { DEFAULT_SETTINGS } = require('../platformUtils');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('P1-B discovery.unit.test.js');

test('slugify lowercase URL-safe with dr- prefix', () => {
  assert.strictEqual(slugifyProviderName('Dr. Manu Silva', 'doctor'), 'dr-manu-silva');
  assert.ok(isValidSlug('dr-manu-silva'));
  assert.ok(!isValidSlug('Dr Manu'));
  assert.ok(!isValidSlug(''));
});

test('slug collision suffix pattern is valid', () => {
  const a = slugifyProviderName('Manu', 'doctor');
  assert.strictEqual(a, 'dr-manu');
  assert.ok(isValidSlug(`${a}-2`));
});

test('Colombo weekday for known dates', () => {
  // 2026-07-26 is Sunday in Asia/Colombo
  assert.strictEqual(colomboWeekdayName('2026-07-26'), 'Sunday');
  // 2026-07-27 Monday
  assert.strictEqual(colomboWeekdayName('2026-07-27'), 'Monday');
});

test('inactive working day yields no slots', () => {
  const schedule = {
    slotDuration: 30,
    workingDays: {
      Monday: { start: '09:00', end: '12:00', active: false },
    },
    unavailableDates: [],
  };
  const gen = generateDaySlots(schedule, '2026-07-27');
  assert.deepStrictEqual(gen.allSlots, []);
});

test('active day generates real slots; booked removed', () => {
  const schedule = {
    slotDuration: 60,
    workingDays: {
      Monday: { start: '09:00', end: '12:00', active: true },
    },
    unavailableDates: [],
  };
  const gen = generateDaySlots(schedule, '2026-07-27');
  assert.deepStrictEqual(gen.allSlots, ['09:00', '10:00', '11:00']);
  assert.deepStrictEqual(freeSlots(gen.allSlots, ['10:00']), ['09:00', '11:00']);
  assert.ok(providerHasAvailabilityOnDate(schedule, '2026-07-27', []));
  assert.ok(!providerHasAvailabilityOnDate(schedule, '2026-07-27', ['09:00', '10:00', '11:00']));
});

test('no fabricated availability without schedule', () => {
  assert.ok(!hasRealSchedule(null));
  assert.ok(!hasRealSchedule({}));
  assert.strictEqual(findNextAvailability(null, {}, '2026-07-26'), null);
});

test('next availability skips closed days', () => {
  const schedule = {
    slotDuration: 30,
    workingDays: {
      Wednesday: { start: '09:00', end: '10:00', active: true },
    },
    unavailableDates: [],
  };
  // Start Sunday 2026-07-26 → next Wed 2026-07-29
  const next = findNextAvailability(schedule, {}, '2026-07-26', 14);
  assert.ok(next);
  assert.strictEqual(next.nextDate, '2026-07-29');
  assert.strictEqual(next.nextTime, '09:00');
});

test('public provider DTO strips telephone/phone and omits schedule body', () => {
  const dto = toPublicProvider('uid1', {
    name: 'Manu',
    role: 'doctor',
    status: 'approved',
    publicSlug: 'dr-manu',
    rating: 0,
    profileDetails: {
      telephone: '0711111111',
      phone: '0711111111',
      specialty: 'Panchakarma',
      schedule: {
        slotDuration: 30,
        workingDays: { Monday: { start: '09:00', end: '17:00', active: true } },
      },
    },
  });
  assert.strictEqual(dto.publicSlug, 'dr-manu');
  assert.ok(!dto.profileDetails.telephone);
  assert.ok(!dto.profileDetails.phone);
  assert.ok(!dto.profileDetails.schedule);
  assert.strictEqual(dto.profileDetails.hasSchedule, true);
  assert.deepStrictEqual(dto.specialties, ['Panchakarma']);
});

test('facility sanitize rejects bad type; public only when active', () => {
  const bad = sanitizeFacilityInput({ name: 'X', type: 'mall', status: 'active' });
  assert.strictEqual(bad.type, null);
  const ok = sanitizeFacilityInput({
    name: 'Colombo Ayurveda',
    type: 'ayurveda_centre',
    status: 'active',
    city: 'Colombo',
  });
  assert.strictEqual(ok.type, 'ayurveda_centre');
  assert.ok(FACILITY_TYPES.includes(ok.type));
  assert.strictEqual(toPublicFacility('f1', { ...ok, status: 'draft' }), null);
  assert.ok(toPublicFacility('f1', { ...ok, status: 'active', slug: slugifyFacilityName(ok.name) }));
});

test('consultation types default in_person', () => {
  assert.deepStrictEqual(consultationTypesFromProfile({}), ['in_person']);
  assert.ok(consultationTypesFromProfile({ offersVideo: true }).includes('video'));
});

test('location fields allowlisted; publicSlug privileged', () => {
  assert.ok(SAFE_PROFILE_DETAIL_FIELDS.includes('district'));
  assert.ok(SAFE_PROFILE_DETAIL_FIELDS.includes('city'));
  assert.ok(PRIVILEGED_USER_FIELDS.includes('publicSlug'));
});

test('appointmentPaymentsEnabled remains false', () => {
  assert.strictEqual(DEFAULT_SETTINGS.appointmentPaymentsEnabled, false);
});

console.log('All P1-B discovery unit tests passed.');
