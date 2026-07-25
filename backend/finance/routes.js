/**
 * P0-B2 finance HTTP routes — registered onto apiRouter.
 * Appointment payment booking is gated by settings.appointmentPaymentsEnabled (default false).
 */

const {
  CONSULTATION_TYPES,
  DEFAULT_LAUNCH_COMMERCIAL_TEMPLATE,
  SETTLEMENT_STATUSES,
} = require('./constants');
const {
  getCommercialTermsDoc,
  upsertCommercialTerm,
  setTermActive,
  createChangeRequest,
  toProviderView,
  toPublicPrices,
} = require('./commercialTerms');
const {
  createPaymentPendingAppointment,
  confirmAppointmentPayment,
  failOrCancelAppointmentPayment,
  assertAppointmentStatusTransition,
} = require('./appointmentFinance');
const { transitionPayment, assertPaymentTransition } = require('./payments');
const {
  createSettlementDraft,
  completeSettlement,
  calculateOutstandingPayable,
  createReconciliationRecord,
} = require('./settlements');
const { calculateRefundImpact, calculateProviderPayable } = require('./pricing');
const { getSettings } = require('../platformUtils');

function registerFinanceRoutes(apiRouter, { db, verifyUser, verifyAdmin, requireApprovedProvider }) {
  // ---------- Defaults (admin) ----------
  apiRouter.get('/admin/commercial-defaults', verifyAdmin, (req, res) => {
    res.json({
      template: DEFAULT_LAUNCH_COMMERCIAL_TEMPLATE,
      consultationTypes: CONSULTATION_TYPES,
      note: 'Template defaults only — booking always loads per-provider active terms.',
    });
  });

  // ---------- Admin commercial terms ----------
  apiRouter.get('/admin/providers/:providerId/commercial-terms', verifyAdmin, async (req, res) => {
    try {
      const doc = await getCommercialTermsDoc(db, req.params.providerId);
      if (!doc) return res.json({ providerId: req.params.providerId, types: {} });
      res.json(toProviderView(doc));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.put('/admin/providers/:providerId/commercial-terms', verifyAdmin, async (req, res) => {
    try {
      const body = req.body || {};
      // Support single type or batch types{}
      if (body.types && typeof body.types === 'object') {
        const results = {};
        for (const type of CONSULTATION_TYPES) {
          if (!body.types[type]) continue;
          const r = await upsertCommercialTerm(
            db,
            req.params.providerId,
            { ...body.types[type], consultationType: type },
            req.user.uid
          );
          results[type] = r.term;
        }
        const doc = await getCommercialTermsDoc(db, req.params.providerId);
        return res.json({ message: 'Terms saved', types: results, document: toProviderView(doc) });
      }
      const result = await upsertCommercialTerm(db, req.params.providerId, body, req.user.uid);
      res.json({ message: 'Terms saved', term: result.term });
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  });

  apiRouter.post(
    '/admin/providers/:providerId/commercial-terms/:consultationType/activate',
    verifyAdmin,
    async (req, res) => {
      try {
        const active = req.body?.active !== false;
        const term = await setTermActive(
          db,
          req.params.providerId,
          req.params.consultationType,
          active,
          req.user.uid
        );
        res.json({ message: active ? 'Activated' : 'Deactivated', term });
      } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message });
      }
    }
  );

  // ---------- Provider: own terms (full commercial view) ----------
  apiRouter.get('/vendor/commercial-terms', requireApprovedProvider, async (req, res) => {
    try {
      const doc = await getCommercialTermsDoc(db, req.user.uid);
      if (!doc) return res.json({ providerId: req.user.uid, types: {}, message: 'No terms configured yet' });
      res.json(toProviderView(doc));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.post('/vendor/commercial-terms/change-request', requireApprovedProvider, async (req, res) => {
    try {
      const reqDoc = await createChangeRequest(db, req.user.uid, req.body || {}, req.user.uid);
      res.status(201).json({ message: 'Change request submitted for admin approval', request: reqDoc });
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  });

  // ---------- Public: patient-facing price only ----------
  apiRouter.get('/providers/:providerId/consultation-prices', async (req, res) => {
    try {
      const doc = await getCommercialTermsDoc(db, req.params.providerId);
      res.json({
        providerId: req.params.providerId,
        prices: toPublicPrices(doc),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ---------- Payment-capable booking (FEATURE FLAGGED) ----------
  apiRouter.post('/appointments/payment-hold', verifyUser, async (req, res) => {
    try {
      const settings = await getSettings(db);
      if (!settings.appointmentPaymentsEnabled) {
        return res.status(403).json({
          error: 'Appointment payments are not enabled',
          appointmentPaymentsEnabled: false,
        });
      }
      const {
        providerId,
        providerName,
        date,
        time,
        consultationType,
        notes,
        phone,
        discount,
      } = req.body || {};
      if (!providerId || !date || !time) {
        return res.status(400).json({ error: 'providerId, date, and time are required' });
      }

      const userDoc = await db.collection('users').doc(req.user.uid).get();
      const customerName = userDoc.exists ? userDoc.data().name : req.user.email;

      const result = await createPaymentPendingAppointment(db, {
        user: req.user,
        providerId,
        providerName,
        date,
        time,
        consultationType,
        notes,
        phone,
        customerName,
        discount: Number(discount) || 0,
        slotHoldMinutes: settings.slotHoldMinutes || 10,
        gatewayConfig: {
          absorbGatewayFees: true,
          gatewayFeeAmount: Number(settings.gatewayFeeAmount || 0),
        },
      });

      // Patients must not see internal payout split on this response
      const appt = { ...result.appointment };
      delete appt.providerPayout;
      delete appt.platformFee;
      delete appt.platformNetRevenue;
      if (appt.financialSnapshot) {
        appt.financialSnapshot = {
          consultationFee: appt.financialSnapshot.consultationFee,
          facilityFee: appt.financialSnapshot.facilityFee,
          discount: appt.financialSnapshot.discount,
          grossAmount: appt.financialSnapshot.grossAmount,
          currency: appt.financialSnapshot.currency,
          consultationType: appt.financialSnapshot.consultationType,
        };
      }

      res.status(201).json({
        appointment: appt,
        payment: {
          id: result.payment.id,
          paymentReference: result.payment.paymentReference,
          status: result.payment.status,
          grossAmount: result.payment.grossAmount,
          currency: result.payment.currency,
          expiresAt: result.hold.expiresAt,
        },
        hold: { id: result.hold.id, expiresAt: result.hold.expiresAt, status: result.hold.status },
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  });

  // Internal/admin simulation of payment outcomes (no Dialog Pay yet)
  apiRouter.post('/admin/payments/:paymentId/transition', verifyAdmin, async (req, res) => {
    try {
      const { status, providerTransactionId } = req.body || {};
      if (!status) return res.status(400).json({ error: 'status required' });

      if (status === 'PAID') {
        const result = await confirmAppointmentPayment(db, {
          paymentId: req.params.paymentId,
          providerTransactionId: providerTransactionId || null,
        });
        return res.json({ message: 'Payment confirmed', ...result });
      }
      if (status === 'FAILED' || status === 'CANCELLED') {
        const result = await failOrCancelAppointmentPayment(db, {
          paymentId: req.params.paymentId,
          outcome: status,
        });
        return res.json({ message: `Payment ${status}`, ...result });
      }
      const payment = await transitionPayment(db, req.params.paymentId, status, {
        providerTransactionId: providerTransactionId || undefined,
      });
      res.json({ message: 'Transition applied', payment });
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  });

  apiRouter.get('/admin/payments/:paymentId', verifyAdmin, async (req, res) => {
    try {
      const snap = await db.collection('payments').doc(req.params.paymentId).get();
      if (!snap.exists) return res.status(404).json({ error: 'Payment not found' });
      res.json({ id: snap.id, ...snap.data() });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.get('/admin/payments', verifyAdmin, async (req, res) => {
    try {
      const snap = await db.collection('payments').limit(200).get();
      const payments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      payments.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ---------- Settlements (admin ledger only) ----------
  apiRouter.get('/admin/settlements', verifyAdmin, async (req, res) => {
    try {
      const snap = await db.collection('settlements').limit(200).get();
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.get('/admin/providers/:providerId/payable', verifyAdmin, async (req, res) => {
    try {
      const snap = await db
        .collection('payments')
        .where('providerUserId', '==', req.params.providerId)
        .get();
      const payments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      res.json({
        providerId: req.params.providerId,
        outstandingEligible: calculateOutstandingPayable(payments),
        payments: payments.map((p) => ({
          id: p.id,
          paymentReference: p.paymentReference,
          providerPayout: p.providerPayout,
          providerPaymentStatus: p.providerPaymentStatus,
          status: p.status,
          appointmentId: p.appointmentId,
        })),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.post('/admin/settlements', verifyAdmin, async (req, res) => {
    try {
      const { providerId, periodStart, periodEnd, paymentIds, notes } = req.body || {};
      if (!providerId || !Array.isArray(paymentIds) || !paymentIds.length) {
        return res.status(400).json({ error: 'providerId and paymentIds[] required' });
      }
      let amount = 0;
      const appointmentIds = [];
      for (const pid of paymentIds) {
        const ps = await db.collection('payments').doc(pid).get();
        if (!ps.exists) return res.status(400).json({ error: `Payment not found: ${pid}` });
        const p = ps.data();
        if (p.providerUserId !== providerId) {
          return res.status(400).json({ error: `Payment ${pid} does not belong to provider` });
        }
        if (p.providerPaymentStatus !== 'ELIGIBLE') {
          return res.status(400).json({ error: `Payment ${pid} is not ELIGIBLE` });
        }
        amount += Number(p.providerPayout || 0);
        if (p.appointmentId) appointmentIds.push(p.appointmentId);
      }
      const settlement = await createSettlementDraft(db, {
        providerId,
        periodStart,
        periodEnd,
        amount,
        paymentIds,
        appointmentIds,
        status: SETTLEMENT_STATUSES.OPEN,
        notes,
      });
      res.status(201).json(settlement);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  });

  apiRouter.post('/admin/settlements/:id/complete', verifyAdmin, async (req, res) => {
    try {
      const settlement = await completeSettlement(db, req.params.id, {
        actorUid: req.user.uid,
        notes: req.body?.notes,
      });
      res.json({ message: 'Settlement marked paid (ledger only — no bank transfer)', settlement });
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  });

  // Mark appointment COMPLETED + evaluate eligibility (admin/ops)
  apiRouter.post('/admin/appointments/:id/complete-finance', verifyAdmin, async (req, res) => {
    try {
      const ref = db.collection('appointments').doc(req.params.id);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: 'Appointment not found' });
      const appt = snap.data();
      const check = assertAppointmentStatusTransition(appt.status, 'COMPLETED');
      if (!check.ok) return res.status(400).json({ error: check.error });

      const settings = await getSettings(db);
      const now = new Date();
      const completedAt = now.toISOString();
      await ref.update({
        status: 'COMPLETED',
        completedAt,
        updatedAt: completedAt,
      });

      const payable = calculateProviderPayable({
        snapshot: appt.financialSnapshot || {
          providerPayout: appt.providerPayout,
        },
        appointmentStatus: 'COMPLETED',
        paymentStatus: appt.paymentStatus || 'PAID',
        completedAt,
        holdHours: settings.providerPayoutHoldHours ?? 24,
        now,
      });

      // Immediately PENDING; eligibility after hold — store eligibleAt
      if (appt.paymentId) {
        await db.collection('payments').doc(appt.paymentId).update({
          providerPaymentStatus: payable.status,
          eligibleAt: payable.eligibleAt,
          updatedAt: completedAt,
        });
      }
      await ref.update({
        providerPaymentStatus: payable.status,
        eligibleAt: payable.eligibleAt,
      });

      res.json({
        message: 'Appointment completed; provider payable tracked',
        providerPaymentStatus: payable.status,
        eligibleAt: payable.eligibleAt,
        amount: payable.amount,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  });

  // Promote PENDING → ELIGIBLE when hold elapsed (admin batch helper)
  apiRouter.post('/admin/finance/promote-eligible', verifyAdmin, async (req, res) => {
    try {
      const settings = await getSettings(db);
      const holdHours = settings.providerPayoutHoldHours ?? 24;
      const snap = await db.collection('payments').where('providerPaymentStatus', '==', 'PENDING').get();
      const now = new Date();
      let promoted = 0;
      for (const doc of snap.docs) {
        const p = doc.data();
        if (p.status !== 'PAID') continue;
        let completedAt = p.eligibleAt ? null : null;
        if (p.appointmentId) {
          const a = await db.collection('appointments').doc(p.appointmentId).get();
          if (!a.exists || a.data().status !== 'COMPLETED') continue;
          completedAt = a.data().completedAt;
        }
        const payable = calculateProviderPayable({
          snapshot: p.financialSnapshot || { providerPayout: p.providerPayout },
          appointmentStatus: 'COMPLETED',
          paymentStatus: 'PAID',
          completedAt,
          holdHours,
          now,
        });
        if (payable.status === 'ELIGIBLE') {
          await doc.ref.update({
            providerPaymentStatus: 'ELIGIBLE',
            eligibleAt: payable.eligibleAt,
            updatedAt: now.toISOString(),
          });
          promoted += 1;
        }
      }
      res.json({ promoted, holdHours });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Refund ledger application (architecture; no gateway refund API yet)
  apiRouter.post('/admin/payments/:paymentId/refund', verifyAdmin, async (req, res) => {
    try {
      const { refundType, partialAmount } = req.body || {};
      const ref = db.collection('payments').doc(req.params.paymentId);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: 'Payment not found' });
      const payment = snap.data();
      if (payment.status !== 'PAID' && payment.status !== 'PARTIALLY_REFUNDED') {
        return res.status(400).json({ error: 'Only PAID payments can be refunded' });
      }

      const impact = calculateRefundImpact({
        snapshot: payment.financialSnapshot || {
          grossAmount: payment.grossAmount,
          providerPayout: payment.providerPayout,
          platformGrossRevenue: payment.platformGrossRevenue,
        },
        refundType,
        partialAmount,
        providerPaymentStatus: payment.providerPaymentStatus,
      });

      const nextPaymentStatus =
        refundType === 'FULL_REFUND'
          ? 'REFUNDED'
          : refundType === 'NO_REFUND'
            ? payment.status
            : 'PARTIALLY_REFUNDED';

      if (refundType !== 'NO_REFUND') {
        const check = assertPaymentTransition(payment.status, nextPaymentStatus);
        if (!check.ok) return res.status(400).json({ error: check.error });
      }

      const now = new Date().toISOString();
      const patch = {
        updatedAt: now,
        lastRefund: impact,
        providerPaymentStatus: impact.nextProviderPaymentStatus,
      };
      if (refundType !== 'NO_REFUND') {
        patch.status = nextPaymentStatus;
        patch.refundedAt = now;
      }
      await ref.update(patch);

      let reconciliation = null;
      if (impact.requiresReconciliation) {
        reconciliation = await createReconciliationRecord(db, {
          providerId: payment.providerUserId,
          paymentId: req.params.paymentId,
          appointmentId: payment.appointmentId,
          amount: impact.reconciliationAmount,
          reason: 'post_settlement_refund',
          actorUid: req.user.uid,
        });
      }

      if (payment.appointmentId && refundType === 'FULL_REFUND') {
        await db.collection('appointments').doc(payment.appointmentId).set(
          {
            providerPaymentStatus: impact.nextProviderPaymentStatus,
            paymentStatus: nextPaymentStatus,
            updatedAt: now,
          },
          { merge: true }
        );
      }

      res.json({ message: 'Refund ledger updated', impact, reconciliation });
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  });

  // Provider finance isolation — own payables only
  apiRouter.get('/vendor/finance', requireApprovedProvider, async (req, res) => {
    try {
      const snap = await db.collection('payments').where('providerUserId', '==', req.user.uid).get();
      const payments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const mine = payments.filter((p) => p.providerUserId === req.user.uid);
      res.json({
        outstandingEligible: calculateOutstandingPayable(mine),
        payments: mine.map((p) => ({
          id: p.id,
          paymentReference: p.paymentReference,
          appointmentId: p.appointmentId,
          status: p.status,
          grossAmount: p.grossAmount,
          providerPayout: p.providerPayout,
          platformGrossRevenue: p.platformGrossRevenue,
          providerPaymentStatus: p.providerPaymentStatus,
          paidAt: p.paidAt,
          createdAt: p.createdAt,
        })),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

module.exports = { registerFinanceRoutes };
