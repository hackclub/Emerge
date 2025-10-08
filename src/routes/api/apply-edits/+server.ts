import fs from 'fs';
import path from 'path';
import type { RequestHandler } from '@sveltejs/kit';
import crypto from 'crypto';

const canvasPath = path.resolve('static/canvas.json');
const storePath = path.resolve('data/token_store.json');

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const token = body.token;
    const edits = body.edits || [];

    if (!token || !Array.isArray(edits) || edits.length === 0) {
      return new Response(JSON.stringify({ ok: false, reason: 'invalid_request' }), { status: 400 });
    }

    if (!fs.existsSync(storePath)) {
      return new Response(JSON.stringify({ ok: false, reason: 'token_store_not_found' }), { status: 500 });
    }

    const raw = fs.readFileSync(storePath, 'utf8');
    const store = JSON.parse(raw || '{}');
    console.log('Received token:', token);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    console.log('Computed token hash:', tokenHash);
    console.log('Token store path:', storePath);
    console.log('Token store content:', store);
    const entry = store[tokenHash];

    if (!entry) {
      return new Response(JSON.stringify({ ok: false, reason: 'invalid_token' }), { status: 403 });
    }

    if (entry.remaining < edits.length) {
      return new Response(JSON.stringify({ ok: false, reason: 'not_enough_remaining' }), { status: 400 });
    }

    // Apply edits to canvas
    const canvasRaw = fs.existsSync(canvasPath) ? fs.readFileSync(canvasPath, 'utf8') : JSON.stringify({ rows: 50, cols: 50, filled: [] });
    const canvas = JSON.parse(canvasRaw);
    canvas.filled = canvas.filled || [];
    for (const e of edits) {
      if (Array.isArray(e)) canvas.filled.push({ r: e[0], c: e[1], color: e[2] || '#ec3750' });
      else canvas.filled.push(e);
    }

    // Update remaining edits
    if (edits.length <= 45) {
      entry.remaining = Math.max(0, entry.remaining - edits.length);
    } else {
      return new Response(JSON.stringify({ ok: false, reason: 'too_many_edits' }), { status: 400 });
    }

    store[tokenHash] = entry;

    // Write updates
    fs.writeFileSync(canvasPath, JSON.stringify(canvas, null, 2));
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2));

    return new Response(JSON.stringify({ ok: true, remaining: entry.remaining }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, reason: 'server_error', detail: String(e) }), { status: 500 });
  }
};
