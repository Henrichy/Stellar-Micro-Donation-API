/**
 * Money Utility - Integer Stroop Arithmetic
 *
 * All monetary values are represented as BigInt stroops (1 XLM = 10,000,000 stroops).
 * Fee rates are expressed in basis points (1 bps = 0.01%). Integer division always
 * floors (truncates toward zero), rounding in the platform's favor for fees.
 *
 * Rounding rule: floor (BigInt division truncates). This is documented and consistent —
 * a fee is never rounded up against the donor.
 */

const STROOPS_PER_XLM = 10_000_000n;
const BPS_DIVISOR = 10_000n;

/**
 * Convert an XLM string or number to BigInt stroops.
 * Accepts: "1.234567", 1.234567, "5", 5
 * Throws for non-finite or negative input.
 * @param {string|number} xlm
 * @returns {bigint}
 */
function toStroops(xlm) {
  // Normalise to string for exact decimal handling
  const str = String(xlm).trim();
  if (!/^-?\d+(\.\d+)?$/.test(str)) {
    throw new Error(`Invalid XLM amount: ${xlm}`);
  }
  const [whole, frac = ''] = str.split('.');
  // Pad / truncate fractional part to exactly 7 digits
  const fracPadded = frac.padEnd(7, '0').slice(0, 7);
  const stroops = BigInt(whole) * STROOPS_PER_XLM + BigInt(fracPadded);
  if (stroops < 0n) {
    throw new Error(`Amount must be non-negative: ${xlm}`);
  }
  return stroops;
}

/**
 * Convert BigInt stroops to a 7-decimal XLM display string.
 * @param {bigint} stroops
 * @returns {string}  e.g. "1.2345670"
 */
function fromStroops(stroops) {
  if (typeof stroops !== 'bigint') {
    throw new Error('fromStroops expects a BigInt');
  }
  const abs = stroops < 0n ? -stroops : stroops;
  const sign = stroops < 0n ? '-' : '';
  const whole = abs / STROOPS_PER_XLM;
  const frac = abs % STROOPS_PER_XLM;
  return `${sign}${whole}.${String(frac).padStart(7, '0')}`;
}

/**
 * Calculate a fee in stroops using basis points (integer math, floors in platform's favor).
 * feeStroops = floor(amountStroops * bps / 10000)
 *
 * @param {bigint} amountStroops
 * @param {bigint|number} bps  - fee rate in basis points (e.g. 200 = 2%)
 * @param {object} [opts]
 * @param {bigint} [opts.minFeeStroops]  - minimum fee clamp (default 0n)
 * @param {bigint} [opts.maxFeeStroops]  - maximum fee clamp (default unbounded)
 * @param {bigint|number} [opts.surgeMultiplierBps]  - surge multiplier in bps (e.g. 15000 = 1.5×)
 * @returns {bigint}
 */
function calcFee(amountStroops, bps, opts = {}) {
  if (typeof amountStroops !== 'bigint') {
    throw new Error('calcFee: amountStroops must be BigInt');
  }
  const bpsBig = BigInt(bps);
  if (bpsBig < 0n) {
    throw new Error('calcFee: bps must be non-negative');
  }

  let effectiveBps = bpsBig;

  // Apply surge multiplier if provided (surge is also in bps; e.g. 15000n = 1.5×)
  if (opts.surgeMultiplierBps !== undefined) {
    const surgeBps = BigInt(opts.surgeMultiplierBps);
    // effectiveBps = floor(bps * surgeMultiplierBps / 10000)
    effectiveBps = bpsBig * surgeBps / BPS_DIVISOR;
  }

  // floor division (BigInt division truncates toward zero, which equals floor for positives)
  let fee = amountStroops * effectiveBps / BPS_DIVISOR;

  const minFee = opts.minFeeStroops !== undefined ? BigInt(opts.minFeeStroops) : 0n;
  if (fee < minFee) fee = minFee;

  if (opts.maxFeeStroops !== undefined) {
    const maxFee = BigInt(opts.maxFeeStroops);
    if (fee > maxFee) fee = maxFee;
  }

  return fee;
}

/** Add two BigInt stroop values. */
function addStroops(a, b) {
  return BigInt(a) + BigInt(b);
}

/** Subtract two BigInt stroop values. */
function subtractStroops(a, b) {
  return BigInt(a) - BigInt(b);
}

module.exports = {
  STROOPS_PER_XLM,
  BPS_DIVISOR,
  toStroops,
  fromStroops,
  calcFee,
  addStroops,
  subtractStroops,
};
