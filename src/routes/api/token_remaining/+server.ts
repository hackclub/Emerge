import fs from 'fs';
import path from 'path';
import type { RequestHandler } from '@sveltejs/kit';
import crypto from 'crypto';

const storePath = path.resolve('data/token_store.json');

export const GET: RequestHandler = async ({ url }) => {
  try {
    const token = url.searchParams.get('token');
    if (!token) {
      return new Response(JSON.stringify({ remaining: null, error: 'missing_token' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }

    console.log('Received token:', token);

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    console.log('Computed token hash:', tokenHash);
    console.log('Token store path:', storePath);
    console.log('Token store content:', fs.existsSync(storePath) ? fs.readFileSync(storePath, 'utf8') : 'File not found');

    if (!fs.existsSync(storePath)) {
      return new Response(JSON.stringify({ remaining: null, error: 'not_found' }), { status: 404, headers: { 'content-type': 'application/json' } });
    }

    const raw = fs.readFileSync(storePath, 'utf8');
    const store = JSON.parse(raw || '{}');
    const entry = store[tokenHash];

    if (!entry) {
      return new Response(JSON.stringify({ remaining: null, error: 'not_found' }), { status: 404, headers: { 'content-type': 'application/json' } });
    }

    return new Response(JSON.stringify({ remaining: entry.remaining }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ remaining: null, error: String(e) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
};
