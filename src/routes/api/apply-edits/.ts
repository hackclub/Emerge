import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { RequestHandler } from '@sveltejs/kit';

// token store removed: no server-side token check in this build
// const storePath = path.resolve('data/token_store.json');
const canvasPath = path.resolve('static/canvas.json');

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
  const { token, edits } = body as { token: string; edits: Array<{ r: number; c: number; color?: string }> };
    if (!token || !Array.isArray(edits)) return new Response('Bad request', { status: 400 });

  // Hash the incoming raw token to match the stored token hash
  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
  const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
  const entry = store[tokenHash];
    if (!entry) return new Response(JSON.stringify({ ok: false, reason: 'invalid token' }), { status: 403 });

    // expired?
    if (entry.expires && Date.now() > entry.expires) {
      // remove expired token
      delete store[tokenHash];
      fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
      return new Response(JSON.stringify({ ok: false, reason: 'expired' }), { status: 410 });
    }

    if (entry.remaining <= 0) return new Response(JSON.stringify({ ok: false, reason: 'exhausted' }), { status: 403 });

    if (edits.length > entry.remaining) return new Response(JSON.stringify({ ok: false, reason: 'too many edits' }), { status: 403 });

    // load canvas
    const canvas = JSON.parse(fs.readFileSync(canvasPath, 'utf8'));
    const rows = canvas.rows || 50;
    const cols = canvas.cols || 50;
    canvas.filled = canvas.filled || [];

    // normalize existing filled to object form if needed
    canvas.filled = canvas.filled.map((it: any) => {
      if (Array.isArray(it)) return { r: it[0], c: it[1], color: '#ec3750' };
      return it;
    });

    // apply edits
    for (const e of edits) {
      const r = Math.floor(e.r);
      const c = Math.floor(e.c);
      if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
      // overwrite or push
      const idx = canvas.filled.findIndex((f: any) => f.r === r && f.c === c);
      if (idx >= 0) canvas.filled[idx].color = e.color || canvas.filled[idx].color || '#ec3750';
      else canvas.filled.push({ r, c, color: e.color || '#ec3750' });
    }

    // decrement token
    entry.remaining -= edits.length;
    fs.writeFileSync(canvasPath, JSON.stringify(canvas, null, 2));
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2));

    return new Response(JSON.stringify({ ok: true, remaining: entry.remaining }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
};
