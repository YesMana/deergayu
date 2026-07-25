/**
 * Centralized server-side finance calculations.
 * All authoritative money math for consultations lives here.
 */

const {
  CONSULTATION_TYPES,
  PRICING_MODELS,
  CURRENCY_LKR,
  REFUND_TYPES,
  PROVIDER_PAYMENT_STATUSES,
} = require('./constants');

function roundMoney(n) {
  return Number((Number(n) || 0).toFixed(2));
}

/**
 * Validate / normalize a fixed or custom monetary split.
 * Equation: consultationPrice = providerPayout + platformGross + facilityFee
 */
function validateFixedSplitAmounts({
  consultationPrice,
  providerPayout,
  platformGross,
  facilityFee = 0,
}) {
  const price = roundMoney(consultationPrice);
  const payout = roundMoney(providerPayout);
  const platform = roundMoney(platformGross);
  const facility = roundMoney(facilityFee);
  const errors = [];

  if (!(price > 0)) errors.push('consultationPrice must be > 0');
  if (payout < 0) errors.push('providerPayout must be >= 0');
  if (platform < 0) errors.push('platformGross must be >= 0');
  if (facility < 0) errors.push('facilityFee must be >= 0');

  const sum = roundMoney(payout + platform + facility);
  if (errors.length === 0 && sum !== price) {
    errors.push(
      `Invalid split: providerPayout (${payout}) + platformGross (${platform}) + facilityFee (${facility}) = ${sum}, expected consultationPrice ${price}`
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    normalized: {
      consultationPrice: price,
      providerPayout: payout,
      platformGross: platform,
      facilityFee: facility,
    },
  };
}

/**
 * Calculate patient-facing + internal split from a commercial term document.
 * Never uses hardcoded 1000/600/400 — only the provided term fields.
 */
function calculateConsultationPricing(term, { discount = 0 } = {}) {
  if (!term || typeof term !== 'object') {
    throw new Error('Commercial terms are required');
  }
  const consultationType = String(term.consultationType || '');
  if (!CONSULTATION_TYPES.includes(consultationType)) {
    throw new Error(`Invalid consultationType: ${consultationType}`);
  }

  const model = String(term.pricingModel || PRICING_MODELS.FIXED_SPLIT);
  const facilityFee = roundMoney(term.facilityFee || 0);
  const disc = roundMoney(discount);
  if (disc < 0) throw new Error('discount must be >= 0');

  let consultationPrice;
  let providerPayout;
  let platformGross;

  if (model === PRICING_MODELS.PERCENTAGE_SPLIT) {
    consultationPrice = roundMoney(term.consultationPrice);
    const doctorPct = Number(term.doctorPercentage);
    const platformPct = Number(term.platformPercentage);
    if (!(consultationPrice > 0)) throw new Error('consultationPrice must be > 0');
    if (!Number.isFinite(doctorPct) || !Number.isFinite(platformPct)) {
      throw new Error('doctorPercentage and platformPercentage are required for PERCENTAGE_SPLIT');
    }
    if (roundMoney(doctorPct + platformPct) !== 100) {
      throw new Error('doctorPercentage + platformPercentage must equal 100');
    }
    const priceAfterFacility = roundMoney(consultationPrice - facilityFee);
    if (priceAfterFacility < 0) throw new Error('facilityFee cannot exceed consultationPrice');
    providerPayout = roundMoney((priceAfterFacility * doctorPct) / 100);
    platformGross = roundMoney(priceAfterFacility - providerPayout);
  } else {
    // FIXED_SPLIT and CUSTOM — both must satisfy the monetary equation
    const checked = validateFixedSplitAmounts({
      consultationPrice: term.consultationPrice,
      providerPayout: term.providerPayout,
      platformGross: term.platformGross,
      facilityFee,
    });
    if (!checked.ok) throw new Error(checked.errors.join('; '));
    consultationPrice = checked.normalized.consultationPrice;
    providerPayout = checked.normalized.providerPayout;
    platformGross = checked.normalized.platformGross;
  }

  if (disc > consultationPrice) throw new Error('discount cannot exceed consultationPrice');

  const grossAmount = roundMoney(consultationPrice - disc);
  // Discount reduces platform share first, then provider (never negative)
  let discountLeft = disc;
  let platformGrossAfter = platformGross;
  let providerPayoutAfter = providerPayout;
  const platformCut = Math.min(platformGrossAfter, discountLeft);
  platformGrossAfter = roundMoney(platformGrossAfter - platformCut);
  discountLeft = roundMoney(discountLeft - platformCut);
  if (discountLeft > 0) {
    providerPayoutAfter = roundMoney(Math.max(0, providerPayoutAfter - discountLeft));
  }

  return {
    currency: term.currency || CURRENCY_LKR,
    consultationType,
    pricingModel: model,
    consultationFee: consultationPrice,
    facilityFee,
    platformFee: platformGrossAfter,
    discount: disc,
    grossAmount,
    providerPayout: providerPayoutAfter,
    platformGrossRevenue: platformGrossAfter,
    termsVersion: term.version ?? null,
  };
}

/**
 * Gateway impact — Deergayu absorbs fees; never surcharge the patient.
 * Rate must come from config later; default 0 until configured.
 */
function calculateGatewayImpact(grossAmount, gatewayConfig = {}) {
  const absorb = gatewayConfig.absorbGatewayFees !== false; // launch policy: absorb
  const fee = roundMoney(gatewayConfig.gatewayFeeAmount ?? 0);
  if (fee < 0) throw new Error('gatewayFee must be >= 0');
  // Do not invent percentages — only explicit amount from verified config
  return {
    gatewayFee: fee,
    customerSurcharge: 0,
    absorbedByPlatform: absorb ? fee : 0,
    grossAmountChargedToCustomer: roundMoney(grossAmount),
  };
}

function createFinancialSnapshot(term, options = {}) {
  const pricing = calculateConsultationPricing(term, { discount: options.discount || 0 });
  const gateway = calculateGatewayImpact(pricing.grossAmount, options.gatewayConfig || {});
  const platformGrossRevenue = pricing.platformGrossRevenue;
  const platformNetRevenue = roundMoney(platformGrossRevenue - gateway.gatewayFee);

  return {
    consultationFee: pricing.consultationFee,
    facilityFee: pricing.facilityFee,
    platformFee: pricing.platformFee,
    discount: pricing.discount,
    grossAmount: pricing.grossAmount,
    gatewayFee: gateway.gatewayFee,
    providerPayout: pricing.providerPayout,
    platformGrossRevenue,
    platformNetRevenue,
    pricingModelUsed: pricing.pricingModel,
    termsVersion: pricing.termsVersion,
    termsCopiedAt: options.termsCopiedAt || new Date().toISOString(),
    currency: pricing.currency,
    consultationType: pricing.consultationType,
  };
}

/**
 * Refund impact on ledger amounts.
 * FULL_REFUND reverses unpaid provider payable; settled → needs reconciliation.
 */
function calculateRefundImpact({
  snapshot,
  refundType,
  partialAmount,
  providerPaymentStatus,
}) {
  if (!snapshot) throw new Error('snapshot required');
  const type = String(refundType || '');
  if (!Object.values(REFUND_TYPES).includes(type)) {
    throw new Error(`Invalid refundType: ${type}`);
  }

  const gross = roundMoney(snapshot.grossAmount);
  let customerRefund = 0;
  if (type === REFUND_TYPES.NO_REFUND) customerRefund = 0;
  else if (type === REFUND_TYPES.FULL_REFUND) customerRefund = gross;
  else {
    customerRefund = roundMoney(partialAmount);
    if (!(customerRefund > 0) || customerRefund > gross) {
      throw new Error('partialAmount must be > 0 and <= grossAmount');
    }
  }

  const ratio = gross > 0 ? customerRefund / gross : 0;
  const providerReversal = roundMoney(roundMoney(snapshot.providerPayout) * ratio);
  const platformReversal = roundMoney(roundMoney(snapshot.platformGrossRevenue) * ratio);

  const settled = providerPaymentStatus === PROVIDER_PAYMENT_STATUSES.PAID;
  const result = {
    refundType: type,
    customerRefund,
    providerPayableDelta: settled ? 0 : -providerReversal,
    platformGrossRevenueDelta: -platformReversal,
    platformNetRevenueDelta: -platformReversal,
    requiresReconciliation: settled && providerReversal > 0,
    reconciliationAmount: settled ? providerReversal : 0,
    nextProviderPaymentStatus: null,
  };

  if (type === REFUND_TYPES.FULL_REFUND) {
    if (settled) {
      result.nextProviderPaymentStatus = PROVIDER_PAYMENT_STATUSES.REVERSED;
    } else if (providerPaymentStatus === PROVIDER_PAYMENT_STATUSES.REVERSED) {
      result.nextProviderPaymentStatus = PROVIDER_PAYMENT_STATUSES.REVERSED;
    } else {
      result.nextProviderPaymentStatus = PROVIDER_PAYMENT_STATUSES.REVERSED;
      result.providerPayableDelta = -roundMoney(snapshot.providerPayout);
    }
  } else if (type === REFUND_TYPES.NO_REFUND) {
    result.nextProviderPaymentStatus = providerPaymentStatus || PROVIDER_PAYMENT_STATUSES.PENDING;
  } else if (!settled) {
    result.nextProviderPaymentStatus = PROVIDER_PAYMENT_STATUSES.HELD;
  } else {
    result.nextProviderPaymentStatus = PROVIDER_PAYMENT_STATUSES.PAID;
  }

  return result;
}

/**
 * After COMPLETED + hold window, mark ELIGIBLE.
 */
function calculateProviderPayable({
  snapshot,
  appointmentStatus,
  paymentStatus,
  completedAt,
  holdHours = 24,
  now = new Date(),
}) {
  if (!snapshot) return { amount: 0, status: PROVIDER_PAYMENT_STATUSES.PENDING, eligibleAt: null };
  if (String(paymentStatus) !== 'PAID') {
    return { amount: 0, status: PROVIDER_PAYMENT_STATUSES.PENDING, eligibleAt: null };
  }
  if (String(appointmentStatus) !== 'COMPLETED') {
    return {
      amount: roundMoney(snapshot.providerPayout),
      status: PROVIDER_PAYMENT_STATUSES.PENDING,
      eligibleAt: null,
    };
  }
  const completed = completedAt ? new Date(completedAt) : null;
  if (!completed || Number.isNaN(completed.getTime())) {
    return {
      amount: roundMoney(snapshot.providerPayout),
      status: PROVIDER_PAYMENT_STATUSES.PENDING,
      eligibleAt: null,
    };
  }
  const eligibleAt = new Date(completed.getTime() + Number(holdHours) * 3600 * 1000);
  const eligible = now.getTime() >= eligibleAt.getTime();
  return {
    amount: roundMoney(snapshot.providerPayout),
    status: eligible ? PROVIDER_PAYMENT_STATUSES.ELIGIBLE : PROVIDER_PAYMENT_STATUSES.PENDING,
    eligibleAt: eligibleAt.toISOString(),
  };
}

/** Strip internal split for patient/public responses. */
function publicConsultationPriceView(term) {
  if (!term || !term.active) return null;
  return {
    consultationType: term.consultationType,
    currency: term.currency || CURRENCY_LKR,
    consultationPrice: roundMoney(term.consultationPrice),
    facilityFee: roundMoney(term.facilityFee || 0) > 0 ? roundMoney(term.facilityFee) : undefined,
  };
}

module.exports = {
  roundMoney,
  validateFixedSplitAmounts,
  calculateConsultationPricing,
  calculateGatewayImpact,
  createFinancialSnapshot,
  calculateRefundImpact,
  calculateProviderPayable,
  publicConsultationPriceView,
};
