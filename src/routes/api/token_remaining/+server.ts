import fs from 'fs';
import path from 'path';
import type { RequestHandler } from '@sveltejs/kit';
import crypto from 'crypto';

const storePath = path.resolve('/data/coolify/applications/lskskgs0kcsskgsgkcoo00g4/token_store.json');

export const GET: RequestHandler = async ({ url }) => {
  try {
    const token = url.searchParams.get('token');
    if (!token) {
      return new Response(JSON.stringify({ remaining: null, error: 'missing_token' }), {
        status: 400,
        headers: {
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    if (!fs.existsSync(storePath)) {
      return new Response(JSON.stringify({ remaining: null, error: 'not_found' }), {
        status: 404,
        headers: {
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const raw = fs.readFileSync(storePath, 'utf8');
    const store = JSON.parse(raw || '{}');
    const entry = store[tokenHash];

    if (!entry) {
      return new Response(JSON.stringify({ remaining: null, error: 'not_found' }), {
        status: 404,
        headers: {
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(JSON.stringify({ remaining: entry.remaining }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ remaining: null, error: String(e) }), {
      status: 500,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};
