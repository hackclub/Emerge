import fs from 'fs';
import path from 'path';
import type { RequestHandler } from '@sveltejs/kit';

const statePath = path.resolve('data/single_token_state.json');

export const GET: RequestHandler = async () => {
  try {
    if (!fs.existsSync(statePath)) {
      return new Response(JSON.stringify({ remaining: null, error: 'not_found' }), { status: 404, headers: { 'content-type': 'application/json' } });
    }
    const raw = fs.readFileSync(statePath, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return new Response(JSON.stringify({ remaining: parsed.remaining ?? null }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ remaining: null, error: String(e) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
};
