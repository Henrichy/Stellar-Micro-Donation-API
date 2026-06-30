/**
 * Audit Log Retention Service
 *
 * Enforces configurable retention policy on audit_logs.
 * Entries older than the retention window are archived to audit_logs_archive
 * and removed from the live table. Runs on a configurable interval.
 *
 * Default retention: 90 days (AUDIT_LOG_RETENTION_DAYS env var).
 */

const db = require('../utils/database');
const log = require('../utils/log');
const timerRegistry = require('../utils/timerRegistry');
const config = require('../config');
const { MS_PER_DAY, MS_PER_HOUR } = require('../constants');

// Default schedule interval: 24h. Override via constructor option for tests.
const DEFAULT_INTERVAL_MS = MS_PER_DAY;

/**
 * Resolve the configured audit-log retention days.
 * Single source of truth lives in config.retention.auditLogsDays
 * (defaults from src/constants/domain.js). The legacy AUDIT_LOG_RETENTION_DAYS
 * env var is honoured as a fallback by the config loader.
 */
const RETENTION_DAYS = config.auditRetention.archiveAfterDays;

class AuditLogRetentionService {
  constructor(intervalMs = DEFAULT_INTERVAL_MS) {
    this.intervalMs = intervalMs;
    this._timer = null;
  }

  async _ensureArchiveTable() {
    await db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs_archive (
        id INTEGER PRIMARY KEY,
        timestamp TEXT NOT NULL,
        category TEXT NOT NULL,
        action TEXT NOT NULL,
        severity TEXT NOT NULL,
        result TEXT NOT NULL,
        userId TEXT,
        requestId TEXT,
        ipAddress TEXT,
        resource TEXT,
        reason TEXT,
        details TEXT,
        integrityHash TEXT NOT NULL,
        archivedAt TEXT NOT NULL
      )
    `);
  }

  /**
   * Archive and delete audit log entries older than retentionDays.
   * @param {number} [retentionDays] - Override retention period.
   * @returns {Promise<number>} Number of entries archived.
   */
  async runRetention(retentionDays = RETENTION_DAYS) {
    await this._ensureArchiveTable();

    const cutoff = new Date(Date.now() - retentionDays * MS_PER_DAY).toISOString();

    const rows = await db.all(
      `SELECT * FROM audit_logs WHERE timestamp < ?`,
      [cutoff]
    );

    if (rows.length === 0) return 0;

    const archivedAt = new Date().toISOString();
    for (const row of rows) {
      await db.run(
        `INSERT OR IGNORE INTO audit_logs_archive
          (id, timestamp, category, action, severity, result, userId, requestId, ipAddress, resource, reason, details, integrityHash, archivedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.id, row.timestamp, row.category, row.action, row.severity, row.result,
         row.userId, row.requestId, row.ipAddress, row.resource, row.reason,
         row.details, row.integrityHash, archivedAt]
      );
    }

    await db.run(`DELETE FROM audit_logs WHERE timestamp < ?`, [cutoff]);

    log.info('AUDIT_RETENTION', `Archived ${rows.length} audit log entries`, {
      retentionDays,
      cutoff,
      archivedCount: rows.length
    });

    return rows.length;
  }

  start() {
    if (this._timer) return;
    this._timer = timerRegistry.createInterval(() => {
      this.runRetention().catch(err =>
        log.error('AUDIT_RETENTION', 'Retention job failed', { error: err.message })
      );
    }, this.intervalMs, 'audit-log-retention');
    this._timer.unref();
    log.info('AUDIT_RETENTION', 'Retention service started', {
      retentionDays: RETENTION_DAYS,
      intervalHours: this.intervalMs / MS_PER_HOUR,
    });
  }

  stop() {
    if (this._timer) {
      this._timer.clear();
      this._timer = null;
    }
  }
}

module.exports = new AuditLogRetentionService();
