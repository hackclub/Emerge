#!/usr/bin/env node
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storePath = path.resolve(__dirname, '../data/token_store.json');
const args = process.argv.slice(2);
const token = args[0];

if (!token) {
  console.error('Usage: node ./scripts/check_token.js <raw-token>');
  process.exit(2);
}

function load() {
  try {
    return JSON.parse(fs.readFileSync(storePath, 'utf8'));
  } catch (e) {
    return {};
  }
}

const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
const store = load();
const entry = store[tokenHash];
if (!entry) {
  console.log('NOT FOUND: token does not match any hash in', storePath);
  process.exit(1);
}
console.log('FOUND:');
console.log('  token hash:', tokenHash);
console.log('  remaining :', entry.remaining);
console.log('  created   :', new Date(entry.created).toISOString());
process.exit(0);
