const express = require('express');
const router = express.Router();
const Transaction = require('./models/transaction');
const Wallet = require('./models/wallet');

/**
 * POST /donations
 * Create a new donation
 */
router.post('/', (req, res) => {
  try {
    const { amount, donor, recipient } = req.body;

    if (!amount || !recipient) {
      return res.status(400).json({
        error: 'Missing required fields: amount, recipient'
      });
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        error: 'Amount must be a positive number'
      });
    }

    // Check if donor wallet is active (if donor is specified)
    if (donor && donor !== 'Anonymous') {
      const donorWallet = Wallet.getByAddress(donor);
      if (donorWallet && !donorWallet.active) {
        return res.status(403).json({
          error: 'Donor wallet is inactive and cannot send donations'
        });
      }
    }

    const transaction = Transaction.create({
      amount: parseFloat(amount),
      donor: donor || 'Anonymous',
      recipient
    });

    res.status(201).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create donation',
      message: error.message
    });
  }
});

/**
 * GET /donations
 * Get all donations
 */
router.get('/', (req, res) => {
  try {
    const transactions = Transaction.getAll();
    res.json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve donations',
      message: error.message
    });
  }
});

/**
 * GET /donations/:id
 * Get a specific donation
 */
router.get('/:id', (req, res) => {
  try {
    const transaction = Transaction.getById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        error: 'Donation not found'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve donation',
      message: error.message
    });
  }
});

module.exports = router;
