/**
 * P1-B discovery: slugs, availability (Colombo), facilities sanitization,
 * location privacy, affiliation validation, performance helpers.
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
  filterBookableSlots,
  findNextAvailability,
  hasRealSchedule,
  providerHasAvailabilityOnDate,
  consultationTypesFromProfile,
  todayColomboDateString,
  nowColomboTimeString,
  mapPool,
} = require('../availability');
const {
  sanitizeFacilityInput,
  sanitizeAffiliationConsultationTypes,
  toPublicFacility,
  toPublicAffiliation,
  slugifyFacilityName,
  FACILITY_TYPES,
  FACILITY_STATUSES,
  isValidEntityId,
} = require('../facilities');
const { toPublicProvider, locationSummary, PUBLIC_PROFILE_KEYS } = require('../providerPublic');
const { SAFE_PROFILE_DETAIL_FIELDS, PRIVILEGED_USER_FIELDS } = require('../security');
const { DEFAULT_SETTINGS } = require('../platformUtils');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
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
  assert.ok(!isValidSlug('a'));
  assert.ok(!isValidSlug('bad_slug'));
});

test('slug collision suffix pattern is valid', () => {
  const a = slugifyProviderName('Manu', 'doctor');
  assert.strictEqual(a, 'dr-manu');
  assert.ok(isValidSlug(`${a}-2`));
});

test('public GET paths must not call ensureProviderSlug (source audit)', () => {
  const serverSrc = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  function handlerBody(routeLiteral) {
    const start = serverSrc.indexOf(`apiRouter.get('${routeLiteral}'`);
    assert.ok(start > 0, `missing route ${routeLiteral}`);
    const after = serverSrc.slice(start + 10);
    const next = after.search(/\napiRouter\.(get|post|put|patch|delete)\(/);
    return after.slice(0, next > 0 ? next : 4000);
  }
  for (const route of ['/providers', '/providers/:idOrSlug', '/sitemap-data', '/featured-providers']) {
    const body = handlerBody(route);
    assert.ok(!body.includes('ensureProviderSlug'), `${route} must be side-effect free`);
  }
  // Safe write paths remain (approval + profile completion + backfill script)
  assert.ok(serverSrc.includes('slug ensure on approve failed'));
  assert.ok(serverSrc.includes('slug ensure on profile update failed'));
  assert.ok(fs.existsSync(path.join(__dirname, '../scripts/backfill-provider-slugs.js')));
});

test('Colombo weekday for known dates', () => {
  assert.strictEqual(colomboWeekdayName('2026-07-26'), 'Sunday');
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

test('unavailable date yields no slots', () => {
  const schedule = {
    slotDuration: 30,
    workingDays: {
      Monday: { start: '09:00', end: '12:00', active: true },
    },
    unavailableDates: ['2026-07-27'],
  };
  assert.deepStrictEqual(generateDaySlots(schedule, '2026-07-27').allSlots, []);
  assert.ok(!providerHasAvailabilityOnDate(schedule, '2026-07-27', []));
});

test('no fabricated availability without schedule', () => {
  assert.ok(!hasRealSchedule(null));
  assert.ok(!hasRealSchedule({}));
  assert.strictEqual(findNextAvailability(null, {}, '2026-07-26'), null);
});

test('past calendar date has no bookable slots', () => {
  const schedule = {
    slotDuration: 60,
    workingDays: {
      Monday: { start: '09:00', end: '17:00', active: true },
    },
    unavailableDates: [],
  };
  assert.deepStrictEqual(filterBookableSlots('2020-01-06', ['09:00', '10:00']), []);
  assert.ok(!providerHasAvailabilityOnDate(schedule, '2020-01-06', []));
});

test('today filters already-passed times (Asia/Colombo)', () => {
  const today = todayColomboDateString();
  const nowHm = nowColomboTimeString();
  const [h, m] = nowHm.split(':').map(Number);
  const pastMins = Math.max(0, h * 60 + m - 60);
  const futureMins = h * 60 + m + 90;
  const past = `${String(Math.floor(pastMins / 60)).padStart(2, '0')}:${String(pastMins % 60).padStart(2, '0')}`;
  const future = `${String(Math.floor(futureMins / 60)).padStart(2, '0')}:${String(futureMins % 60).padStart(2, '0')}`;
  // If past wraps weirdly near midnight, still assert filter semantics on synthetic clock
  const filtered = filterBookableSlots(today, [past, future], new Date());
  assert.ok(!filtered.includes(past) || past > nowHm); // past slot excluded unless clock edge
  if (future > nowHm) assert.ok(filtered.includes(future));
});

test('next availability skips closed days', () => {
  const schedule = {
    slotDuration: 30,
    workingDays: {
      Wednesday: { start: '09:00', end: '10:00', active: true },
    },
    unavailableDates: [],
  };
  const next = findNextAvailability(schedule, {}, '2026-07-26', 14);
  assert.ok(next);
  assert.strictEqual(next.nextDate, '2026-07-29');
  assert.strictEqual(next.nextTime, '09:00');
});

test('public provider DTO strips telephone/phone/address and omits schedule body', () => {
  const dto = toPublicProvider('uid1', {
    name: 'Manu',
    role: 'doctor',
    status: 'approved',
    publicSlug: 'dr-manu',
    rating: 0,
    profileDetails: {
      telephone: '0711111111',
      phone: '0711111111',
      address: '12 Private Lane',
      city: 'Colombo',
      district: 'Colombo',
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
  assert.ok(!dto.profileDetails.address);
  assert.ok(!PUBLIC_PROFILE_KEYS.includes('address'));
  assert.ok(!dto.profileDetails.schedule);
  assert.strictEqual(dto.profileDetails.hasSchedule, true);
  assert.strictEqual(dto.locationSummary, 'Colombo'); // city/district deduped
  assert.ok(!String(dto.locationSummary).includes('Private'));
  assert.deepStrictEqual(dto.specialties, ['Panchakarma']);
});

test('locationSummary never uses free-text address', () => {
  assert.strictEqual(
    locationSummary({ address: 'Home 123', city: '', district: '', province: '' }),
    ''
  );
  assert.strictEqual(
    locationSummary({ address: 'Home 123', city: 'Kandy', province: 'Central' }),
    'Kandy, Central'
  );
});

test('facility sanitize rejects bad type/status; public only when active', () => {
  const bad = sanitizeFacilityInput({ name: 'X', type: 'mall', status: 'active' });
  assert.strictEqual(bad.type, null);
  const badStatus = sanitizeFacilityInput({ name: 'X', type: 'clinic', status: 'published' });
  assert.strictEqual(badStatus.status, null);
  assert.ok(FACILITY_STATUSES.includes('draft'));
  assert.ok(FACILITY_STATUSES.includes('inactive'));
  const ok = sanitizeFacilityInput({
    name: 'Colombo Ayurveda',
    type: 'ayurveda_centre',
    status: 'active',
    city: 'Colombo',
  });
  assert.strictEqual(ok.type, 'ayurveda_centre');
  assert.ok(FACILITY_TYPES.includes(ok.type));
  assert.strictEqual(toPublicFacility('f1', { ...ok, status: 'draft' }), null);
  assert.strictEqual(toPublicFacility('f1', { ...ok, status: 'inactive' }), null);
  assert.ok(toPublicFacility('f1', { ...ok, status: 'active', slug: slugifyFacilityName(ok.name) }));
});

test('affiliation consultation types enum + public affiliation requires active facility', () => {
  assert.deepStrictEqual(sanitizeAffiliationConsultationTypes(['in_person', 'video']), ['in_person', 'video']);
  assert.strictEqual(sanitizeAffiliationConsultationTypes(['telepathy']), null);
  assert.strictEqual(sanitizeAffiliationConsultationTypes('in_person'), null);
  assert.ok(isValidEntityId('abcdef'));
  assert.ok(!isValidEntityId('x'));
  assert.ok(!isValidEntityId('bad id'));
  assert.strictEqual(
    toPublicAffiliation('a1', { status: 'active', providerId: 'p1', facilityId: 'f1' }, null),
    null
  );
  assert.ok(
    toPublicAffiliation(
      'a1',
      { status: 'active', providerId: 'p1', facilityId: 'f1', consultationTypes: ['in_person'] },
      { id: 'f1', name: 'Clinic', status: 'active', type: 'clinic' }
    )
  );
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

test('list hard-limit and concurrency constants present', () => {
  const serverSrc = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  assert.ok(serverSrc.includes('PROVIDER_LIST_HARD_LIMIT'));
  assert.ok(serverSrc.includes('AVAILABILITY_APPT_CONCURRENCY'));
  assert.ok(serverSrc.includes('mapPool'));
});

(async () => {
  await testAsync('mapPool bounds concurrency', async () => {
    let peak = 0;
    let current = 0;
    const items = Array.from({ length: 20 }, (_, i) => i);
    await mapPool(items, 4, async (n) => {
      current += 1;
      peak = Math.max(peak, current);
      await new Promise((r) => setTimeout(r, 5));
      current -= 1;
      return n * 2;
    });
    assert.ok(peak <= 4, `peak concurrency ${peak} > 4`);
  });

  /**
   * Performance documentation (synthetic — no live Firestore):
   * Date-filter request cost ≈
   *   1× users query (approved providers)
   * + 0–1× facility doc + 0–1× affiliations (if facility filter)
   * + K× appointments queries where K = providers remaining after specialty/type/location/schedule filters
   *   (bounded concurrency 8; result hard-limit 100)
   *
   * Approximate reads for date filter after filters leave N candidates:
   *   N=10  → ~10 appointment queries
   *   N=50  → ~50 appointment queries
   *   N=100 → ~100 appointment queries (hard cap on returned providers)
   *
   * Architecture threshold: when typical date-filter K regularly exceeds ~50,
   * move to precomputed availability / indexing rather than per-request N+1.
   */
  console.log('  ℹ availability query model: 1 provider list + K appointment queries (K after cheap filters; concurrency 8; limit 100)');
  console.log('  ℹ recommend precomputed availability when typical K > ~50');

  console.log('All P1-B discovery unit tests passed.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
