const express = require('express');
const router = express.Router();
const Wallet = require('./models/wallet');

/**
 * POST /wallets
 * Create a new wallet
 */
router.post('/', (req, res) => {
  try {
    const { address, name } = req.body;

    if (!address) {
      return res.status(400).json({
        error: 'Missing required field: address'
      });
    }

    // Check if wallet already exists
    const existing = Wallet.getByAddress(address);
    if (existing) {
      return res.status(409).json({
        error: 'Wallet with this address already exists'
      });
    }

    const wallet = Wallet.create({
      address,
      name: name || address
    });

    res.status(201).json({
      success: true,
      data: wallet
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create wallet',
      message: error.message
    });
  }
});

/**
 * GET /wallets
 * Get all wallets (including inactive)
 */
router.get('/', (req, res) => {
  try {
    const wallets = Wallet.getAll();
    res.json({
      success: true,
      data: wallets,
      count: wallets.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve wallets',
      message: error.message
    });
  }
});

/**
 * GET /wallets/active
 * Get all active wallets
 */
router.get('/active', (req, res) => {
  try {
    const wallets = Wallet.getActive();
    res.json({
      success: true,
      data: wallets,
      count: wallets.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve active wallets',
      message: error.message
    });
  }
});

/**
 * GET /wallets/:id
 * Get a specific wallet
 */
router.get('/:id', (req, res) => {
  try {
    const wallet = Wallet.getById(req.params.id);
    
    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    res.json({
      success: true,
      data: wallet
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve wallet',
      message: error.message
    });
  }
});

/**
 * PUT /wallets/:id/deactivate
 * Soft delete a wallet (mark as inactive)
 */
router.put('/:id/deactivate', (req, res) => {
  try {
    const wallet = Wallet.deactivate(req.params.id);
    
    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    res.json({
      success: true,
      message: 'Wallet deactivated successfully',
      data: wallet
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to deactivate wallet',
      message: error.message
    });
  }
});

/**
 * PUT /wallets/:id/activate
 * Reactivate a deactivated wallet
 */
router.put('/:id/activate', (req, res) => {
  try {
    const wallet = Wallet.activate(req.params.id);
    
    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    res.json({
      success: true,
      message: 'Wallet activated successfully',
      data: wallet
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to activate wallet',
      message: error.message
    });
  }
});

module.exports = router;
