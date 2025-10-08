import fs from 'fs';
import path from 'path';
import type { RequestHandler } from '@sveltejs/kit';

const storePath = path.resolve('data/token_store.json');

export const GET: RequestHandler = async ({ url, request }) => {
  const provided = url.searchParams.get('secret') || request.headers.get('x-admin-secret');
  const admin = process.env.ADMIN_SECRET;
  if (!admin || !provided || provided !== admin) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { 'content-type': 'application/json' } });
  }

  try {
    if (!fs.existsSync(storePath)) {
      return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { 'content-type': 'application/json' } });
    }
    const raw = fs.readFileSync(storePath, 'utf8');
    // Safety: return parsed JSON to ensure valid output
    const parsed = JSON.parse(raw);
    return new Response(JSON.stringify(parsed), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error', detail: String(e) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
};
