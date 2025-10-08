import fs from 'fs';
import path from 'path';
import type { RequestHandler } from '@sveltejs/kit';

const canvasPath = path.resolve('static/canvas.json');
const statePath = path.resolve('data/single_token_state.json');

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const token = body.token;
    const edits = body.edits || [];
    // simple check: token must match FRIEND_TOKEN env var
    const friend = process.env.FRIEND_TOKEN;
    if (!friend) return new Response(JSON.stringify({ ok: false, reason: 'server_no_token_config' }), { status: 500 });
    if (token !== friend) return new Response(JSON.stringify({ ok: false, reason: 'invalid_token' }), { status: 403 });

    if (!Array.isArray(edits) || edits.length === 0) return new Response(JSON.stringify({ ok: false, reason: 'no_edits' }), { status: 400 });
    if (edits.length !== 45) return new Response(JSON.stringify({ ok: false, reason: 'must_submit_exactly_45_edits' }), { status: 400 });

    // read state
    const stateRaw = fs.existsSync(statePath) ? fs.readFileSync(statePath, 'utf8') : null;
    const state = stateRaw ? JSON.parse(stateRaw) : { id: 'friend', remaining: 45 };
    if (state.remaining < edits.length) return new Response(JSON.stringify({ ok: false, reason: 'not_enough_remaining' }), { status: 400 });

    // apply edits to canvas
    const canvasRaw = fs.existsSync(canvasPath) ? fs.readFileSync(canvasPath, 'utf8') : JSON.stringify({ rows: 50, cols: 50, filled: [] });
    const canvas = JSON.parse(canvasRaw);
    canvas.filled = canvas.filled || [];
    for (const e of edits) {
      // normalize [r,c] or object
      if (Array.isArray(e)) canvas.filled.push({ r: e[0], c: e[1], color: e[2] || '#ec3750' });
      else canvas.filled.push(e);
    }

    // update remaining
    state.remaining = state.remaining - edits.length;

    // write local fallback
    try {
      fs.writeFileSync(canvasPath, JSON.stringify(canvas, null, 2));
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    } catch (e) {
      // ignore write failures in serverless; we'll try GitHub API below if configured
    }

    // try to commit to GitHub if token present
    const gh = process.env.GITHUB_TOKEN;
    if (gh) {
      // best-effort: use GitHub REST to update canvas.json and state file
      // Keep this minimal and don't crash on errors
      try {
        const repo = process.env.GITHUB_REPO || 'hackclub/Emerge';
        const apiBase = 'https://api.github.com/repos/' + repo + '/contents';
        const headers = { Authorization: 'token ' + gh, Accept: 'application/vnd.github+json' } as any;

        const put = async (filePath: string, contentObj: any, message: string) => {
          const b64 = Buffer.from(JSON.stringify(contentObj, null, 2)).toString('base64');
          // get current sha if exists
          const url = apiBase + '/' + filePath;
          const existing = await fetch(url, { headers });
          let sha = null;
          if (existing.ok) {
            const exjson = await existing.json();
            sha = exjson.sha;
          }
          await fetch(url, {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, content: b64, sha })
          });
        };
        await put('static/canvas.json', canvas, 'Apply friend edits');
        await put('data/single_token_state.json', state, 'Update friend token remaining');
      } catch (e) {
        // swallow
      }
    }

    return new Response(JSON.stringify({ ok: true, remaining: state.remaining }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, reason: 'server_error', detail: String(e) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
};
