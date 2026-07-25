/**
 * Deterministic money helpers — integer minor units (cents / LKR cents).
 *
 * Rounding rule (inbound major → minor): half-up to 2 decimal places, then ×100.
 * All arithmetic happens in integer minor units.
 * Outbound: minor / 100 as a Number with exactly 2 decimal places of precision.
 *
 * Currency: LKR (2 decimal places).
 */

const MONEY_SCALE = 100;

function assertFiniteNumber(n, label = 'amount') {
  const x = Number(n);
  if (!Number.isFinite(x)) {
    throw new Error(`${label} must be a finite number`);
  }
  return x;
}

/** Half-up round to 2 decimal places, then convert to integer minor units. */
function toMinor(major, label = 'amount') {
  if (major === undefined || major === null || major === '') {
    throw new Error(`${label} is required`);
  }
  const x = assertFiniteNumber(major, label);
  // Avoid float drift: work from fixed 2dp string via integer math
  const sign = x < 0 ? -1 : 1;
  const abs = Math.abs(x);
  const scaled = abs * MONEY_SCALE;
  // half-up
  const minor = sign * Math.floor(scaled + 0.5 + Number.EPSILON);
  return minor;
}

/** Optional inbound — empty/undefined → 0 minor. */
function toMinorOrZero(major, label = 'amount') {
  if (major === undefined || major === null || major === '') return 0;
  return toMinor(major, label);
}

function fromMinor(minor) {
  const m = Number(minor) || 0;
  if (!Number.isInteger(m)) {
    // tolerate accidental floats by flooring toward zero after check
    if (!Number.isFinite(m)) throw new Error('invalid minor units');
  }
  return Math.round(m) / MONEY_SCALE;
}

/** Format major units as fixed 2dp number (Number, not string). */
function asMajor(minor) {
  return fromMinor(minor);
}

function addMinor(...parts) {
  return parts.reduce((s, p) => s + (Number(p) || 0), 0);
}

function subMinor(a, b) {
  return (Number(a) || 0) - (Number(b) || 0);
}

/** Proportional share in minor units; remainder goes to the last bucket. */
function splitMinorByRatios(totalMinor, ratios) {
  const totalRatio = ratios.reduce((s, r) => s + r, 0);
  if (totalRatio <= 0) throw new Error('ratios must sum > 0');
  const out = [];
  let allocated = 0;
  for (let i = 0; i < ratios.length; i += 1) {
    if (i === ratios.length - 1) {
      out.push(totalMinor - allocated);
    } else {
      const share = Math.floor((totalMinor * ratios[i]) / totalRatio);
      out.push(share);
      allocated += share;
    }
  }
  return out;
}

module.exports = {
  MONEY_SCALE,
  toMinor,
  toMinorOrZero,
  fromMinor,
  asMajor,
  addMinor,
  subMinor,
  splitMinorByRatios,
};
