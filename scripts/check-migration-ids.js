'use strict';

/**
 * CI check: ensure every file in src/migrations/ has a globally unique numeric prefix.
 * Exits with code 1 if duplicates are found.
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '../src/migrations');

const files = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => /^\d+.*\.js$/.test(f))
  .sort();

const prefixCount = new Map();

for (const file of files) {
  const prefix = file.match(/^(\d+)/)[1];
  if (!prefixCount.has(prefix)) prefixCount.set(prefix, []);
  prefixCount.get(prefix).push(file);
}

const duplicates = [...prefixCount.entries()].filter(([, names]) => names.length > 1);

if (duplicates.length > 0) {
  console.error('ERROR: Duplicate migration number prefixes detected:\n');
  for (const [prefix, names] of duplicates) {
    console.error(`  Prefix ${prefix}:`);
    for (const name of names) console.error(`    - ${name}`);
  }
  console.error('\nEach migration must have a globally unique numeric prefix.');
  console.error('Rename the conflicting files before merging.');
  process.exit(1);
}

console.log(`OK — ${files.length} migration(s), all prefixes unique.`);
