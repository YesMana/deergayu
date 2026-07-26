/**
 * Local P1-B merge-gate mock API — Node http only (no production writes).
 */
const http = require('http');
const { URL } = require('url');

const MANU_ID = 'MV6cw7GtjFYgT9gERdVUuHXs7U33';
const GAYA_ID = 'Yd1BQkLQ0TUDQvsr8b87PnlM31j2';

const scheduleWeekdays = {
  Monday: { start: '09:00', end: '17:00', active: true },
  Tuesday: { start: '09:00', end: '17:00', active: true },
  Wednesday: { start: '09:00', end: '17:00', active: true },
  Thursday: { start: '09:00', end: '17:00', active: true },
  Friday: { start: '09:00', end: '17:00', active: true },
  Saturday: { start: '09:00', end: '13:00', active: false },
  Sunday: { start: '09:00', end: '13:00', active: false },
};

const providers = [
  {
    id: MANU_ID,
    publicSlug: 'dr-manu',
    name: 'Manu',
    role: 'doctor',
    status: 'approved',
    profileDetails: {
      doctorType: 'traditional',
      specialty: 'hgfh',
      city: '',
      district: '',
      hasSchedule: true,
    },
    rating: 0,
    reviewCount: 0,
    consultationTypes: ['in_person'],
    specialties: ['hgfh'],
    locationSummary: null,
    availabilitySummary: {
      nextDate: '2026-07-27',
      nextTime: '09:00',
      freeCount: 32,
      sample: ['09:00', '09:15', '09:30', '09:45'],
    },
    _schedule: { slotDuration: 15, workingDays: scheduleWeekdays, unavailableDates: [] },
  },
  {
    id: GAYA_ID,
    publicSlug: 'dr-phs-gaya',
    name: 'P.H.S.Gaya',
    role: 'doctor',
    status: 'approved',
    profileDetails: {
      doctorType: 'traditional',
      specialty: 'Panchakarma',
      city: 'Matara',
      district: 'Matara',
      hasSchedule: true,
    },
    rating: 0,
    reviewCount: 0,
    consultationTypes: ['in_person', 'video'],
    specialties: ['Panchakarma'],
    locationSummary: 'Matara, Matara',
    availabilitySummary: {
      nextDate: '2026-07-27',
      nextTime: '09:00',
      freeCount: 16,
      sample: ['09:00', '09:30', '10:00', '10:30'],
    },
    _schedule: { slotDuration: 30, workingDays: scheduleWeekdays, unavailableDates: [] },
  },
];

let activeFacilities = [];
let adminFacilities = [
  {
    id: 'fac-draft-1',
    name: 'Draft Only Centre',
    slug: 'draft-only-centre',
    type: 'clinic',
    status: 'draft',
    city: 'Colombo',
    district: 'Colombo',
    address: 'Internal only',
  },
];

function publicProvider(p, opts = {}) {
  const { _schedule, ...rest } = p;
  const out = JSON.parse(JSON.stringify(rest));
  if (opts.availabilitySummary !== undefined) out.availabilitySummary = opts.availabilitySummary;
  if (out.profileDetails) {
    delete out.profileDetails.address;
    delete out.profileDetails.telephone;
    delete out.profileDetails.phone;
    delete out.profileDetails.schedule;
  }
  return out;
}

function weekdayName(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d, 6, 30, 0);
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
    new Date(ms).getUTCDay()
  ];
}

function hasSlotsOn(p, date) {
  const wd = weekdayName(date);
  const day = p._schedule?.workingDays?.[wd];
  return Boolean(day && day.active !== false && day.start && day.end);
}

function send(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

const PORT = Number(process.env.MOCK_PORT || 4055);

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    });
    return res.end();
  }

  const u = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const path = u.pathname;

  if (path === '/api/health') return send(res, 200, { ok: true, mock: 'p1b-merge-gate' });
  if (path === '/api/settings') {
    return send(res, 200, { appointmentPaymentsEnabled: false, currency: 'LKR' });
  }

  if (path === '/api/providers' && req.method === 'GET') {
    const date = String(u.searchParams.get('date') || '').trim();
    const specialty = String(u.searchParams.get('specialty') || '').trim().toLowerCase();
    const type = String(u.searchParams.get('type') || '').trim();
    const q = String(u.searchParams.get('q') || '').trim().toLowerCase();
    const today = '2026-07-26';

    let list;
    if (date) {
      if (date < today) return send(res, 200, []);
      list = providers
        .filter((p) => hasSlotsOn(p, date))
        .map((p) =>
          publicProvider(p, {
            availabilitySummary: {
              nextDate: date,
              nextTime: '09:00',
              freeCount: 4,
              sample: ['09:00', '09:15', '09:30', '09:45'],
            },
          })
        );
    } else {
      list = providers.map((p) => publicProvider(p));
    }

    if (specialty && specialty !== 'all') {
      list = list.filter((p) =>
        (p.specialties || []).some((s) => s.toLowerCase().includes(specialty))
      );
    }
    if (type && type !== 'all') {
      list = list.filter((p) => (p.consultationTypes || []).includes(type));
    }
    if (q) {
      list = list.filter((p) =>
        `${p.name} ${(p.specialties || []).join(' ')}`.toLowerCase().includes(q)
      );
    }
    return send(res, 200, list);
  }

  if (path.startsWith('/api/providers/') && path.endsWith('/consultation-prices')) {
    return send(res, 200, {
      prices: {
        in_person: { consultationPrice: 1000, currency: 'LKR', consultationType: 'in_person' },
      },
    });
  }

  if (path.startsWith('/api/providers/') && req.method === 'GET') {
    const key = decodeURIComponent(path.replace('/api/providers/', ''));
    if (key === 'nonexistent-provider') return send(res, 404, { error: 'Provider not found' });
    const p = providers.find(
      (x) => x.id === key || x.publicSlug === key || x.publicSlug === key.toLowerCase()
    );
    if (!p) return send(res, 404, { error: 'Provider not found' });
    const dto = publicProvider(p);
    if (key === p.id && p.publicSlug) dto.canonicalSlug = p.publicSlug;
    dto.affiliations = [];
    return send(res, 200, dto);
  }

  if (path === '/api/facilities' && req.method === 'GET') {
    let list = activeFacilities.filter((f) => f.status === 'active');
    const group = u.searchParams.get('group');
    if (group === 'clinics') {
      list = list.filter((f) => ['clinic', 'ayurveda_centre', 'wellness_centre'].includes(f.type));
    }
    if (group === 'hospitals') list = list.filter((f) => f.type === 'hospital');
    return send(res, 200, list);
  }

  if (path.startsWith('/api/facilities/') && req.method === 'GET') {
    const key = decodeURIComponent(path.replace('/api/facilities/', ''));
    const f = activeFacilities.find((x) => x.id === key || x.slug === key);
    if (!f || f.status !== 'active') return send(res, 404, { error: 'Facility not found' });
    return send(res, 200, { ...f, providers: [] });
  }

  if (path === '/api/admin/facilities' && req.method === 'GET') {
    return send(res, 200, [...adminFacilities, ...activeFacilities]);
  }

  if (path === '/api/admin/facilities' && req.method === 'POST') {
    const body = await readBody(req);
    const TYPES = ['clinic', 'hospital', 'ayurveda_centre', 'wellness_centre'];
    const STATUSES = ['draft', 'active', 'inactive'];
    if (!TYPES.includes(body.type)) return send(res, 400, { error: 'Invalid type' });
    if (body.status && !STATUSES.includes(body.status)) {
      return send(res, 400, { error: 'Invalid status' });
    }
    const row = {
      id: `fac-${Date.now()}`,
      name: body.name,
      type: body.type,
      status: body.status || 'draft',
      city: body.city || '',
      district: body.district || '',
      slug: String(body.name || 'facility')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-'),
    };
    if (row.status === 'active') activeFacilities.push(row);
    else adminFacilities.push(row);
    return send(res, 201, row);
  }

  if (path.startsWith('/api/admin/facilities/') && req.method === 'PATCH') {
    const id = path.replace('/api/admin/facilities/', '');
    const body = await readBody(req);
    const all = [...adminFacilities, ...activeFacilities];
    const row = all.find((f) => f.id === id);
    if (!row) return send(res, 404, { error: 'Not found' });
    if (body.type) {
      const TYPES = ['clinic', 'hospital', 'ayurveda_centre', 'wellness_centre'];
      if (!TYPES.includes(body.type)) return send(res, 400, { error: 'Invalid type' });
      row.type = body.type;
    }
    if (body.status) {
      const STATUSES = ['draft', 'active', 'inactive'];
      if (!STATUSES.includes(body.status)) return send(res, 400, { error: 'Invalid status' });
      row.status = body.status;
      adminFacilities = adminFacilities.filter((f) => f.id !== row.id);
      activeFacilities = activeFacilities.filter((f) => f.id !== row.id);
      if (row.status === 'active') activeFacilities.push(row);
      else adminFacilities.push(row);
    }
    return send(res, 200, row);
  }

  if (path === '/__test__/set-active-facility' && req.method === 'POST') {
    const body = await readBody(req);
    activeFacilities = body.active
      ? [
          {
            id: 'fac-test-clinic',
            name: 'Test Active Clinic',
            slug: 'test-active-clinic',
            type: 'clinic',
            status: 'active',
            city: 'Colombo',
          },
        ]
      : [];
    return send(res, 200, { activeFacilities });
  }

  if (path === '/api/featured-providers') {
    return send(res, 200, providers.map((p) => publicProvider(p)));
  }

  send(res, 404, { error: 'Route not found', path });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`P1-B merge-gate mock API on http://127.0.0.1:${PORT}`);
});
