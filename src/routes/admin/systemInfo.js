'use strict';

/**
 * GET /admin/system/info
 * Returns a live snapshot of system state for operations/SRE teams.
 * Requires admin authentication. Rate-limited to 10 req/min per API key.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { requireAdmin } = require('../../middleware/rbac');
const { createRateLimiter } = require('../../middleware/rateLimiter');

const systemInfoRateLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next()
  : createRateLimiter({
      windowMs: 60 * 1000,
      max: 10,
      keyGenerator: (req) => req.apiKey?.id || req.ip,
    });

/** Patterns for environment variable names that must be redacted. */
const SENSITIVE_PATTERN = /(_SECRET|_KEY|_TOKEN|_PASSWORD|API_KEYS|ENCRYPTION_KEY|DATABASE_URL)$/i;

/** Format uptime seconds into a human-readable string. */
function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

/** Convert bytes to MB rounded to 1 decimal. */
function toMB(bytes) {
  return Math.round((bytes / 1024 / 1024) * 10) / 10;
}

/** Get database file size in MB, or null if unavailable. */
function getDbFileSizeMB() {
  try {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../../../data/stellar_donations.db');
    const stat = fs.statSync(dbPath);
    return toMB(stat.size);
  } catch {
    return null;
  }
}

/** Check database connectivity. */
async function getDbStatus() {
  try {
    const Database = require('../../utils/database');
    await Database.query('SELECT 1', []);
    return 'healthy';
  } catch {
    return 'unhealthy';
  }
}

router.get('/', requireAdmin(), systemInfoRateLimiter, async (req, res, next) => {
  try {
    const uptimeSeconds = Math.floor(process.uptime());
    const mem = process.memoryUsage();
    const pkg = require('../../../package.json');

    const [dbStatus, dbFileSizeMB] = await Promise.all([
      getDbStatus(),
      Promise.resolve(getDbFileSizeMB()),
    ]);

    res.json({
      application: {
        name: pkg.name || 'stellar-micro-donation-api',
        version: pkg.version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: formatUptime(uptimeSeconds),
        uptimeSeconds,
        startedAt: new Date(Date.now() - uptimeSeconds * 1000).toISOString(),
      },
      runtime: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
      },
      memory: {
        heapUsedMB: toMB(mem.heapUsed),
        heapTotalMB: toMB(mem.heapTotal),
        externalMB: toMB(mem.external),
        rssMB: toMB(mem.rss),
      },
      configuration: {
        stellarNetwork: process.env.STELLAR_NETWORK || 'testnet',
        mockStellar: process.env.MOCK_STELLAR === 'true',
        debugMode: process.env.DEBUG_MODE === 'true',
        rateLimitingEnabled: process.env.DISABLE_RATE_LIMIT !== 'true',
        port: parseInt(process.env.PORT, 10) || 3000,
      },
      database: {
        type: 'sqlite',
        status: dbStatus,
        fileSizeMB: dbFileSizeMB,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
