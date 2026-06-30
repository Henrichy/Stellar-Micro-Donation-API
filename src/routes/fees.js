'use strict';

/**
 * Fees Routes
 *
 * GET /fees  — public endpoint returning application fees + Stellar network base fee.
 *              Reads from NetworkStatusService cache; no live Horizon call.
 *
 * Closes #794.
 */

const express = require('express');
const router = express.Router();
const serviceContainer = require('../config/serviceContainer');
const asyncHandler = require('../utils/asyncHandler');
const config = require('../config');
const {
  STROOPS_PER_XLM,
  STELLAR_BASE_FEE_STROOPS,
  XLM_DECIMAL_PLACES,
  FEE_EXAMPLE_AMOUNT_XLM,
} = require('../constants');

/** Map NetworkStatusService feeLevel → congestion label required by #794 */
function mapCongestion(status) {
  if (!status || !status.connected) return 'unknown';
  const { feeSurgeMultiplier } = status;
  if (feeSurgeMultiplier <= 1) return 'low';
  if (feeSurgeMultiplier <= 3) return 'medium';
  return 'high';
}

/**
 * GET /fees
 * Public — no authentication required.
 * Returns application fee config + Stellar network base fee from cache.
 */
router.get('/', asyncHandler(async (req, res) => {
  // All fee defaults come from src/config/index.js (single source of truth per concern).
  const platformFeePercent = config.fees.platformPercent;
  const minimumFeeXLM      = config.fees.minXLM;
  const maximumFeeXLM      = config.fees.maxXLM;

  const networkStatus = serviceContainer.getNetworkStatusService().getStatus();

  // Prefer the cached fee; fall back to the Stellar baseline constant.
  const baseFeeStroops = (networkStatus && networkStatus.feeStroops) || STELLAR_BASE_FEE_STROOPS;
  const baseFeeXLM     = parseFloat((baseFeeStroops / STROOPS_PER_XLM).toFixed(XLM_DECIMAL_PLACES));

  const feeSource    = (networkStatus && networkStatus.connected) ? 'network_status_cache' : 'fallback_baseline';
  const lastUpdatedAt = (networkStatus && networkStatus.timestamp) || new Date().toISOString();
  const congestion   = mapCongestion(networkStatus);

  // Worked example for the public endpoint.
  const exampleAmount   = FEE_EXAMPLE_AMOUNT_XLM;
  const platformFee     = parseFloat(Math.max(exampleAmount * platformFeePercent / 100, minimumFeeXLM).toFixed(XLM_DECIMAL_PLACES));
  const totalCost       = parseFloat((exampleAmount + platformFee + baseFeeXLM).toFixed(XLM_DECIMAL_PLACES));

  const minimumTotalFeeXLM = parseFloat((minimumFeeXLM + baseFeeXLM).toFixed(XLM_DECIMAL_PLACES));

  res.json({
    application: {
      platformFeePercent,
      minimumFeeXLM,
      maximumFeeXLM,
      feeCalculationExample: {
        donationAmount: exampleAmount,
        platformFee,
        stellarFee: baseFeeXLM,
        totalCost,
      },
    },
    stellar: {
      baseFeeStroops,
      baseFeeXLM,
      feeSource,
      lastUpdatedAt,
      networkCongestion: congestion,
    },
    total: {
      minimumTotalFeeXLM,
      note: 'Total fee = max(platformFee, minimumFeeXLM) + stellarBaseFee',
    },
  });
}));

module.exports = router;
