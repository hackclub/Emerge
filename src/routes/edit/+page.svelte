<script lang="ts">
import { onMount, onDestroy } from 'svelte';

let message = '';
let checking = false;
let token = '';
let color = '#ff6b6b';
let rows = 50;
let cols = 50;
let canvasData: any = null;
let queued: Array<{ r: number; c: number; color: string }> = [];
let canvasEl: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let ro: ResizeObserver | null = null;
let editsRemaining: number | null = null; // Track remaining edits
let tokenValidated = false; // Track if the token is validated

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


onMount(async () => {
  const res = await fetch('/canvas.json');
  canvasData = await res.json();
  rows = canvasData.rows || rows;
  cols = canvasData.cols || cols;
  // fetch remaining count
  try {
    const rem = await fetch(`/api/token_remaining?token=${token}`); // Include token in query string
    if (rem.ok) {
      const jr = await rem.json();
      if (jr && typeof jr.remaining === 'number') {
        message = `Edits remaining: ${jr.remaining}`;
      }
    }
  } catch (e) {}
  // setup canvas context and resize observer
  if (canvasEl) {
    ctx = canvasEl.getContext('2d');
    drawCanvas();
    ro = new ResizeObserver(() => drawCanvas());
    ro.observe(canvasEl);

    const handler = (ev: PointerEvent) => {
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
  if (queued.findIndex(q => q.r === r && q.c === c) >= 0) {
    queued = queued.filter(q => !(q.r === r && q.c === c));
  } else {
    queued = [...queued, { r, c, color }];
  }
}

async function submitEdits() {
  if (!tokenValidated) {
    message = 'Token not validated. Please check your token first.';
    return;
  }
  if (queued.length === 0) {
    message = 'No edits queued';
    return;
  }
  const res = await fetch('/api/apply-edits', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, edits: queued })
  });
  const data = await res.json();
  if (data.ok) {
    message = `Applied edits.`;
    queued = [];
  } else {
    message = `Failed: ${data.reason || data.error || 'unknown'}`;
  }
}

async function checkToken() {
  if (!token) {
    message = 'Please enter a token';
    return;
  }
  checking = true;
  try {
    const res = await fetch(`/api/token_remaining?token=${token}`);
    if (res.ok) {
      const data = await res.json();
      editsRemaining = data.remaining;
      tokenValidated = true; // Mark token as validated
      message = `Token valid. Edits remaining: ${editsRemaining}`;
    } else {
      editsRemaining = null;
      tokenValidated = false;
      message = 'Invalid token';
    }
  } catch (e) {
    editsRemaining = null;
    tokenValidated = false;
    message = 'Error checking token';
  } finally {
    checking = false;
  }
}
</script>

<div style="padding: 2rem; max-width: 800px; margin: 0 auto;">
  <h1>Edit Canvas</h1>
  <p>Enter your one-time token and click "Check" to see how many edits you have.</p>
  <div style="display:flex; gap: 1rem; align-items:center;">
    <input bind:value={token} placeholder="friend token" />
    <button on:click={checkToken} disabled={checking}>Check</button>
    <div style="margin-left:8px; color:#666">{message}</div>
  </div>

  {#if editsRemaining !== null}
    <div style="margin-top:1rem;">Edits remaining: {editsRemaining}</div>
  {/if}

  <div style="margin-top:1rem;">
    <label>Color: <input type="color" bind:value={color} /></label>
  </div>

  <div style="margin-top:1rem;">
    <p>Click the preview to queue edits (queued: {queued.length})</p>
    <div style="max-width:480px; width:100%; border:1px solid #ddd; padding:8px; box-sizing:border-box;">
      <div style="position:relative; width:100%; padding-top: calc( (1 / {cols}) * {rows} * 100% );">
        <!-- keeps the rows/cols ratio -->
  <canvas bind:this={canvasEl} style="position:absolute; left:8px; top:8px; right:8px; bottom:8px; width:calc(100% - 16px); height:calc(100% - 16px); touch-action: manipulation; cursor:crosshair;"></canvas>
      </div>
    </div>
  </div>

  <div style="margin-top:1rem;">
    <button on:click={submitEdits}>Submit edits</button>
  </div>
</div>
