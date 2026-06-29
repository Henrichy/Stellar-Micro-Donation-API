'use strict';

/**
 * Periodic reconciliation job for DonationTotalsRepository.
 *
 * Recomputes per-recipient totals from the source-of-truth transactions table
 * and corrects any drift in the pre-aggregated donation_totals table.
 * Coordinated via scheduler lock so only one instance runs at a time.
 */

const DonationTotalsRepository = require('../services/DonationTotalsRepository');
const log = require('../utils/log');

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let _timer = null;
const _repo = new DonationTotalsRepository();

async function runOnce() {
  try {
    const result = await _repo.reconcile();
    log.info('RECONCILE_TOTALS_JOB', 'Reconciliation complete', result);
  } catch (err) {
    log.error('RECONCILE_TOTALS_JOB', 'Reconciliation failed', { error: err.message });
  }
}

function start(intervalMs = DEFAULT_INTERVAL_MS) {
  if (_timer) return;
  _timer = setInterval(runOnce, intervalMs);
  if (_timer.unref) _timer.unref();
  log.info('RECONCILE_TOTALS_JOB', 'Reconciliation job started', { intervalMs });
}

function stop() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

module.exports = { start, stop, runOnce };
