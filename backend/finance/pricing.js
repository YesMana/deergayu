/**
 * Centralized server-side finance calculations (integer minor units).
 *
 * Canonical launch equation (pre-discount):
 *   consultationFee = providerPayout + platformGrossRevenue + facilityFee
 *
 * Example: 1000 = 600 + 400 + 0
 *
 * Field meanings (used everywhere — terms, snapshot, payment, settlement, refund):
 *   consultationFee      Patient consultation list price (pre-discount)
 *   providerPayout       Amount owed to doctor (pre-discount; adjusted if discount applied)
 *   platformGrossRevenue Deergayu gross share before gateway fee
 *   facilityFee          Optional clinic/hospital component (default 0); included in equation
 *   discount             Reduction of patient total (reduces platform share first, then provider)
 *   customerTotal        Amount charged to patient (= consultationFee - discount). Alias: grossAmount
 *   gatewayFee           Payment gateway cost (tracked separately; Deergayu absorbs — no surcharge)
 *   platformNetRevenue   platformGrossRevenue - gatewayFee
 *
 * Note: `platformFee` is NOT used as a distinct concept. Where legacy schema lists
 * platformFee on a payment row, it MUST equal platformGrossRevenue.
 */

const {
  CONSULTATION_TYPES,
  PRICING_MODELS,
  CURRENCY_LKR,
  REFUND_TYPES,
  PROVIDER_PAYMENT_STATUSES,
} = require('./constants');
const { toMinor, toMinorOrZero, fromMinor, addMinor, subMinor } = require('./money');

/** @deprecated use fromMinor — kept for callers expecting roundMoney(major)->major */
function roundMoney(n) {
  return fromMinor(toMinorOrZero(n));
}

/**
 * Validate fixed/custom split in minor units.
 * consultationFee = providerPayout + platformGrossRevenue + facilityFee
 */
function validateFixedSplitAmounts({
  consultationPrice,
  providerPayout,
  platformGross,
  facilityFee = 0,
}) {
  const errors = [];
  let priceM;
  let payoutM;
  let platformM;
  let facilityM;
  try {
    priceM = toMinor(consultationPrice, 'consultationPrice');
    payoutM = toMinor(providerPayout, 'providerPayout');
    platformM = toMinor(platformGross, 'platformGross');
    facilityM = toMinorOrZero(facilityFee, 'facilityFee');
  } catch (e) {
    return { ok: false, errors: [e.message], normalized: null };
  }

  if (!(priceM > 0)) errors.push('consultationPrice must be > 0');
  if (payoutM < 0) errors.push('providerPayout must be >= 0');
  if (platformM < 0) errors.push('platformGross must be >= 0');
  if (facilityM < 0) errors.push('facilityFee must be >= 0');

  const sum = addMinor(payoutM, platformM, facilityM);
  if (errors.length === 0 && sum !== priceM) {
    errors.push(
      `Invalid split: providerPayout (${fromMinor(payoutM)}) + platformGross (${fromMinor(platformM)}) + facilityFee (${fromMinor(facilityM)}) = ${fromMinor(sum)}, expected consultationPrice ${fromMinor(priceM)}`
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    normalized: errors.length
      ? null
      : {
          consultationPrice: fromMinor(priceM),
          providerPayout: fromMinor(payoutM),
          platformGross: fromMinor(platformM),
          facilityFee: fromMinor(facilityM),
          _minor: { priceM, payoutM, platformM, facilityM },
        },
  };
}

function calculateConsultationPricing(term, { discount = 0 } = {}) {
  if (!term || typeof term !== 'object') {
    const err = new Error('COMMERCIAL_TERMS_NOT_CONFIGURED');
    err.code = 'COMMERCIAL_TERMS_NOT_CONFIGURED';
    throw err;
  }
  const consultationType = String(term.consultationType || '');
  if (!CONSULTATION_TYPES.includes(consultationType)) {
    throw new Error(`Invalid consultationType: ${consultationType}`);
  }

  const model = String(term.pricingModel || PRICING_MODELS.FIXED_SPLIT);
  let facilityM = toMinorOrZero(term.facilityFee, 'facilityFee');
  let discM;
  try {
    discM = toMinorOrZero(discount, 'discount');
  } catch (e) {
    throw e;
  }
  if (discM < 0) throw new Error('discount must be >= 0');

  let priceM;
  let payoutM;
  let platformM;

  if (model === PRICING_MODELS.PERCENTAGE_SPLIT) {
    priceM = toMinor(term.consultationPrice, 'consultationPrice');
    const doctorPct = Number(term.doctorPercentage);
    const platformPct = Number(term.platformPercentage);
    if (!(priceM > 0)) throw new Error('consultationPrice must be > 0');
    if (!Number.isFinite(doctorPct) || !Number.isFinite(platformPct)) {
      throw new Error('doctorPercentage and platformPercentage are required for PERCENTAGE_SPLIT');
    }
    if (Math.round((doctorPct + platformPct) * 100) !== 10000) {
      throw new Error('doctorPercentage + platformPercentage must equal 100');
    }
    if (facilityM > priceM) throw new Error('facilityFee cannot exceed consultationPrice');
    const afterFacility = subMinor(priceM, facilityM);
    payoutM = Math.floor((afterFacility * doctorPct) / 100);
    platformM = subMinor(afterFacility, payoutM);
  } else {
    const checked = validateFixedSplitAmounts({
      consultationPrice: term.consultationPrice,
      providerPayout: term.providerPayout,
      platformGross: term.platformGross,
      facilityFee: term.facilityFee || 0,
    });
    if (!checked.ok) throw new Error(checked.errors.join('; '));
    priceM = checked.normalized._minor.priceM;
    payoutM = checked.normalized._minor.payoutM;
    platformM = checked.normalized._minor.platformM;
    facilityM = checked.normalized._minor.facilityM;
  }

  if (discM > priceM) throw new Error('discount cannot exceed consultationPrice');

  // Discount reduces platform share first, then provider (integer minor units)
  let discountLeft = discM;
  const platformCut = Math.min(platformM, discountLeft);
  platformM = subMinor(platformM, platformCut);
  discountLeft = subMinor(discountLeft, platformCut);
  if (discountLeft > 0) {
    payoutM = Math.max(0, subMinor(payoutM, discountLeft));
  }

  const customerTotalM = subMinor(priceM, discM);

  return {
    currency: term.currency || CURRENCY_LKR,
    consultationType,
    pricingModel: model,
    consultationFee: fromMinor(priceM),
    facilityFee: fromMinor(facilityM),
    providerPayout: fromMinor(payoutM),
    platformGrossRevenue: fromMinor(platformM),
    discount: fromMinor(discM),
    customerTotal: fromMinor(customerTotalM),
    /** @deprecated alias of customerTotal — kept for payment schema compatibility */
    grossAmount: fromMinor(customerTotalM),
    termsVersion: term.version ?? null,
    _minor: {
      consultationFee: priceM,
      facilityFee: facilityM,
      providerPayout: payoutM,
      platformGrossRevenue: platformM,
      discount: discM,
      customerTotal: customerTotalM,
    },
  };
}

function calculateGatewayImpact(customerTotal, gatewayConfig = {}) {
  const absorb = gatewayConfig.absorbGatewayFees !== false;
  const feeM = toMinorOrZero(gatewayConfig.gatewayFeeAmount, 'gatewayFee');
  if (feeM < 0) throw new Error('gatewayFee must be >= 0');
  const customerM = toMinor(customerTotal, 'customerTotal');
  return {
    gatewayFee: fromMinor(feeM),
    customerSurcharge: 0,
    absorbedByPlatform: absorb ? fromMinor(feeM) : 0,
    customerTotal: fromMinor(customerM),
    grossAmountChargedToCustomer: fromMinor(customerM),
    _minor: { gatewayFee: feeM, customerTotal: customerM },
  };
}

function createFinancialSnapshot(term, options = {}) {
  if (!term) {
    const err = new Error('COMMERCIAL_TERMS_NOT_CONFIGURED');
    err.code = 'COMMERCIAL_TERMS_NOT_CONFIGURED';
    err.statusCode = 400;
    throw err;
  }
  const pricing = calculateConsultationPricing(term, { discount: options.discount || 0 });
  const gateway = calculateGatewayImpact(pricing.customerTotal, options.gatewayConfig || {});
  const platformGrossRevenue = pricing.platformGrossRevenue;
  const platformNetRevenue = fromMinor(
    subMinor(pricing._minor.platformGrossRevenue, gateway._minor.gatewayFee)
  );

  return {
    consultationFee: pricing.consultationFee,
    facilityFee: pricing.facilityFee,
    providerPayout: pricing.providerPayout,
    platformGrossRevenue,
    /** Equals platformGrossRevenue — not a separate fee concept */
    platformFee: platformGrossRevenue,
    discount: pricing.discount,
    customerTotal: pricing.customerTotal,
    grossAmount: pricing.customerTotal,
    gatewayFee: gateway.gatewayFee,
    platformNetRevenue,
    pricingModelUsed: pricing.pricingModel,
    termsVersion: pricing.termsVersion,
    termsCopiedAt: options.termsCopiedAt || new Date().toISOString(),
    currency: pricing.currency,
    consultationType: pricing.consultationType,
    equation:
      'consultationFee = providerPayout + platformGrossRevenue + facilityFee (pre-discount); customerTotal = consultationFee - discount; platformNetRevenue = platformGrossRevenue - gatewayFee',
  };
}

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

  const grossM = toMinor(snapshot.customerTotal ?? snapshot.grossAmount, 'customerTotal');
  let refundM = 0;
  if (type === REFUND_TYPES.NO_REFUND) refundM = 0;
  else if (type === REFUND_TYPES.FULL_REFUND) refundM = grossM;
  else {
    refundM = toMinor(partialAmount, 'partialAmount');
    if (!(refundM > 0) || refundM > grossM) {
      throw new Error('partialAmount must be > 0 and <= customerTotal');
    }
  }

  const payoutM = toMinorOrZero(snapshot.providerPayout, 'providerPayout');
  const platformM = toMinorOrZero(snapshot.platformGrossRevenue, 'platformGrossRevenue');

  // Proportional reversal in minor units
  const providerReversalM =
    grossM === 0 ? 0 : Math.floor((payoutM * refundM) / grossM);
  const platformReversalM =
    grossM === 0 ? 0 : Math.floor((platformM * refundM) / grossM);

  const settled = providerPaymentStatus === PROVIDER_PAYMENT_STATUSES.PAID;
  const result = {
    refundType: type,
    customerRefund: fromMinor(refundM),
    providerPayableDelta: settled ? 0 : -fromMinor(providerReversalM),
    platformGrossRevenueDelta: -fromMinor(platformReversalM),
    platformNetRevenueDelta: -fromMinor(platformReversalM),
    requiresReconciliation: settled && providerReversalM > 0,
    reconciliationAmount: settled ? fromMinor(providerReversalM) : 0,
    nextProviderPaymentStatus: null,
  };

  if (type === REFUND_TYPES.FULL_REFUND) {
    result.nextProviderPaymentStatus = PROVIDER_PAYMENT_STATUSES.REVERSED;
    if (!settled) {
      result.providerPayableDelta = -fromMinor(payoutM);
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
  const amount = fromMinor(toMinorOrZero(snapshot.providerPayout));
  if (String(appointmentStatus) !== 'COMPLETED') {
    return { amount, status: PROVIDER_PAYMENT_STATUSES.PENDING, eligibleAt: null };
  }
  const completed = completedAt ? new Date(completedAt) : null;
  if (!completed || Number.isNaN(completed.getTime())) {
    return { amount, status: PROVIDER_PAYMENT_STATUSES.PENDING, eligibleAt: null };
  }
  const eligibleAt = new Date(completed.getTime() + Number(holdHours) * 3600 * 1000);
  const eligible = now.getTime() >= eligibleAt.getTime();
  return {
    amount,
    status: eligible ? PROVIDER_PAYMENT_STATUSES.ELIGIBLE : PROVIDER_PAYMENT_STATUSES.PENDING,
    eligibleAt: eligibleAt.toISOString(),
  };
}

function publicConsultationPriceView(term) {
  if (!term || term.active === false) return null;
  const fee = fromMinor(toMinor(term.consultationPrice, 'consultationPrice'));
  const facility = fromMinor(toMinorOrZero(term.facilityFee));
  const out = {
    consultationType: term.consultationType,
    currency: term.currency || CURRENCY_LKR,
    consultationPrice: fee,
  };
  if (facility > 0) out.facilityFee = facility;
  return out;
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
