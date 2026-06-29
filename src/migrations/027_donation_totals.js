'use strict';

exports.name = '027_donation_totals';

exports.up = async (db) => {
  // Per-recipient pre-aggregated totals. total_stroops stored as TEXT to
  // survive round-trips through JavaScript without 64-bit integer truncation.
  await db.run(`
    CREATE TABLE IF NOT EXISTS donation_totals (
      recipient_id TEXT NOT NULL PRIMARY KEY,
      total_stroops TEXT NOT NULL DEFAULT '0',
      donation_count INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS donation_totals_global (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_stroops TEXT NOT NULL DEFAULT '0',
      donation_count INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`INSERT OR IGNORE INTO donation_totals_global (id, total_stroops, donation_count) VALUES (1, '0', 0)`);
};

exports.down = async (db) => {
  await db.run('DROP TABLE IF EXISTS donation_totals');
  await db.run('DROP TABLE IF EXISTS donation_totals_global');
};
