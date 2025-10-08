import fs from 'fs';
import path from 'path';
import type { RequestHandler } from '@sveltejs/kit';
import crypto from 'crypto';

const canvasPath = path.resolve('/data/coolify/applications/canvas.json');
const storePath = path.resolve('/data/coolify/applications/lskskgs0kcsskgsgkcoo00g4/token_store.json');

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const token = body.token;
    const edits = body.edits || [];

    if (!token || !Array.isArray(edits) || edits.length === 0) {
      return new Response(JSON.stringify({ ok: false, reason: 'invalid_request' }), { status: 400 });
    }

    if (!fs.existsSync(storePath)) {
      console.error('Token store not found at:', storePath);
      return new Response(JSON.stringify({ ok: false, reason: 'token_store_not_found' }), { status: 500 });
    }

    const raw = fs.readFileSync(storePath, 'utf8');
    const store = JSON.parse(raw || '{}');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const entry = store[tokenHash];

    if (!entry) {
      console.error('Invalid token. Hash:', tokenHash);
      return new Response(JSON.stringify({ ok: false, reason: 'invalid_token' }), { status: 403 });
    }

    if (entry.remaining < edits.length) {
      console.warn('Not enough remaining edits. Token hash:', tokenHash, 'Remaining:', entry.remaining, 'Requested:', edits.length);
      return new Response(JSON.stringify({ ok: false, reason: 'not_enough_remaining', action: 'wipe_queue' }), { status: 400 });
    }

    // Apply edits to canvas
    const canvasRaw = fs.existsSync(canvasPath) ? fs.readFileSync(canvasPath, 'utf8') : JSON.stringify({ rows: 50, cols: 50, filled: [] });
    const canvas = JSON.parse(canvasRaw);
    canvas.filled = canvas.filled || [];
    for (const e of edits) {
      if (Array.isArray(e)) canvas.filled.push({ r: e[0], c: e[1], color: e[2] || '#ec3750' });
      else canvas.filled.push(e);
    }

    console.log('Canvas before update:', canvas);

    // Update remaining edits
    entry.remaining = Math.max(0, entry.remaining - edits.length);
    store[tokenHash] = entry;

    console.log('Token store before update:', store);

    // Write updates
    try {
      fs.writeFileSync(canvasPath, JSON.stringify(canvas, null, 2));
      console.log('Canvas updated successfully at:', canvasPath);
    } catch (e) {
      console.error('Failed to update canvas. Error:', e);
      return new Response(JSON.stringify({ ok: false, reason: 'canvas_update_failed', detail: String(e) }), { status: 500 });
    }

    try {
      fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
      console.log('Token store updated successfully at:', storePath);
    } catch (e) {
      console.error('Failed to update token store. Error:', e);
      return new Response(JSON.stringify({ ok: false, reason: 'token_store_update_failed', detail: String(e) }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true, remaining: entry.remaining }), { status: 200 });
  } catch (e) {
    console.error('Server error:', e);
    return new Response(JSON.stringify({ ok: false, reason: 'server_error', detail: String(e) }), { status: 500 });
  }
};
