// SvelteKit API route for token validation
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { RequestHandler } from '@sveltejs/kit';

const storePath = path.resolve('data/token_store.json');

export const GET: RequestHandler = async ({ params }) => {
  const token = params.token;
  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
  try {
    const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    const entry = store[tokenHash];
    if (!entry) {
      return new Response(JSON.stringify({ valid: false, reason: 'not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
    }
    if (entry.expires && Date.now() > entry.expires) {
      // Remove expired token
      delete store[tokenHash];
      fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
      return new Response(JSON.stringify({ valid: false, reason: 'expired' }), { status: 410, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({ valid: true, remaining: entry.remaining, expires: entry.expires || null }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ valid: false, reason: 'server_error' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
};
