<script lang="ts">
import { onMount, onDestroy } from 'svelte';

let token = '';
let remaining = 0;
let message = '';
let tokenValid = false;
let checking = false;
let color = '#ff6b6b';
let rows = 50;
let cols = 50;
let canvasData: any = null;
let queued: Array<{ r: number; c: number; color: string }> = [];
let canvasEl: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let ro: ResizeObserver | null = null;

function normalizeFilled(arr: any[]) {
  return arr.map((it: any) => (Array.isArray(it) ? { r: it[0], c: it[1], color: '#ec3750' } : it));
}

function drawCanvas() {
  if (!canvasEl || !ctx || !canvasData) return;
  const dpr = window.devicePixelRatio || 1;
  const width = canvasEl.clientWidth;
  const height = canvasEl.clientHeight;
  canvasEl.width = Math.round(width * dpr);
  canvasEl.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // clear
  ctx.clearRect(0, 0, width, height);

  const rowsN = canvasData.rows || rows;
  const colsN = canvasData.cols || cols;
  const cellW = width / colsN;
  const cellH = height / rowsN;

  // draw grid background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // draw existing filled
  const filled = normalizeFilled(canvasData.filled || []);
  for (const f of filled) {
    ctx.fillStyle = f.color || '#ec3750';
    ctx.fillRect(f.c * cellW, f.r * cellH, Math.ceil(cellW), Math.ceil(cellH));
  }

  // draw queued edits with slight overlay
  for (const q of queued) {
    ctx.fillStyle = q.color || '#000000';
    ctx.globalAlpha = 0.9;
    ctx.fillRect(q.c * cellW, q.r * cellH, Math.ceil(cellW), Math.ceil(cellH));
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(q.c * cellW + 0.5, q.r * cellH + 0.5, Math.max(1, cellW - 1), Math.max(1, cellH - 1));
  }
}

function mapPointerToCell(clientX: number, clientY: number) {
  if (!canvasEl) return null;
  const rect = canvasEl.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const colsN = canvasData?.cols || cols;
  const rowsN = canvasData?.rows || rows;
  const c = Math.floor((x / rect.width) * colsN);
  const r = Math.floor((y / rect.height) * rowsN);
  if (r < 0 || r >= rowsN || c < 0 || c >= colsN) return null;
  return { r, c };
}

async function checkToken() {
  if (!token) { message = 'Enter a token first'; return; }
  checking = true;
  message = '';
  try {
    const res = await fetch(`/api/token/${token}`);
    const data = await res.json().catch(() => null);
    if (res.ok && data) {
      remaining = data.remaining || 0;
      tokenValid = true;
      message = `Token valid — ${remaining} edits remaining`;
    } else {
      remaining = 0;
      tokenValid = false;
      // prefer explicit reason from server when available
      if (data && data.reason) {
        message = `Invalid token: ${data.reason}`;
      } else if (data && data.tokenHash) {
        message = 'Invalid token (not found)';
      } else {
        message = 'Invalid token';
      }
    }
  } catch (e) {
    remaining = 0;
    tokenValid = false;
    message = `Network error: ${e?.message || e}`;
  } finally {
    checking = false;
  }
}

onMount(async () => {
  const res = await fetch('/canvas.json');
  canvasData = await res.json();
  rows = canvasData.rows || rows;
  cols = canvasData.cols || cols;
  // setup canvas context and resize observer
  if (canvasEl) {
    ctx = canvasEl.getContext('2d');
    drawCanvas();
    ro = new ResizeObserver(() => drawCanvas());
    ro.observe(canvasEl);

    const handler = (ev: PointerEvent) => {
      // require a validated token before allowing edits
      if (!tokenValid) {
        message = 'Please check your token first';
        return;
      }
      const cell = mapPointerToCell(ev.clientX, ev.clientY);
      if (!cell) return;
      if (ev.type === 'pointerdown') {
        toggleCell(cell.r, cell.c);
        drawCanvas();
      }
    };
    canvasEl.addEventListener('pointerdown', handler as any);
    // prevent default touch scrolling
    canvasEl.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    // cleanup will be handled in top-level onDestroy
  }
});

onDestroy(() => {
  if (canvasEl) {
    canvasEl.removeEventListener('pointerdown', handler as any);
    canvasEl.removeEventListener('touchstart', (e) => e.preventDefault());
  }
  if (ro && canvasEl) ro.unobserve(canvasEl);
});

function toggleCell(r: number, c: number) {
  if (!tokenValid) { message = 'Validate your token first'; return; }
  if (queued.findIndex(q => q.r === r && q.c === c) >= 0) {
    queued = queued.filter(q => !(q.r === r && q.c === c));
  } else {
    if (remaining > 0 && queued.length >= remaining) {
      message = 'You have reached your allowed edits';
      return;
    }
    queued = [...queued, { r, c, color }];
  }
}

async function submitEdits() {
  if (!token) { message = 'Enter token first'; return; }
  if (queued.length === 0) { message = 'No edits queued'; return; }
  const res = await fetch('/api/apply-edits', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, edits: queued })
  });
  const data = await res.json();
  if (data.ok) {
    message = `Applied edits. Remaining: ${data.remaining}`;
    queued = [];
    remaining = data.remaining;
  } else {
    message = `Failed: ${data.reason || data.error || 'unknown'}`;
  }
}
</script>

<div style="padding: 2rem; max-width: 800px; margin: 0 auto;">
  <h1>Edit Canvas</h1>
  <p>Enter your one-time token and click "Check" to see how many edits you have.</p>
  <div style="display:flex; gap: 1rem; align-items:center;">
  <input bind:value={token} placeholder="token" on:input={() => { tokenValid = false; remaining = 0; message = ''; queued = []; }} />
  <button on:click={checkToken} disabled={checking}>{checking ? 'Checking…' : 'Check'}</button>
  <span style="margin-left:8px; font-weight:600;">{tokenValid ? `Remaining: ${remaining}` : ''}</span>
  <div style="margin-left:8px; color:#666">{message}</div>
  </div>

  <div style="margin-top:1rem;">
    <label>Color: <input type="color" bind:value={color} /></label>
  </div>

  <div style="margin-top:1rem;">
    <p>Click the preview to queue edits (queued: {queued.length})</p>
    <div style="max-width:480px; width:100%; border:1px solid #ddd; padding:8px; box-sizing:border-box;">
      <div style="position:relative; width:100%; padding-top: calc( (1 / {cols}) * {rows} * 100% );">
        <!-- keeps the rows/cols ratio -->
        <canvas bind:this={canvasEl} style="position:absolute; left:8px; top:8px; right:8px; bottom:8px; width:calc(100% - 16px); height:calc(100% - 16px); touch-action: manipulation; cursor:crosshair;" />
      </div>
    </div>
  </div>

  <div style="margin-top:1rem;">
    <button on:click={submitEdits}>Submit edits</button>
  </div>
</div>
