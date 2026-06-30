/**
 * Network Constants — Pure Invariants Layer
 *
 * RESPONSIBILITY: Stellar/network-level invariants and default well-known port numbers.
 * OWNER: Platform Team
 * DEPENDENCIES: None (foundational module)
 *
 * These are protocol/network invariants — not tunables.
 * For env-overridable Horizon URLs or network selection, see src/config/.
 */

/**
 * Stellar amount precision: 1 XLM = 10,000,000 stroops.
 * Use this constant to convert between XLM (user-facing) and stroops (storage).
 */
const STROOPS_PER_XLM = 10_000_000;

/**
 * Stellar base fee (minimum network fee) in stroops.
 * The Stellar network charges 100 stroops per operation by default.
 * Used as a fallback when NetworkStatusService has no cached fee.
 */
const STELLAR_BASE_FEE_STROOPS = 100;

/**
 * Number of decimal places preserved when converting stroops → XLM strings.
 * XLM has 7 significant decimal digits by SDK convention.
 */
const XLM_DECIMAL_PLACES = 7;

/**
 * Default HTTP / HTTPS port when the parsed URL omits one.
 * Standard ports per IANA / RFC 6335.
 */
const DEFAULT_HTTP_PORT = 80;
const DEFAULT_HTTPS_PORT = 443;

/**
 * Default request timeout (ms) for outbound webhook deliveries.
 * Kept here because it's a network-protocol invariant, not a configurable tunable.
 */
const DEFAULT_WEBHOOK_TIMEOUT_MS = 10 * 1000;

module.exports = Object.freeze({
  STROOPS_PER_XLM,
  STELLAR_BASE_FEE_STROOPS,
  XLM_DECIMAL_PLACES,
  DEFAULT_HTTP_PORT,
  DEFAULT_HTTPS_PORT,
  DEFAULT_WEBHOOK_TIMEOUT_MS,
});
