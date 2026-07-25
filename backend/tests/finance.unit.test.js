/**
 * P0-B2 payment foundation + pre-merge financial correctness tests.
 * Run: node backend/tests/finance.unit.test.js
 */
const assert = require('assert');
const { createMemoryFirestore } = require('./memoryFirestore');
const {
  DEFAULT_LAUNCH_COMMERCIAL_TEMPLATE,
  CANONICAL_SPLIT_EQUATION,
  PAYMENT_STATUSES,
  validateFixedSplitAmounts,
  calculateConsultationPricing,
  createFinancialSnapshot,
  calculateGatewayImpact,
  calculateRefundImpact,
  calculateProviderPayable,
  buildTermPayload,
  upsertCommercialTerm,
  getActiveTermForType,
  setTermActive,
  toPublicPrices,
  toProviderView,
  nextBusinessReference,
  assertPaymentTransition,
  buildPaymentRecord,
  createPaymentDoc,
  transitionPayment,
  applyRefundLedger,
  acquireSlotHold,
  releaseSlotHold,
  slotLockId,
  providerSlotLockId,
  canonicalizeSlot,
  isHoldActive,
  createPaymentPendingAppointment,
  confirmAppointmentPayment,
  failOrCancelAppointmentPayment,
  assertAppointmentStatusTransition,
  calculateOutstandingPayable,
  createSettlementDraft,
  createReconciliationRecord,
  toMinor,
  fromMinor,
  SUGGESTED_ADMIN_FORM_TEMPLATE,
} = require('../finance');
const { pickPublicSettings } = require('../security');
const { DEFAULT_SETTINGS } = require('../platformUtils');

function test(name, fn) {
  const out = fn();
  if (out && typeof out.then === 'function') {
    return out
      .then(() => console.log(`  ✓ ${name}`))
      .catch((e) => {
        console.error(`  ✗ ${name}`);
        throw e;
      });
  }
  console.log(`  ✓ ${name}`);
  return Promise.resolve();
}

async function run() {
  console.log('P0-B2 finance.unit.test.js (pre-merge review)');

  await test('feature flag remains false', () => {
    assert.strictEqual(DEFAULT_SETTINGS.appointmentPaymentsEnabled, false);
  });

  await test('suggested template is NOT applied when money fields omitted', () => {
    const built = buildTermPayload({ consultationType: 'in_person' });
    assert.strictEqual(built.ok, false);
    assert.strictEqual(built.code, 'COMMERCIAL_TERMS_INCOMPLETE');
    assert.ok(SUGGESTED_ADMIN_FORM_TEMPLATE.consultationPrice === 1000);
    assert.ok(DEFAULT_LAUNCH_COMMERCIAL_TEMPLATE.providerPayout === 600);
  });

  await test('explicit terms required for upsert — no silent 1000/600/400', async () => {
    const db = createMemoryFirestore();
    let code = null;
    try {
      await upsertCommercialTerm(db, 'docX', { consultationType: 'video' }, 'admin');
    } catch (e) {
      code = e.code;
    }
    assert.strictEqual(code, 'COMMERCIAL_TERMS_INCOMPLETE');
    const term = await getActiveTermForType(db, 'docX', 'video');
    assert.strictEqual(term, null);
  });

  await test('payment booking fails with COMMERCIAL_TERMS_NOT_CONFIGURED', async () => {
    const db = createMemoryFirestore();
    let code = null;
    try {
      await createPaymentPendingAppointment(db, {
        user: { uid: 'p1', email: 'p@t.com' },
        providerId: 'noTerms',
        date: '2026-08-01',
        time: '10:00',
        consultationType: 'in_person',
      });
    } catch (e) {
      code = e.code;
    }
    assert.strictEqual(code, 'COMMERCIAL_TERMS_NOT_CONFIGURED');
  });

  await test('canonical equation 1000 = 600 + 400 + 0', () => {
    assert.ok(CANONICAL_SPLIT_EQUATION.includes('consultationFee'));
    const snap = createFinancialSnapshot({
      consultationType: 'in_person',
      pricingModel: 'FIXED_SPLIT',
      consultationPrice: 1000,
      providerPayout: 600,
      platformGross: 400,
      facilityFee: 0,
      version: 1,
    });
    assert.strictEqual(snap.consultationFee, 1000);
    assert.strictEqual(snap.providerPayout, 600);
    assert.strictEqual(snap.platformGrossRevenue, 400);
    assert.strictEqual(snap.facilityFee, 0);
    assert.strictEqual(snap.customerTotal, 1000);
    assert.strictEqual(snap.platformFee, snap.platformGrossRevenue);
    assert.strictEqual(
      snap.consultationFee,
      snap.providerPayout + snap.platformGrossRevenue + snap.facilityFee
    );
  });

  await test('valid splits including decimals via minor units', () => {
    for (const row of [
      [1000, 600, 400],
      [1000, 500, 500],
      [999, 600, 399],
      [1190, 700, 490],
      [1500, 1000, 500],
      [99.99, 50.0, 49.99],
      [10.5, 6.25, 4.25],
    ]) {
      const r = validateFixedSplitAmounts({
        consultationPrice: row[0],
        providerPayout: row[1],
        platformGross: row[2],
      });
      assert.strictEqual(r.ok, true, String(row));
    }
    const bad = validateFixedSplitAmounts({
      consultationPrice: 1000,
      providerPayout: 700,
      platformGross: 400,
    });
    assert.strictEqual(bad.ok, false);
  });

  await test('money minor-unit rounding is deterministic', () => {
    assert.strictEqual(toMinor(999), 99900);
    assert.strictEqual(toMinor(1190), 119000);
    assert.strictEqual(toMinor(10.005), 1001); // half-up → 10.01
    assert.strictEqual(toMinor(10.004), 1000);
    assert.strictEqual(fromMinor(39900), 399);
    const snap = createFinancialSnapshot({
      consultationType: 'video',
      pricingModel: 'FIXED_SPLIT',
      consultationPrice: 99.99,
      providerPayout: 50,
      platformGross: 49.99,
      version: 1,
    });
    assert.strictEqual(snap.customerTotal, 99.99);
    assert.strictEqual(
      toMinor(snap.providerPayout) + toMinor(snap.platformGrossRevenue),
      toMinor(snap.customerTotal)
    );
  });

  await test('gateway never surcharges customer', () => {
    const g = calculateGatewayImpact(1000, { gatewayFeeAmount: 25 });
    assert.strictEqual(g.customerSurcharge, 0);
    assert.strictEqual(g.grossAmountChargedToCustomer, 1000);
    const snap = createFinancialSnapshot(
      {
        consultationType: 'in_person',
        pricingModel: 'FIXED_SPLIT',
        consultationPrice: 1000,
        providerPayout: 600,
        platformGross: 400,
        version: 1,
      },
      { gatewayConfig: { gatewayFeeAmount: 25 } }
    );
    assert.strictEqual(snap.customerTotal, 1000);
    assert.strictEqual(snap.platformNetRevenue, 375);
  });

  await test('slot lock ignores consultationType — cross-type collision denied', async () => {
    const db = createMemoryFirestore();
    await acquireSlotHold(db, {
      providerId: 'doc1',
      date: '2026-08-01',
      time: '10:00',
      consultationType: 'in_person',
      userId: 'p1',
    });
    for (const type of ['video', 'audio']) {
      let denied = false;
      try {
        await acquireSlotHold(db, {
          providerId: 'doc1',
          date: '2026-08-01',
          time: '10:00',
          consultationType: type,
          userId: 'p2',
        });
      } catch (e) {
        denied = e.statusCode === 409;
      }
      assert.strictEqual(denied, true, type);
    }
    // different provider same time — allowed
    const other = await acquireSlotHold(db, {
      providerId: 'doc2',
      date: '2026-08-01',
      time: '10:00',
      consultationType: 'video',
      userId: 'p3',
    });
    assert.strictEqual(other.status, 'HOLDING');
    // same provider different time — allowed
    const later = await acquireSlotHold(db, {
      providerId: 'doc1',
      date: '2026-08-01',
      time: '10:30',
      consultationType: 'audio',
      userId: 'p4',
    });
    assert.strictEqual(later.status, 'HOLDING');
    // lock ids equal across types
    assert.strictEqual(
      slotLockId('doc1', '2026-08-01', '10:00', 'in_person'),
      slotLockId('doc1', '2026-08-01', '10:00', 'video')
    );
  });

  await test('canonical time rejects AM/PM and normalizes HH:mm', () => {
    assert.strictEqual(canonicalizeSlot('2026-08-01', '10:00 AM').ok, false);
    assert.strictEqual(canonicalizeSlot('08/01/2026', '10:00').ok, false);
    const c = canonicalizeSlot('2026-08-01', '10:00');
    assert.strictEqual(c.ok, true);
    assert.strictEqual(c.canonicalSlotStart, '2026-08-01T10:00:00+05:30');
    assert.strictEqual(providerSlotLockId('d1', '2026-08-01', '10:00').lockId, 'd1_20260801_1000');
  });

  await test('expired HOLDING lock does not permanently block slot', async () => {
    const db = createMemoryFirestore();
    const past = new Date(Date.now() - 60 * 60 * 1000);
    await acquireSlotHold(db, {
      providerId: 'd1',
      date: '2026-08-02',
      time: '11:00',
      consultationType: 'in_person',
      userId: 'p1',
      holdMinutes: 10,
      now: past,
    });
    const id = slotLockId('d1', '2026-08-02', '11:00');
    const cur = (await db.collection('slotLocks').doc(id).get()).data();
    assert.strictEqual(isHoldActive(cur, new Date()), false);
    const hold2 = await acquireSlotHold(db, {
      providerId: 'd1',
      date: '2026-08-02',
      time: '11:00',
      consultationType: 'video',
      userId: 'p2',
    });
    assert.strictEqual(hold2.holdByUserId, 'p2');
  });

  await test('terms versioning — history append, snapshot immutable to later edits', async () => {
    const db = createMemoryFirestore();
    const r1 = await upsertCommercialTerm(
      db,
      'docV',
      {
        consultationType: 'in_person',
        consultationPrice: 1000,
        providerPayout: 600,
        platformGross: 400,
      },
      'admin'
    );
    assert.strictEqual(r1.term.version, 1);
    const created = await createPaymentPendingAppointment(db, {
      user: { uid: 'pat', email: 'a@b.com' },
      providerId: 'docV',
      date: '2026-09-01',
      time: '09:00',
      consultationType: 'in_person',
    });
    assert.strictEqual(created.appointment.termsVersion, 1);
    assert.strictEqual(created.appointment.providerPayout, 600);

    const r2 = await upsertCommercialTerm(
      db,
      'docV',
      {
        consultationType: 'in_person',
        consultationPrice: 1500,
        providerPayout: 1000,
        platformGross: 500,
      },
      'admin'
    );
    assert.strictEqual(r2.term.version, 2);

    // Historical appointment unchanged
    const appt = await db.collection('appointments').doc(created.appointment.id).get();
    assert.strictEqual(appt.data().providerPayout, 600);
    assert.strictEqual(appt.data().termsVersion, 1);

    const hist = await db.collection('providerCommercialTerms').doc('docV').collection('history').get();
    assert.ok(hist.size >= 2);

    await setTermActive(db, 'docV', 'in_person', false, 'admin');
    const active = await getActiveTermForType(db, 'docV', 'in_person');
    assert.strictEqual(active, null);
  });

  await test('reference concurrency — unique sequential refs', async () => {
    const db = createMemoryFirestore();
    const at = new Date('2026-07-25T00:00:00Z');
    const results = await Promise.all(
      Array.from({ length: 20 }, () => nextBusinessReference(db, 'appointment', at))
    );
    const unique = new Set(results);
    assert.strictEqual(unique.size, 20);
    assert.ok(results.includes('DG-APT-2026-000001'));
    assert.ok([...unique].every((r) => /^DG-APT-2026-\d{6}$/.test(r)));

    const pay = await nextBusinessReference(db, 'payment', at);
    const ord = await nextBusinessReference(db, 'order', at);
    const set = await nextBusinessReference(db, 'settlement', at);
    assert.strictEqual(pay, 'DG-PAY-2026-000001');
    assert.strictEqual(ord, 'DG-ORD-2026-000001');
    assert.strictEqual(set, 'DG-SET-2026-000001');

    // year rollover separate counters
    const nextYear = await nextBusinessReference(db, 'appointment', new Date('2027-01-01T00:00:00Z'));
    assert.strictEqual(nextYear, 'DG-APT-2027-000001');
  });

  await test('payment idempotency — PAID twice / no regression / no double credit', async () => {
    const db = createMemoryFirestore();
    await upsertCommercialTerm(
      db,
      'docI',
      {
        consultationType: 'in_person',
        consultationPrice: 1000,
        providerPayout: 600,
        platformGross: 400,
      },
      'admin'
    );
    const created = await createPaymentPendingAppointment(db, {
      user: { uid: 'u1', email: 'u@t.com' },
      providerId: 'docI',
      date: '2026-10-01',
      time: '08:00',
      consultationType: 'in_person',
    });
    const first = await confirmAppointmentPayment(db, { paymentId: created.payment.id });
    assert.strictEqual(first.payment.status, 'PAID');
    assert.strictEqual(first.payment.providerPayableCredited, true);

    const second = await confirmAppointmentPayment(db, { paymentId: created.payment.id });
    assert.strictEqual(second.payment.status, 'PAID');
    assert.strictEqual(second.payment._idempotent || second._idempotent, true);

    let regressed = false;
    try {
      await transitionPayment(db, created.payment.id, 'PENDING');
    } catch (e) {
      regressed = /Invalid payment transition/i.test(e.message);
    }
    assert.strictEqual(regressed, true);

    // refund twice blocked
    const impact = calculateRefundImpact({
      snapshot: first.payment.financialSnapshot,
      refundType: 'FULL_REFUND',
      providerPaymentStatus: 'PENDING',
    });
    const r1 = await applyRefundLedger(db, created.payment.id, impact);
    assert.strictEqual(r1.duplicateRefundBlocked, undefined);
    const r2 = await applyRefundLedger(db, created.payment.id, impact);
    assert.strictEqual(r2.duplicateRefundBlocked, true);
  });

  await test('public prices omit payout; provider view includes split', async () => {
    const db = createMemoryFirestore();
    await upsertCommercialTerm(
      db,
      'docP',
      {
        consultationType: 'audio',
        consultationPrice: 1190,
        providerPayout: 700,
        platformGross: 490,
      },
      'admin'
    );
    const doc = (await db.collection('providerCommercialTerms').doc('docP').get()).data();
    const pub = toPublicPrices(doc);
    assert.strictEqual(pub.audio.consultationPrice, 1190);
    assert.strictEqual(pub.audio.providerPayout, undefined);
    const view = toProviderView({ providerId: 'docP', ...doc });
    assert.strictEqual(view.types.audio.providerPayout, 700);
  });

  await test('payment failure releases slot', async () => {
    const db = createMemoryFirestore();
    await upsertCommercialTerm(
      db,
      'docF',
      {
        consultationType: 'in_person',
        consultationPrice: 1000,
        providerPayout: 500,
        platformGross: 500,
      },
      'admin'
    );
    const created = await createPaymentPendingAppointment(db, {
      user: { uid: 'u2', email: 'u2@t.com' },
      providerId: 'docF',
      date: '2026-11-01',
      time: '15:00',
      consultationType: 'in_person',
    });
    await failOrCancelAppointmentPayment(db, { paymentId: created.payment.id, outcome: 'FAILED' });
    const lock = await db.collection('slotLocks').doc(created.hold.id).get();
    assert.ok(['EXPIRED', 'RELEASED'].includes(lock.data().status));
  });

  await test('settlement + refund reconciliation', async () => {
    assert.strictEqual(
      calculateOutstandingPayable([
        { providerPaymentStatus: 'ELIGIBLE', providerPayout: 600 },
        { providerPaymentStatus: 'PENDING', providerPayout: 600 },
      ]),
      600
    );
    const db = createMemoryFirestore();
    const s = await createSettlementDraft(db, {
      providerId: 'd',
      amount: 600,
      paymentIds: ['x'],
      status: 'OPEN',
    });
    assert.match(s.settlementReference, /^DG-SET-/);
    const settledRefund = calculateRefundImpact({
      snapshot: { customerTotal: 1000, providerPayout: 600, platformGrossRevenue: 400 },
      refundType: 'FULL_REFUND',
      providerPaymentStatus: 'PAID',
    });
    assert.strictEqual(settledRefund.requiresReconciliation, true);
    const recon = await createReconciliationRecord(db, {
      providerId: 'd',
      paymentId: 'x',
      amount: 600,
      actorUid: 'admin',
    });
    assert.strictEqual(recon.amount, 600);
  });

  await test('legacy appointment statuses still valid', () => {
    assert.strictEqual(assertAppointmentStatusTransition('pending', 'accepted').ok, true);
  });

  await test('immutable paid snapshot blocks money edits', async () => {
    const db = createMemoryFirestore();
    const snap = createFinancialSnapshot({
      consultationType: 'in_person',
      pricingModel: 'FIXED_SPLIT',
      consultationPrice: 1000,
      providerPayout: 600,
      platformGross: 400,
      version: 1,
    });
    const payment = await createPaymentDoc(db, {
      purpose: 'appointment',
      userId: 'u',
      providerUserId: 'd',
      snapshot: snap,
      status: PAYMENT_STATUSES.PENDING,
    });
    await transitionPayment(db, payment.id, 'PAID');
    let blocked = false;
    try {
      await transitionPayment(db, payment.id, 'REFUND_PENDING', { providerPayout: 1 });
    } catch (e) {
      blocked = e.code === 'SNAPSHOT_IMMUTABLE' || /immutable/i.test(e.message);
    }
    assert.strictEqual(blocked, true);
  });

  await test('assertPaymentTransition rejects PAID→PENDING', () => {
    assert.strictEqual(assertPaymentTransition('PAID', 'PENDING').ok, false);
    assert.strictEqual(assertPaymentTransition('PAID', 'PAID').same, true);
  });

  await test('public settings hide finance internals', () => {
    const pub = pickPublicSettings(
      { ...DEFAULT_SETTINGS, gatewayFeeAmount: 50, providerPayoutHoldHours: 24 },
      { payhereConfigured: false }
    );
    assert.strictEqual(pub.appointmentPaymentsEnabled, false);
    assert.strictEqual(pub.gatewayFeeAmount, undefined);
  });

  console.log('All P0-B2 pre-merge finance unit tests passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
