const Transaction = require('../src/routes/models/transaction');
const path = require('path');

describe('Transaction Model Fee Bump Fields', () => {
  const TEST_DB = path.join(__dirname, '../data/test-fee-bump-model.json');

  beforeEach(() => {
    process.env.DB_JSON_PATH = TEST_DB;
    Transaction._clearAllData();
  });

  afterAll(() => {
    delete process.env.DB_JSON_PATH;
    const fs = require('fs');
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  test('create() stores fee bump fields', () => {
    const tx = Transaction.create({
      amount: 10,
      donor: 'GDONOR',
      recipient: 'GRECIP',
      status: 'pending',
      envelopeXdr: 'AAAA==',
      feeBumpCount: 0,
      originalFee: 100,
      currentFee: 100,
    });

    expect(tx.envelopeXdr).toBe('AAAA==');
    expect(tx.feeBumpCount).toBe(0);
    expect(tx.originalFee).toBe(100);
    expect(tx.currentFee).toBe(100);
    expect(tx.lastFeeBumpAt).toBeNull();
  });

  test('updateFeeBumpData() updates fee bump metadata', () => {
    const tx = Transaction.create({
      amount: 10,
      donor: 'GDONOR',
      recipient: 'GRECIP',
      status: 'submitted',
      envelopeXdr: 'AAAA==',
      feeBumpCount: 0,
      originalFee: 100,
      currentFee: 100,
    });

    const updated = Transaction.updateFeeBumpData(tx.id, {
      feeBumpCount: 1,
      currentFee: 200,
      lastFeeBumpAt: '2026-03-25T00:00:00.000Z',
      envelopeXdr: 'BBBB==',
      stellarTxId: 'new_hash_123',
    });

    expect(updated.feeBumpCount).toBe(1);
    expect(updated.currentFee).toBe(200);
    expect(updated.lastFeeBumpAt).toBe('2026-03-25T00:00:00.000Z');
    expect(updated.envelopeXdr).toBe('BBBB==');
    expect(updated.stellarTxId).toBe('new_hash_123');
  });
});
