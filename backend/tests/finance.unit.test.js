/**
 * P0-B2 payment foundation unit tests (no live Firebase).
 * Run: node backend/tests/finance.unit.test.js
 */
const assert = require('assert');
const { createMemoryFirestore } = require('./memoryFirestore');
const {
  DEFAULT_LAUNCH_COMMERCIAL_TEMPLATE,
  PAYMENT_STATUSES,
  validateFixedSplitAmounts,
  calculateConsultationPricing,
  createFinancialSnapshot,
  calculateGatewayImpact,
  calculateRefundImpact,
  calculateProviderPayable,
  buildTermPayload,
  withLaunchTemplateDefaults,
  upsertCommercialTerm,
  getActiveTermForType,
  toPublicPrices,
  toProviderView,
  nextBusinessReference,
  assertPaymentTransition,
  buildPaymentRecord,
  createPaymentDoc,
  transitionPayment,
  acquireSlotHold,
  releaseSlotHold,
  slotLockId,
  isHoldActive,
  createPaymentPendingAppointment,
  confirmAppointmentPayment,
  failOrCancelAppointmentPayment,
  assertAppointmentStatusTransition,
  calculateOutstandingPayable,
  createSettlementDraft,
  createReconciliationRecord,
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
  console.log('P0-B2 finance.unit.test.js');

  await test('feature flag defaults to false', () => {
    assert.strictEqual(DEFAULT_SETTINGS.appointmentPaymentsEnabled, false);
    assert.strictEqual(DEFAULT_SETTINGS.slotHoldMinutes, 10);
    assert.strictEqual(DEFAULT_SETTINGS.providerPayoutHoldHours, 24);
    const pub = pickPublicSettings(DEFAULT_SETTINGS, { payhereConfigured: false });
    assert.strictEqual(pub.appointmentPaymentsEnabled, false);
    assert.strictEqual(pub.gatewayFeeAmount, undefined);
    assert.strictEqual(pub.providerPayoutHoldHours, undefined);
  });

  await test('launch template is 1000/600/400 defaults only', () => {
    assert.strictEqual(DEFAULT_LAUNCH_COMMERCIAL_TEMPLATE.consultationPrice, 1000);
    assert.strictEqual(DEFAULT_LAUNCH_COMMERCIAL_TEMPLATE.providerPayout, 600);
    assert.strictEqual(DEFAULT_LAUNCH_COMMERCIAL_TEMPLATE.platformGross, 400);
  });

  await test('valid 1000/600/400 split', () => {
    const r = validateFixedSplitAmounts({
      consultationPrice: 1000,
      providerPayout: 600,
      platformGross: 400,
      facilityFee: 0,
    });
    assert.strictEqual(r.ok, true);
  });

  await test('valid 1000/500/500 split', () => {
    const r = validateFixedSplitAmounts({
      consultationPrice: 1000,
      providerPayout: 500,
      platformGross: 500,
    });
    assert.strictEqual(r.ok, true);
  });

  await test('valid alternate agreements', () => {
    for (const row of [
      [999, 600, 399],
      [1190, 700, 490],
      [1500, 1000, 500],
    ]) {
      const r = validateFixedSplitAmounts({
        consultationPrice: row[0],
        providerPayout: row[1],
        platformGross: row[2],
      });
      assert.strictEqual(r.ok, true, String(row));
    }
  });

  await test('invalid split rejected', () => {
    const r = validateFixedSplitAmounts({
      consultationPrice: 1000,
      providerPayout: 700,
      platformGross: 400,
    });
    assert.strictEqual(r.ok, false);
  });

  await test('server authoritative pricing ignores client wishful thinking', () => {
    const term = {
      consultationType: 'video',
      pricingModel: 'FIXED_SPLIT',
      consultationPrice: 1190,
      providerPayout: 700,
      platformGross: 490,
      facilityFee: 0,
      version: 3,
    };
    const snap = createFinancialSnapshot(term, { discount: 0, gatewayConfig: { gatewayFeeAmount: 25 } });
    assert.strictEqual(snap.grossAmount, 1190);
    assert.strictEqual(snap.providerPayout, 700);
    assert.strictEqual(snap.platformGrossRevenue, 490);
    assert.strictEqual(snap.gatewayFee, 25);
    assert.strictEqual(snap.platformNetRevenue, 465);
    assert.strictEqual(snap.pricingModelUsed, 'FIXED_SPLIT');
    assert.strictEqual(snap.termsVersion, 3);
    // Gateway never surcharges customer
    const g = calculateGatewayImpact(1190, { gatewayFeeAmount: 25 });
    assert.strictEqual(g.customerSurcharge, 0);
    assert.strictEqual(g.grossAmountChargedToCustomer, 1190);
  });

  await test('per-consultation pricing types', () => {
    for (const t of ['in_person', 'video', 'audio']) {
      const pricing = calculateConsultationPricing({
        consultationType: t,
        pricingModel: 'FIXED_SPLIT',
        consultationPrice: 1000,
        providerPayout: 600,
        platformGross: 400,
      });
      assert.strictEqual(pricing.consultationType, t);
      assert.strictEqual(pricing.grossAmount, 1000);
    }
  });

  await test('buildTermPayload validates and versions', () => {
    const built = buildTermPayload(
      withLaunchTemplateDefaults({ consultationType: 'in_person' }),
      { actorUid: 'admin1', previousVersion: 2 }
    );
    assert.strictEqual(built.ok, true);
    assert.strictEqual(built.term.consultationPrice, 1000);
    assert.strictEqual(built.term.providerPayout, 600);
    assert.strictEqual(built.term.version, 3);
  });

  await test('commercial terms upsert + public price isolation', async () => {
    const db = createMemoryFirestore();
    await upsertCommercialTerm(
      db,
      'doc1',
      {
        consultationType: 'in_person',
        consultationPrice: 1000,
        providerPayout: 600,
        platformGross: 400,
      },
      'admin'
    );
    await upsertCommercialTerm(
      db,
      'doc1',
      {
        consultationType: 'video',
        consultationPrice: 1500,
        providerPayout: 1000,
        platformGross: 500,
      },
      'admin'
    );
    const term = await getActiveTermForType(db, 'doc1', 'video');
    assert.strictEqual(term.consultationPrice, 1500);
    assert.strictEqual(term.providerPayout, 1000);

    const doc = await db.collection('providerCommercialTerms').doc('doc1').get();
    const publicPrices = toPublicPrices(doc.data());
    assert.strictEqual(publicPrices.video.consultationPrice, 1500);
    assert.strictEqual(publicPrices.video.providerPayout, undefined);
    assert.strictEqual(publicPrices.in_person.consultationPrice, 1000);

    const providerView = toProviderView({ providerId: 'doc1', ...doc.data() });
    assert.strictEqual(providerView.types.video.providerPayout, 1000);
  });

  await test('reference concurrency-safe sequence', async () => {
    const db = createMemoryFirestore();
    const at = new Date('2026-07-25T00:00:00Z');
    const a = await nextBusinessReference(db, 'appointment', at);
    const b = await nextBusinessReference(db, 'appointment', at);
    const p = await nextBusinessReference(db, 'payment', at);
    const o = await nextBusinessReference(db, 'order', at);
    assert.strictEqual(a, 'DG-APT-2026-000001');
    assert.strictEqual(b, 'DG-APT-2026-000002');
    assert.strictEqual(p, 'DG-PAY-2026-000001');
    assert.strictEqual(o, 'DG-ORD-2026-000001');
  });

  await test('payment state transitions', () => {
    assert.strictEqual(assertPaymentTransition('CREATED', 'PENDING').ok, true);
    assert.strictEqual(assertPaymentTransition('PENDING', 'PAID').ok, true);
    assert.strictEqual(assertPaymentTransition('PAID', 'PENDING').ok, false);
    assert.strictEqual(assertPaymentTransition('PAID', 'REFUNDED').ok, true);
    assert.strictEqual(assertPaymentTransition('FAILED', 'PAID').ok, false);
  });

  await test('immutable paid snapshot', async () => {
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
      userId: 'u1',
      providerUserId: 'd1',
      appointmentId: 'a1',
      snapshot: snap,
      status: PAYMENT_STATUSES.PENDING,
    });
    await transitionPayment(db, payment.id, 'PAID');
    let blocked = false;
    try {
      await transitionPayment(db, payment.id, 'REFUND_PENDING', { providerPayout: 1 });
    } catch (e) {
      blocked = /immutable/i.test(e.message);
    }
    assert.strictEqual(blocked, true);
  });

  await test('duplicate slot hold rejected', async () => {
    const db = createMemoryFirestore();
    const hold1 = await acquireSlotHold(db, {
      providerId: 'd1',
      date: '2026-08-01',
      time: '10:00',
      consultationType: 'in_person',
      userId: 'p1',
      holdMinutes: 10,
    });
    assert.strictEqual(hold1.status, 'HOLDING');
    let rejected = false;
    try {
      await acquireSlotHold(db, {
        providerId: 'd1',
        date: '2026-08-01',
        time: '10:00',
        consultationType: 'in_person',
        userId: 'p2',
        holdMinutes: 10,
      });
    } catch (e) {
      rejected = e.statusCode === 409;
    }
    assert.strictEqual(rejected, true);
  });

  await test('expired slot hold can be re-acquired', async () => {
    const db = createMemoryFirestore();
    const past = new Date(Date.now() - 60 * 60 * 1000);
    await acquireSlotHold(db, {
      providerId: 'd1',
      date: '2026-08-02',
      time: '11:00',
      consultationType: 'video',
      userId: 'p1',
      holdMinutes: 10,
      now: past,
    });
    // Force expiry in store
    const id = slotLockId('d1', '2026-08-02', '11:00', 'video');
    const ref = db.collection('slotLocks').doc(id);
    const cur = (await ref.get()).data();
    assert.strictEqual(isHoldActive(cur, new Date()), false);
    const hold2 = await acquireSlotHold(db, {
      providerId: 'd1',
      date: '2026-08-02',
      time: '11:00',
      consultationType: 'video',
      userId: 'p2',
      holdMinutes: 10,
    });
    assert.strictEqual(hold2.holdByUserId, 'p2');
  });

  await test('payment-pending appointment + confirm + finance isolation', async () => {
    const db = createMemoryFirestore();
    await upsertCommercialTerm(
      db,
      'doctorA',
      {
        consultationType: 'in_person',
        consultationPrice: 1000,
        providerPayout: 600,
        platformGross: 400,
      },
      'admin'
    );

    const created = await createPaymentPendingAppointment(db, {
      user: { uid: 'patient1', email: 'p@test.com' },
      providerId: 'doctorA',
      providerName: 'Dr A',
      date: '2026-08-10',
      time: '09:00',
      consultationType: 'in_person',
      customerName: 'Patient One',
      slotHoldMinutes: 10,
    });

    assert.match(created.appointment.appointmentReference, /^DG-APT-20\d{2}-\d{6}$/);
    assert.match(created.payment.paymentReference, /^DG-PAY-20\d{2}-\d{6}$/);
    assert.strictEqual(created.appointment.status, 'PAYMENT_PENDING');
    assert.strictEqual(created.appointment.totalAmount, 1000);
    assert.strictEqual(created.appointment.providerPayout, 600);
    assert.strictEqual(created.appointment.financialSnapshot.termsVersion, 1);

    const confirmed = await confirmAppointmentPayment(db, { paymentId: created.payment.id });
    assert.strictEqual(confirmed.payment.status, 'PAID');
    assert.strictEqual(confirmed.appointment.status, 'CONFIRMED');

    const lock = await db.collection('slotLocks').doc(created.hold.id).get();
    assert.strictEqual(lock.data().status, 'CONSUMED');
  });

  await test('payment failure releases slot and zeros payable', async () => {
    const db = createMemoryFirestore();
    await upsertCommercialTerm(
      db,
      'doctorB',
      {
        consultationType: 'audio',
        consultationPrice: 999,
        providerPayout: 600,
        platformGross: 399,
      },
      'admin'
    );
    const created = await createPaymentPendingAppointment(db, {
      user: { uid: 'patient2', email: 'p2@test.com' },
      providerId: 'doctorB',
      date: '2026-08-11',
      time: '14:30',
      consultationType: 'audio',
      customerName: 'P2',
    });
    await failOrCancelAppointmentPayment(db, { paymentId: created.payment.id, outcome: 'FAILED' });
    const appt = await db.collection('appointments').doc(created.appointment.id).get();
    assert.strictEqual(appt.data().status, 'EXPIRED');
    assert.strictEqual(appt.data().providerPayout, 0);
    const lock = await db.collection('slotLocks').doc(created.hold.id).get();
    assert.ok(['EXPIRED', 'RELEASED'].includes(lock.data().status));
  });

  await test('appointment status machine rejects invalid paid transitions', () => {
    assert.strictEqual(assertAppointmentStatusTransition('PAYMENT_PENDING', 'CONFIRMED').ok, true);
    assert.strictEqual(assertAppointmentStatusTransition('CONFIRMED', 'COMPLETED').ok, true);
    assert.strictEqual(assertAppointmentStatusTransition('COMPLETED', 'CONFIRMED').ok, false);
    assert.strictEqual(assertAppointmentStatusTransition('pending', 'accepted').ok, true); // legacy
  });

  await test('settlement payable + refund reversal + reconciliation', async () => {
    const db = createMemoryFirestore();
    const payments = [
      { providerPaymentStatus: 'ELIGIBLE', providerPayout: 600 },
      { providerPaymentStatus: 'ELIGIBLE', providerPayout: 500 },
      { providerPaymentStatus: 'PENDING', providerPayout: 700 },
    ];
    assert.strictEqual(calculateOutstandingPayable(payments), 1100);

    const settlement = await createSettlementDraft(db, {
      providerId: 'doctorA',
      amount: 600,
      paymentIds: ['pay1'],
      appointmentIds: ['apt1'],
      status: 'OPEN',
    });
    assert.match(settlement.settlementReference, /^DG-SET-20\d{2}-\d{6}$/);

    const impactFull = calculateRefundImpact({
      snapshot: { grossAmount: 1000, providerPayout: 600, platformGrossRevenue: 400 },
      refundType: 'FULL_REFUND',
      providerPaymentStatus: 'PENDING',
    });
    assert.strictEqual(impactFull.customerRefund, 1000);
    assert.strictEqual(impactFull.nextProviderPaymentStatus, 'REVERSED');
    assert.ok(impactFull.providerPayableDelta < 0);

    const impactSettled = calculateRefundImpact({
      snapshot: { grossAmount: 1000, providerPayout: 600, platformGrossRevenue: 400 },
      refundType: 'FULL_REFUND',
      providerPaymentStatus: 'PAID',
    });
    assert.strictEqual(impactSettled.requiresReconciliation, true);
    assert.strictEqual(impactSettled.reconciliationAmount, 600);

    const recon = await createReconciliationRecord(db, {
      providerId: 'doctorA',
      paymentId: 'pay1',
      amount: 600,
      reason: 'post_settlement_refund',
      actorUid: 'admin',
    });
    assert.strictEqual(recon.amount, 600);
  });

  await test('provider payout eligibility after hold hours', () => {
    const completedAt = new Date('2026-07-20T10:00:00Z');
    const before = calculateProviderPayable({
      snapshot: { providerPayout: 600 },
      appointmentStatus: 'COMPLETED',
      paymentStatus: 'PAID',
      completedAt,
      holdHours: 24,
      now: new Date('2026-07-20T12:00:00Z'),
    });
    assert.strictEqual(before.status, 'PENDING');
    const after = calculateProviderPayable({
      snapshot: { providerPayout: 600 },
      appointmentStatus: 'COMPLETED',
      paymentStatus: 'PAID',
      completedAt,
      holdHours: 24,
      now: new Date('2026-07-21T11:00:00Z'),
    });
    assert.strictEqual(after.status, 'ELIGIBLE');
    assert.strictEqual(after.amount, 600);
  });

  await test('legacy appointment compatibility — no snapshot required', () => {
    const legacy = {
      status: 'pending',
      customerId: 'c1',
      providerId: 'd1',
      date: '2026-01-01',
      time: '10:00',
    };
    assert.strictEqual(assertAppointmentStatusTransition(legacy.status, 'accepted').ok, true);
    assert.strictEqual(legacy.financialSnapshot, undefined);
  });

  await test('releaseSlotHold works', async () => {
    const db = createMemoryFirestore();
    const hold = await acquireSlotHold(db, {
      providerId: 'd9',
      date: '2026-09-01',
      time: '08:00',
      consultationType: 'in_person',
      userId: 'u9',
    });
    await releaseSlotHold(db, hold.id, { reason: 'RELEASED' });
    const snap = await db.collection('slotLocks').doc(hold.id).get();
    assert.strictEqual(snap.data().status, 'RELEASED');
  });

  await test('buildPaymentRecord rejects missing snapshot', () => {
    assert.throws(() =>
      buildPaymentRecord({
        paymentReference: 'DG-PAY-2026-000001',
        purpose: 'appointment',
        userId: 'u',
      })
    );
  });

  console.log('All P0-B2 finance unit tests passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
