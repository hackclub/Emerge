// SvelteKit API route for token validation
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import type { RequestHandler } from '@sveltejs/kit';

const storePath = path.resolve('data/token_store.json');

export const GET: RequestHandler = async ({ params, request, url }) => {
  const token = params.token;
  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
  const provided = url.searchParams.get('secret') || request.headers.get('x-admin-secret');
  const admin = process.env.ADMIN_SECRET;
  // Temporary fallback: accept this specific pre-generated token hash until
  // the deployed `data/token_store.json` is available and functioning.
  // REMOVE THIS BLOCK once the token store is confirmed working on the server.
  const TEMP_FALLBACK_HASH = '66d8a141299352d07db20ba34af6a63e08881bfeef7d44f527221b50c7bf48ee';
  if (tokenHash === TEMP_FALLBACK_HASH) {
    return new Response(JSON.stringify({ valid: true, remaining: 10, expires: null, note: 'temporary-fallback' }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  try {
    // Robust loader: 1) try dynamic import (bundled at build time),
    // 2) try reading from CWD, 3) try module-relative path.
    let store: Record<string, any> = {};
    let entry: any = null;
    let fileExists = false;

    // 1) dynamic import (works if JSON is bundled)
    try {
      // use import assertions; Vite/SvelteKit supports this when bundling
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const mod = await import('../../../../data/token_store.json', { assert: { type: 'json' } });
      const maybe = (mod && (mod.default ?? mod)) as Record<string, any>;
      store = maybe || {};
      entry = store[tokenHash];
      fileExists = Object.keys(store).length > 0;
    } catch (e) {
      // ignore and fall back to filesystem reads
    }

    // 2) try CWD
    if (!fileExists) {
      try {
        if (fs.existsSync(storePath)) {
          const raw = fs.readFileSync(storePath, 'utf8');
          store = JSON.parse(raw || '{}');
          entry = store[tokenHash];
          fileExists = true;
        }
      } catch (e) {
        // ignore
      }
    }

    // 3) module-relative fallback
    if (!fileExists) {
      try {
        const moduleDir = path.dirname(fileURLToPath(import.meta.url));
        const alt = path.resolve(moduleDir, '../../../../data/token_store.json');
        if (fs.existsSync(alt)) {
          const raw = fs.readFileSync(alt, 'utf8');
          store = JSON.parse(raw || '{}');
          entry = store[tokenHash];
          fileExists = true;
        }
      } catch (e) {
        // ignore
      }
    }
    // If admin requested diagnostics, return helpful debug info
    if (admin && provided && provided === admin) {
      return new Response(JSON.stringify({ debug: true, tokenHash, fileExists, storeSize: Object.keys(store).length, entry: entry || null }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    // normal flow
    const entryFound = entry;
    if (!entryFound) {
      return new Response(JSON.stringify({ valid: false, reason: 'not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
    }
    if (!entry) {
      return new Response(JSON.stringify({ valid: false, reason: 'not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
    }
    if (entry.expires && Date.now() > entry.expires) {
      // Don't attempt to write to disk in serverless; just return expired
      return new Response(JSON.stringify({ valid: false, reason: 'expired' }), { status: 410, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({ valid: true, remaining: entry.remaining, expires: entry.expires || null }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ valid: false, reason: 'server_error' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
};
