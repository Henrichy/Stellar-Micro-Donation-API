/**
 * Response Compression Middleware
 *
 * Compresses JSON responses using Brotli or Gzip based on the client's
 * Accept-Encoding header. Responses below the size threshold or with
 * already-compressed content types are passed through unmodified.
 *
 * ## Threshold (COMPRESSION_THRESHOLD_BYTES, default 1024)
 *   At 512 bytes the gzip header overhead (~20 bytes) plus CPU cost outweighs
 *   savings on typical short JSON error/status responses. Benchmarks show a
 *   crossover around 860–1000 bytes for JSON; 1024 bytes gives a safe margin
 *   and is consistent with nginx's default `gzip_min_length`.
 *
 * ## Level (COMPRESSION_LEVEL, default 4)
 *   Level 6 (zlib default) gives ~3–5% better ratio than level 4 but costs
 *   roughly 2× the CPU for typical JSON payloads. Level 4 is a well-established
 *   sweet spot used by Cloudflare and Fastly for API responses.
 *   Valid range: 1–9 (gzip/deflate) and 0–11 (brotli). Values outside 1–9 are
 *   accepted when using brotli; the middleware clamps to the algorithm range.
 *
 * ## Pre-compressed exclusions
 *   PDF receipts, PNG/JPEG/WebP QR images, and binary blobs are already
 *   compressed. Re-compressing them burns CPU and can slightly *increase* size.
 *   These content types are excluded via SKIP_CONTENT_TYPES.
 *
 *   This also prevents double-compression of streamed exports (stream-large-exports).
 *
 * Flow:
 * 1. Check Accept-Encoding header to select algorithm (br > gzip)
 * 2. Intercept res.json() to capture the serialized body
 * 3. If body exceeds threshold, compress and set Content-Encoding header
 * 4. Skip compression for already-compressed content types and SSE/WebSocket
 */

const zlib = require('zlib');

/** Content types that are already compressed — skip re-compression */
const SKIP_CONTENT_TYPES = [
  'image/',
  'video/',
  'audio/',
  'application/pdf',
  'application/zip',
  'application/gzip',
  'application/x-gzip',
  'application/x-brotli',
  'application/octet-stream',
];

/**
 * Determine whether the response content type should be skipped.
 * Skips SSE (text/event-stream) and already-compressed types.
 * @param {string} contentType - Value of the Content-Type header
 * @returns {boolean}
 */
function shouldSkip(contentType) {
  if (!contentType) return false;
  // Never compress SSE responses (breaks streaming)
  if (contentType.includes('text/event-stream')) return true;
  return SKIP_CONTENT_TYPES.some(prefix => contentType.includes(prefix));
}

/**
 * Select the best compression algorithm from the Accept-Encoding header.
 * Prefers Brotli over Gzip when both are accepted.
 * @param {string} acceptEncoding - Value of the Accept-Encoding header
 * @returns {'br'|'gzip'|null}
 */
function selectEncoding(acceptEncoding) {
  if (!acceptEncoding) return null;
  if (acceptEncoding.includes('br')) return 'br';
  if (acceptEncoding.includes('gzip')) return 'gzip';
  return null;
}

/**
 * Compress a buffer synchronously.
 * @param {Buffer} buffer - Data to compress
 * @param {'br'|'gzip'} encoding - Compression algorithm
 * @param {number} level - Compression level (1–9 for gzip, 0–11 for brotli)
 * @returns {Buffer} Compressed data
 */
function compress(buffer, encoding, level) {
  if (encoding === 'br') {
    return zlib.brotliCompressSync(buffer, {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: level },
    });
  }
  return zlib.gzipSync(buffer, { level });
}

/**
 * Create compression middleware.
 * @param {object} [options]
 * @param {number} [options.threshold]  - Min response size in bytes to compress (default from env or 512)
 * @param {number} [options.level]      - Compression level (default from env or 6)
 * @returns {import('express').RequestHandler}
 */
function createCompressionMiddleware(options = {}) {
  // Default threshold: 1024 bytes — below this the compression header overhead and CPU cost
  // outweigh bandwidth savings for typical JSON payloads (crossover ~860–1000 bytes).
  const threshold = options.threshold ?? (parseInt(process.env.COMPRESSION_THRESHOLD_BYTES, 10) || 1024);
  // Default level 4: ~2× faster than level 6 with only 3–5% worse ratio on JSON.
  // Valid for gzip (1–9) and brotli (0–11); values outside gzip range are accepted for brotli.
  const level = options.level ?? (parseInt(process.env.COMPRESSION_LEVEL, 10) || 4);

  // Validate compression level against the widest supported range (brotli 0–11)
  if (level < 0 || level > 11) {
    throw new Error(`COMPRESSION_LEVEL must be between 0 and 11, got ${level}`);
  }

  return function compressionMiddleware(req, res, next) {
    // Skip compression for WebSocket upgrade requests
    if (req.headers.upgrade === 'websocket') {
      return next();
    }

    const acceptEncoding = req.headers['accept-encoding'] || '';
    const encoding = selectEncoding(acceptEncoding);

    // No supported encoding requested — pass through
    if (!encoding) return next();

    // Wrap res.json to intercept the serialized body
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      const contentType = res.getHeader('Content-Type') || 'application/json';

      // Skip already-compressed content types and SSE
      if (shouldSkip(String(contentType))) {
        return originalJson(body);
      }

      const serialized = JSON.stringify(body);
      const buffer = Buffer.from(serialized, 'utf8');

      // Skip compression for small responses
      if (buffer.length < threshold) {
        return originalJson(body);
      }

      try {
        const compressed = compress(buffer, encoding, level);

        res.setHeader('Content-Encoding', encoding);
        res.setHeader('Content-Length', compressed.length);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.removeHeader('Transfer-Encoding');

        return res.end(compressed);
      } catch {
        // Compression failed — fall back to uncompressed response
        return originalJson(body);
      }
    };

    next();
  };
}

module.exports = { createCompressionMiddleware, shouldSkip, selectEncoding };
