/**
 * P1-C provider profile quality unit tests.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  looksLikeSuspiciousSpecialty,
  publicSpecialtiesFromProfile,
  normalizeQualifications,
  normalizeLanguages,
  computeProfileCompletion,
  resolveSpecialtyCatalog,
} = require('../providerProfile');
const { toPublicProvider } = require('../providerPublic');
const { consultationTypesFromProfile } = require('../availability');
const { sanitizeSelfProfileUpdate, SAFE_PROFILE_DETAIL_FIELDS } = require('../security');
const { DEFAULT_SETTINGS } = require('../platformUtils');

describe('suspicious specialty heuristic', () => {
  it('flags known junk like hgfh without inventing replacements', () => {
    assert.equal(looksLikeSuspiciousSpecialty('hgfh'), true);
    assert.equal(looksLikeSuspiciousSpecialty('fghf'), true);
    assert.equal(looksLikeSuspiciousSpecialty('test'), true);
    assert.equal(looksLikeSuspiciousSpecialty('Panchakarma'), false);
    assert.equal(looksLikeSuspiciousSpecialty('Weight management'), false);
  });

  it('omits suspicious values from public specialties', () => {
    assert.deepEqual(publicSpecialtiesFromProfile({ specialty: 'hgfh' }), []);
    assert.deepEqual(
      publicSpecialtiesFromProfile({ specialty: 'Panchakarma, hgfh' }),
      ['Panchakarma']
    );
  });
});

describe('qualifications & languages', () => {
  it('normalizes structured qualifications without requiring year', () => {
    const q = normalizeQualifications([
      { qualificationName: 'BAMS', institution: 'Gampaha', country: 'Sri Lanka' },
      'Diploma in Ayurveda',
    ]);
    assert.equal(q.length, 2);
    assert.equal(q[0].qualificationName, 'BAMS');
    assert.equal(q[0].year, undefined);
    assert.equal(q[1].qualificationName, 'Diploma in Ayurveda');
  });

  it('normalizes languages', () => {
    assert.deepEqual(normalizeLanguages('Sinhala, Tamil / English'), [
      'Sinhala',
      'Tamil',
      'English',
    ]);
  });
});

describe('consultation types', () => {
  it('does not invent video; legacy defaults to in_person only', () => {
    assert.deepEqual(consultationTypesFromProfile({}), ['in_person']);
    assert.deepEqual(
      consultationTypesFromProfile({ offersVideo: true, offersInPerson: false }),
      ['video']
    );
    assert.deepEqual(
      consultationTypesFromProfile({
        offersInPerson: true,
        offersVideo: false,
        offersAudio: true,
      }),
      ['in_person', 'audio']
    );
  });
});

describe('profile completion', () => {
  it('does not fake completion for empty Manu-like profile', () => {
    const c = computeProfileCompletion({
      name: 'Manu',
      profileDetails: {
        doctorType: 'traditional',
        specialty: 'hgfh',
        address: 'fghf',
        schedule: {
          slotDuration: 30,
          workingDays: {
            Monday: { start: '09:00', end: '17:00', active: true },
          },
        },
      },
    });
    assert.ok(c.percent < 100);
    assert.ok(c.suspiciousSpecialties.includes('hgfh'));
    assert.ok(c.missingRequired.some((m) => m.key === 'specialty'));
    assert.ok(c.missingRequired.some((m) => m.key === 'bio'));
    assert.ok(c.missingRequired.some((m) => m.key === 'consultationTypes'));
    assert.ok(c.missingRequired.some((m) => m.key === 'location'));
  });

  it('reaches 100% only when required launch fields are real', () => {
    const c = computeProfileCompletion({
      name: 'Dr Example',
      profileDetails: {
        title: 'Ayurvedic Physician',
        specialty: ['Panchakarma', 'Digestive health'],
        bio: 'Experienced Ayurvedic physician focusing on digestive health and Panchakarma.',
        offersInPerson: true,
        city: 'Colombo',
        district: 'Colombo',
        schedule: {
          slotDuration: 30,
          workingDays: { Monday: { start: '09:00', end: '17:00', active: true } },
        },
      },
    });
    assert.equal(c.percent, 100);
    assert.equal(c.missingRequired.length, 0);
  });
});

describe('public provider DTO', () => {
  it('hides junk specialty and private address', () => {
    const dto = toPublicProvider('uid1', {
      name: 'Manu',
      role: 'doctor',
      status: 'approved',
      profileDetails: {
        specialty: 'hgfh',
        address: 'fghf',
        telephone: '0771234567',
        city: '',
        district: '',
        bio: '',
      },
    });
    assert.deepEqual(dto.specialties, []);
    assert.equal(dto.profileDetails.specialty, undefined);
    assert.equal(dto.profileDetails.address, undefined);
    assert.equal(dto.profileDetails.telephone, undefined);
    assert.equal(dto.locationSummary, null);
  });

  it('exposes structured specialties and location', () => {
    const dto = toPublicProvider('uid2', {
      name: 'P.H.S.Gaya',
      role: 'doctor',
      status: 'approved',
      profileDetails: {
        specialty: 'Weight management / Digestive health',
        city: 'Kandy',
        district: 'Kandy',
        province: 'Central',
        country: 'Sri Lanka',
        qualifications: [{ qualificationName: 'BAMS', year: 2010 }],
        languages: ['Sinhala', 'English'],
        offersInPerson: true,
      },
    });
    assert.ok(dto.specialties.includes('Weight management'));
    assert.equal(dto.locationSummary, 'Kandy, Central, Sri Lanka');
    assert.equal(dto.profileDetails.qualifications[0].qualificationName, 'BAMS');
    assert.deepEqual(dto.consultationTypes, ['in_person']);
  });
});

describe('self-edit authorization surface', () => {
  it('allows safe profile fields and strips privilege attempts', () => {
    assert.ok(SAFE_PROFILE_DETAIL_FIELDS.includes('registrationNumber'));
    assert.ok(SAFE_PROFILE_DETAIL_FIELDS.includes('languages'));
    assert.ok(SAFE_PROFILE_DETAIL_FIELDS.includes('qualifications'));
    assert.ok(SAFE_PROFILE_DETAIL_FIELDS.includes('specialtyIds'));
    const { updates, attemptedPrivileged } = sanitizeSelfProfileUpdate(
      {
        name: 'Dr X',
        role: 'admin',
        status: 'approved',
        profileDetails: {
          specialty: ['Panchakarma'],
          registrationNumber: 'AY-1',
          languages: ['Sinhala'],
          qualifications: [{ qualificationName: 'BAMS' }],
          city: 'Galle',
          offersInPerson: true,
        },
      },
      {}
    );
    assert.deepEqual(attemptedPrivileged, ['role', 'status']);
    assert.equal(updates.name, 'Dr X');
    assert.equal(updates.profileDetails.registrationNumber, 'AY-1');
    assert.deepEqual(updates.profileDetails.languages, ['Sinhala']);
    assert.equal(updates.role, undefined);
  });
});

describe('specialty catalog + payments flag', () => {
  it('resolves default catalog', () => {
    const cat = resolveSpecialtyCatalog({});
    assert.ok(cat.includes('General Ayurveda'));
    assert.ok(cat.includes('Panchakarma'));
  });

  it('appointmentPaymentsEnabled remains false', () => {
    assert.equal(DEFAULT_SETTINGS.appointmentPaymentsEnabled, false);
  });
});
