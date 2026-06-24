#!/usr/bin/env node
'use strict';

/**
 * KEK (Key Encryption Key) rotation script.
 *
 * Rotates the master ENCRYPTION_KEY without data loss by re-wrapping each
 * wallet's Data Encryption Key (DEK) under the new KEK while leaving the
 * plaintext wallet secret unchanged.
 *
 * Usage:
 *   ENCRYPTION_KEY=<old-key> NEW_ENCRYPTION_KEY=<new-key> node src/scripts/rotateKEK.js
 *   # Optional: resume an interrupted run
 *   ENCRYPTION_KEY=<old-key> NEW_ENCRYPTION_KEY=<new-key> node src/scripts/rotateKEK.js --resume
 *
 * Safety guarantees:
 *   - Idempotent: already-rotated rows (detected by trying the new key first) are skipped.
 *   - Resumable: progress is written to a checkpoint file after each successful row.
 *   - Crash-safe: each row is updated atomically; a crash leaves at most one row unchanged.
 *   - No plaintext exposure: the plaintext DEK lives only in memory during rotation.
 *
 * Emergency rotation:
 *   After rotation completes, set ENCRYPTION_KEY=<new-key> in your secrets manager,
 *   restart the service, and run `--verify` to confirm no record is still decryptable
 *   with the old key.
 *
 *   ENCRYPTION_KEY=<old-key> node src/scripts/rotateKEK.js --verify
 */

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const DB_PATH = path.join(__dirname, '../../../data/stellar_donations.db');
const CHECKPOINT_PATH = path.join(__dirname, '../../../data/kek-rotation-checkpoint.json');

function deriveKEK(rawKey) {
  if (!rawKey) throw new Error('Key must not be empty');
  return crypto.createHash('sha256').update(rawKey).digest();
}

function encryptDEK(dek, kek) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, kek, iv);
  const ct = Buffer.concat([cipher.update(dek), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${ct.toString('hex')}:${tag.toString('hex')}`;
}

function decryptDEK(encryptedDEK, kek) {
  const parts = encryptedDEK.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted DEK format');
  const [ivHex, ctHex, tagHex] = parts;
  const decipher = crypto.createDecipheriv(ALGORITHM, kek, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(ctHex, 'hex')), decipher.final()]);
}

function dbAll(db, sql, params) {
  return new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  );
}

function dbRun(db, sql, params) {
  return new Promise((resolve, reject) =>
    db.run(sql, params, (err) => (err ? reject(err) : resolve()))
  );
}

function loadCheckpoint() {
  try {
    return JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf8'));
  } catch (_) {
    return { rotated: [] };
  }
}

function saveCheckpoint(checkpoint) {
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(checkpoint, null, 2));
}

async function rotate({ oldKey, newKey, verifyOnly }) {
  const oldKEK = deriveKEK(oldKey);
  const newKEK = deriveKEK(newKey);

  const db = await new Promise((resolve, reject) => {
    const conn = new sqlite3.Database(DB_PATH, (err) => (err ? reject(err) : resolve(conn)));
  });

  const rows = await dbAll(
    db,
    'SELECT id, encryptedSecret FROM users WHERE encryptedSecret IS NOT NULL',
    []
  );

  const checkpoint = loadCheckpoint();
  const rotatedSet = new Set(checkpoint.rotated);

  let rotated = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    if (!row.encryptedSecret.startsWith('{')) {
      console.error(`Row ${row.id}: legacy v1 format — run migrateToEnvelopeEncryption.js first`);
      errors++;
      continue;
    }

    let envelope;
    try {
      envelope = JSON.parse(row.encryptedSecret);
    } catch (_) {
      console.error(`Row ${row.id}: unparseable envelope — skipping`);
      errors++;
      continue;
    }

    if (verifyOnly) {
      // Attempt to decrypt with the OLD key; if it succeeds, rotation is incomplete.
      try {
        decryptDEK(envelope.encryptedDEK, oldKEK);
        console.error(`Row ${row.id}: still decryptable with old key — rotation incomplete`);
        errors++;
      } catch (_) {
        skipped++; // Cannot decrypt with old key — correctly rotated
      }
      continue;
    }

    if (rotatedSet.has(String(row.id))) {
      skipped++;
      continue;
    }

    // Try new key first (idempotency: already rotated rows decrypt fine with new key)
    let dek;
    try {
      dek = decryptDEK(envelope.encryptedDEK, newKEK);
      // Successfully decrypted with new key — already rotated
      rotatedSet.add(String(row.id));
      saveCheckpoint({ rotated: [...rotatedSet] });
      skipped++;
      continue;
    } catch (_) {
      // Expected: row uses old key, proceed with re-wrap
    }

    try {
      dek = decryptDEK(envelope.encryptedDEK, oldKEK);
    } catch (err) {
      console.error(`Row ${row.id}: cannot decrypt with either key — ${err.message}`);
      errors++;
      continue;
    }

    const newEncryptedDEK = encryptDEK(dek, newKEK);
    const newEnvelope = JSON.stringify({ ...envelope, encryptedDEK: newEncryptedDEK });

    await dbRun(db, 'UPDATE users SET encryptedSecret = ? WHERE id = ?', [newEnvelope, row.id]);

    rotatedSet.add(String(row.id));
    saveCheckpoint({ rotated: [...rotatedSet] });
    rotated++;
  }

  db.close();

  if (verifyOnly) {
    if (errors === 0) {
      console.log(`Verify complete: all ${rows.length} row(s) are correctly rotated.`);
    } else {
      console.error(`Verify failed: ${errors} row(s) still decryptable with the old key.`);
      process.exit(1);
    }
    return;
  }

  console.log(`Rotation complete: ${rotated} rotated, ${skipped} already up-to-date, ${errors} error(s).`);

  if (errors > 0) {
    console.error('Some rows could not be rotated. Review the errors above and re-run.');
    process.exit(1);
  }

  if (fs.existsSync(CHECKPOINT_PATH)) {
    fs.unlinkSync(CHECKPOINT_PATH);
  }
  console.log('Checkpoint cleared. Update ENCRYPTION_KEY to the new value and restart the service.');
}

const verifyOnly = process.argv.includes('--verify');
const oldKey = process.env.ENCRYPTION_KEY;
const newKey = verifyOnly ? process.env.ENCRYPTION_KEY : process.env.NEW_ENCRYPTION_KEY;

if (!oldKey) {
  console.error('ENCRYPTION_KEY (old key) is required.');
  process.exit(1);
}
if (!verifyOnly && !newKey) {
  console.error('NEW_ENCRYPTION_KEY is required for rotation.');
  process.exit(1);
}
if (!verifyOnly && oldKey === newKey) {
  console.error('ENCRYPTION_KEY and NEW_ENCRYPTION_KEY must be different.');
  process.exit(1);
}

rotate({ oldKey, newKey, verifyOnly }).catch((err) => {
  console.error('Rotation failed:', err.message);
  process.exit(1);
});
