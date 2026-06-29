'use strict';

/**
 * Migration 028: Ensure idempotencyKey UNIQUE column on transactions (#1157)
 *
 * initDB.js already declares `idempotencyKey TEXT UNIQUE` on the transactions
 * table. This migration backfills the column and its index for databases that
 * were created before that column was added, and ensures the unique index
 * exists regardless.
 */

exports.name = '028_transactions_idempotency_key';

exports.up = async (db) => {
  // Add column only if missing (SQLite errors if you ADD an existing column)
  const columns = await db.all('PRAGMA table_info(transactions)');
  const hasColumn = columns.some(c => c.name === 'idempotencyKey');

  if (!hasColumn) {
    await db.run('ALTER TABLE transactions ADD COLUMN idempotencyKey TEXT');
  }

  // Create unique index (idempotent — uses IF NOT EXISTS)
  await db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_idempotency_key_unique
    ON transactions(idempotencyKey)
    WHERE idempotencyKey IS NOT NULL
  `);

  // Ensure the generic lookup index also exists
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_transactions_idempotency
    ON transactions(idempotencyKey)
  `);
};

exports.down = async (db) => {
  await db.run('DROP INDEX IF EXISTS idx_transactions_idempotency_key_unique');
  // NOTE: SQLite does not support DROP COLUMN on older versions; leave column in place.
};
