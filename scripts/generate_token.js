#!/usr/bin/env node
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storePath = path.resolve(__dirname, '../data/token_store.json');
const args = process.argv.slice(2);
const edits = Number(args[0] || 10);
// optional TTL in minutes (default 60 minutes)
const ttlMinutes = Number(args[1] || 60);
// require an ADMIN secret 
// Provide via env var ADMIN_SECRET or as the third CLI argument.
const providedSecret = process.env.ADMIN_SECRET || args[2];
if (!providedSecret) {
  console.error('REFUSING TO RUN: ADMIN_SECRET is required to generate tokens.');
  console.error('Set ADMIN_SECRET in the environment or pass it as the third argument.');
  console.error('Example: node scripts/generate_token.js <edits> <ttl-minutes> <ADMIN_SECRET>');
  process.exit(2);
}

function load() {
  try {
    return JSON.parse(fs.readFileSync(storePath, 'utf8'));
  } catch (e) {
    return {};
  }
}

function save(store) {
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
}

const rawToken = crypto.randomBytes(16).toString('hex'); // 128 bits
const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
const store = load();
const created = Date.now();
const expires = Number.isFinite(ttlMinutes) && ttlMinutes > 0 ? created + ttlMinutes * 60_000 : null;
// store the token as before; possession of ADMIN_SECRET is required to run this script
store[tokenHash] = { remaining: edits, created, expires };
save(store);
console.log('TOKEN (give this to user, one-time):', rawToken);
console.log('Remaining edits:', edits);
if (expires) console.log('Expires at:', new Date(expires).toISOString(), `(in ${ttlMinutes} minutes)`);
console.log('NOTE: only the token hash is stored in the repository (not the raw token).');
console.log('SECURITY: This script requires an ADMIN_SECRET. Do NOT commit your ADMIN_SECRET to source control.');
