/**
 * Schema Version Middleware
 *
 * RESPONSIBILITY: Parse and normalise the X-Schema-Version request header, then
 * expose it on req.schemaVersion for downstream schema validation.
 *
 * VERSIONING CONTRACT (single, authoritative):
 *   - URL path   (/api/v{MAJOR}) governs the *API surface version* and changes
 *     only on a MAJOR (breaking) release.  All current routes live under /api/v1.
 *   - X-Schema-Version header governs the *request-body schema variant* used by
 *     a specific endpoint.  Values are full semver strings (e.g. "1.0.0", "2.0.0").
 *
 * These two mechanisms serve distinct concerns and must not be conflated:
 *   - Omitting X-Schema-Version is fine; the endpoint will use the latest schema.
 *   - Providing an integer like "1" is accepted and normalised to "1.0.0" for
 *     backward compatibility with older clients.
 *   - An unparseable or out-of-range value is stored as-is so that schemaValidation
 *     can return a descriptive 400 error rather than a generic one here.
 *
 * What this middleware does NOT do:
 *   - It does not select a schema — that is schemaValidation's job.
 *   - It does not govern routing — that is the URL path's job.
 *   - It does not impose any Accept-Version / API version negotiation on the path.
 */

'use strict';

const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const INTEGER_RE = /^\d+$/;

/**
 * Normalise a raw X-Schema-Version value to a semver string, or return
 * the raw value unchanged when it cannot be normalised (so downstream
 * validators can reject it with a proper error message).
 *
 * @param {string} raw - Raw header value.
 * @returns {string} Normalised semver string or original raw value.
 */
function normaliseSchemaVersion(raw) {
  if (!raw) return '1.0.0'; // default: latest stable schema

  const trimmed = raw.trim();

  // Already a valid semver — pass through as-is
  if (SEMVER_RE.test(trimmed)) return trimmed;

  // Integer shorthand (e.g. "1", "2") — expand to x.0.0
  if (INTEGER_RE.test(trimmed)) {
    const major = parseInt(trimmed, 10);
    if (major >= 1) return `${major}.0.0`;
  }

  // Unrecognised format — return raw so schemaValidation can reject it properly
  return trimmed;
}

/**
 * Express middleware that attaches a normalised schema version to every request.
 *
 * Sets req.schemaVersion (string, semver) — consumed by validateSchema() in
 * src/middleware/schemaValidation.js.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function schemaVersionMiddleware(req, res, next) {
  req.schemaVersion = normaliseSchemaVersion(req.get('X-Schema-Version'));
  next();
}

module.exports = schemaVersionMiddleware;
module.exports.normaliseSchemaVersion = normaliseSchemaVersion;
