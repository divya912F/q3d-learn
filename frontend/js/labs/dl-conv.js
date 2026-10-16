// DL lab: Convolution Studio — a glowing 3×3 window sweeps the image while the feature map builds up.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons, debounce } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, label, loop, reducedMotion, heatmap, cmap } from './neon.js';

export const meta = {
  howto: [
    'Pick an image — or choose “Draw my own” and paint on the input with your mouse or finger.',
    'Choose a kernel. The glowing 3×3 window slides over the image; each output pixel is the sum of 9 products.',
    'Turn ReLU and max-pooling on and off to see what a CNN layer really outputs.',
    'Click any thumbnail in the kernel bank to switch filters; hover the feature map to see one pixel’s calculation.',
  ],
};
const KERNELS = [['identity', 'Identity'], ['blur', 'Box blur'], ['gaussian', 'Gaussian blur'], ['sharpen', 'Sharpen'], ['edges', 'All edges'], ['vertical', 'Vertical edges (Sobel)'], ['horizontal', 'Horizontal edges (Sobel)'], ['emboss', 'Emboss'], ['custom', 'Custom 3×3']];
const IMAGES = [['seven', 'Hand-written 7'], ['circle', 'Circle'], ['house', 'House'], ['smile', 'Smiley'], ['letter', 'Letter A'], ['checker', 'Checkerboard'], ['stripes', 'Vertical stripes'], ['gradient', 'Gradient'], ['draw', 'Draw my own ✏️']];

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { image: 'seven', kernel: 'vertical', relu: true, pool: true, custom: '0,-1,0,-1,5,-1,0,-1,0', speed: 6, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div><div class="card card-tight sticky small" data-explain></div></div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('image')} Input → kernel → feature map</h3><div class="row" style="gap:6px"><span class="chip gray" data-kchip></span><button class="btn btn-ghost btn-sm" data-replay>${icon('reset')} Replay sweep</button></div></div>
        <div data-stage></div><div class="small faint" data-hover style="min-height:22px;margin-top:6px"></div></div>
      <div class="card board neon-card"><div class="card-head"><h3>${icon('grid')} Kernel bank — one image, many detectors</h3><span class="faint tiny">click to use</span></div><div class="kernel-bank" data-bank></div></div>
      <div class="card"><div class="card-head"><h3>Layer output</h3></div><div class="metrics" data-metrics></div></div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  controls($('[data-ctl]'), [
    { type: 'select', key: 'image', label: 'Image', options: IMAGES },
    { type: 'select', key: 'kernel', label: 'Kernel', options: KERNELS },
    { type: 'text', key: 'custom', label: 'Custom kernel (9 numbers, row by row)', show: (s) => s.kernel === 'custom' },
    { type: 'toggle', key: 'relu', label: 'ReLU (zero the negatives)' },
    { type: 'toggle', key: 'pool', label: '2×2 max-pooling' },
    { type: 'slider', key: 'speed', label: 'Sweep speed', min: 1, max: 12, fmt: (v) => `${v}×` },
  ], st, (k, v, live) => { if (live) return; if (k === 'image' && v === 'draw' && !drawn) drawn = blankWithSeven(); run(); }, { lock });

  const stage = new Plot($('[data-stage]'), { height: 400 });
  let res = null, pos = 0, stop = null, tPrev = 0, drawn = null, hoverCell = null, painting = false;
  const N = 32;

  function blankWithSeven() { return Array.from({ length: N }, () => new Array(N).fill(0)); }
  function boxes(w, h) {
    const gap = 26, size = Math.min((w - gap * 4) / 3.4, h - 130);
    const pool = size * 0.5;
    const x0 = (w - (size * 2 + pool + gap * 2)) / 2;
    return { size, pool, inX: x0, outX: x0 + size + gap, poolX: x0 + 2 * size + 2 * gap, y: 38 };
  }

  function draw(t) {
    stage.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#ae3ec9', stars: 60, t, grid: false });
      if (!res) return;
      const B = boxes(w, h), cs = B.size / N;
      const img = res.image;
      heatmap(ctx, img, B.inX, B.y, B.size, B.size, { map: 'ice', min: 0, max: 1 });
      const out = st.relu ? res.activation : res.conv;
      const lim = Math.max(1e-6, ...out.flat().map(Math.abs));
      // partially built feature map
      const shown = Math.floor(pos);
      const partial = out.map((row, i) => row.map((v, j) => (i * N + j < shown ? v : (st.relu ? 0 : -lim * 2))));
      heatmap(ctx, partial, B.outX, B.y, B.size, B.size, { map: st.relu ? 'magma' : 'diverge', min: st.relu ? 0 : -lim, max: lim });
      if (shown >= N * N && res.pool) heatmap(ctx, res.pooled, B.poolX, B.y + (B.size - B.pool) / 2, B.pool, B.pool, { map: 'magma', min: 0, max: Math.max(1e-6, ...res.pooled.flat()) });
      // frames
      [[B.inX, B.y, B.size, 'input 32×32'], [B.outX, B.y, B.size, st.relu ? 'feature map (after ReLU)' : 'feature map'], ...(res.pool ? [[B.poolX, B.y + (B.size - B.pool) / 2, B.pool, 'pooled 16×16']] : [])]
        .forEach(([x, y, s, txt]) => { ctx.save(); glow(ctx, '#da77f2', 14); ctx.strokeStyle = 'rgba(218,119,242,.6)'; ctx.strokeRect(x - 1, y - 1, s + 2, s + 2); ctx.restore(); label(ctx, txt, x, y - 12, { size: 11, color: '#e5dbff' }); });
      // sliding window + beam
      const cur = Math.min(N * N - 1, shown);
      const ci = hoverCell ? hoverCell[0] : Math.floor(cur / N), cj = hoverCell ? hoverCell[1] : cur % N;
      const wx = B.inX + (cj - 1) * cs, wy = B.y + (ci - 1) * cs;
      if (shown < N * N || hoverCell) {
        ctx.save(); glow(ctx, '#ffffff', 24); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(wx, wy, cs * 3, cs * 3); ctx.restore();
        const ox = B.outX + cj * cs, oy = B.y + ci * cs;
        ctx.save(); glow(ctx, '#ffd43b', 18); ctx.strokeStyle = '#ffd43b'; ctx.lineWidth = 2; ctx.strokeRect(ox, oy, cs, cs);
        ctx.strokeStyle = 'rgba(255,212,59,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(wx + cs * 3, wy + cs * 1.5); ctx.lineTo(ox, oy + cs / 2); ctx.stroke(); ctx.restore();
      }
      // the kernel itself, drawn as a glowing 3×3 tile under the input
      const kc = 24, kx = B.inX + B.size / 2 - kc * 1.5, ky = B.y + B.size + 22;
      label(ctx, 'kernel', kx - 8, ky + kc * 1.5, { align: 'right', size: 10, color: '#e5dbff' });
      res.kernel.forEach((row, i) => row.forEach((v, j) => {
        const mag = Math.min(1, Math.abs(v) / 4);
        ctx.fillStyle = v > 0 ? cmap('fire', 0.25 + 0.7 * mag) : v < 0 ? cmap('ice', 0.25 + 0.7 * mag) : 'rgba(255,255,255,.08)';
        ctx.fillRect(kx + j * kc + 1, ky + i * kc + 1, kc - 2, kc - 2);
        label(ctx, Number.isInteger(v) ? String(v) : v.toFixed(2), kx + j * kc + kc / 2, ky + i * kc + kc / 2, { align: 'center', size: 9, weight: 700, color: mag > 0.5 ? '#0b0d1a' : '#fff', font: 'JetBrains Mono, monospace' });
      }));
    });
  }

  function frame(t) {
    const dt = Math.min(0.1, (t - tPrev) / 1000); tPrev = t;
    if (res && pos < N * N) pos = reducedMotion() ? N * N : Math.min(N * N, pos + dt * 60 * st.speed);
    draw(t);
  }

  function bank() {
    $('[data-bank]').innerHTML = Object.keys(res.bank).map((k) => `<button class="kb ${k === st.kernel ? 'active' : ''}" data-k="${k}"><canvas width="64" height="64"></canvas><span>${esc(KERNELS.find((x) => x[0] === k)?.[1].split(' (')[0] || k)}</span></button>`).join('');
    $('[data-bank]').querySelectorAll('[data-k]').forEach((b) => {
      const c = b.querySelector('canvas').getContext('2d');
      const M = res.bank[b.dataset.k];
      heatmap(c, M, 0, 0, 64, 64, { map: 'magma', min: 0, max: Math.max(1e-6, ...M.flat()) });
      b.addEventListener('click', () => { st.kernel = b.dataset.k; root.querySelector('[data-k="kernel"]').value = st.kernel; run(); });
    });
  }

  async function run() {
    const cfg = { kernel: st.kernel, relu: st.relu, pool: st.pool };
    if (st.image === 'draw') cfg.pixels = drawn; else cfg.image = st.image;
    if (st.kernel === 'custom') {
      const nums = String(st.custom).split(/[\s,]+/).filter(Boolean).map(Number);
      if (nums.length !== 9 || nums.some((x) => !Number.isFinite(x))) { toast('A custom kernel needs exactly 9 numbers.', 'info'); return; }
      cfg.custom = [nums.slice(0, 3), nums.slice(3, 6), nums.slice(6, 9)];
    }
    try { res = await api.lab('dl/conv', cfg, store.user?.id); } catch (e) { toast(esc(e.message), 'error'); return; }
    pos = st.image === 'draw' ? N * N : 0;
    $('[data-kchip]').textContent = KERNELS.find((k) => k[0] === st.kernel)?.[1] || st.kernel;
    $('[data-metrics]').innerHTML = metric('Kernel weights', 9) + metric('Output size', res.pool ? '16×16' : '32×32') + metric('Max response', res.stats.max) + metric('Active pixels', `${Math.round(res.stats.active * 100)}%`);
    bank();
    $('[data-explain]').innerHTML = {
      vertical: 'The <b>vertical Sobel</b> kernel subtracts the left column from the right: bright where the image gets brighter left→right — vertical edges.',
      horizontal: 'The <b>horizontal Sobel</b> kernel compares rows above and below: it finds horizontal edges.',
      edges: 'This <b>Laplacian</b> kernel responds wherever a pixel differs from all its neighbours — outlines in every direction.',
      blur: 'A <b>box blur</b> averages the 3×3 neighbourhood, smoothing noise and details.', gaussian: 'A <b>Gaussian blur</b> weights the centre more — a softer, more natural blur.',
      sharpen: '<b>Sharpen</b> boosts the centre pixel against its neighbours, exaggerating edges.', emboss: '<b>Emboss</b> lights edges from one diagonal — a 3-D relief look.',
      identity: 'The <b>identity</b> kernel copies the image: only the centre weight is 1.', custom: 'Your own kernel! CNNs <b>learn</b> these 9 numbers during training.',
    }[st.kernel];
    setLabContext('conv', 'Convolution studio', [`Image: ${st.image === 'draw' ? 'learner drawing' : st.image} (32×32 greyscale)`, `Kernel ${st.kernel}: ${JSON.stringify(res.kernel)}`,
      `Raw output range ${res.stats.min} … ${res.stats.max}; ReLU ${st.relu ? 'on' : 'off'}, pooling ${st.pool ? 'on (16×16 output)' : 'off'}`, `${Math.round(res.stats.active * 100)}% of output pixels are active`]);
  }

  // drawing & hover
  const cellAt = (e) => {
    const [x, y] = stage.local(e);
    const B = boxes(stage.w, stage.h), cs = B.size / N;
    const inIn = x >= B.inX && x < B.inX + B.size && y >= B.y && y < B.y + B.size;
    const inOut = x >= B.outX && x < B.outX + B.size && y >= B.y && y < B.y + B.size;
    if (inIn) return { where: 'in', i: Math.floor((y - B.y) / cs), j: Math.floor((x - B.inX) / cs) };
    if (inOut) return { where: 'out', i: Math.floor((y - B.y) / cs), j: Math.floor((x - B.outX) / cs) };
    return null;
  };
  const paint = (c) => {
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      const i = c.i + di, j = c.j + dj;
      if (i >= 0 && i < N && j >= 0 && j < N) drawn[i][j] = Math.max(drawn[i][j], di === 0 && dj === 0 ? 1 : 0.55);
    }
    res.image = drawn;
  };
  const rerun = debounce(run, 250);
  stage.canvas.addEventListener('pointerdown', (e) => {
    const c = cellAt(e);
    if (c?.where === 'in' && st.image === 'draw') { painting = true; stage.canvas.setPointerCapture(e.pointerId); paint(c); }
  });
  stage.canvas.addEventListener('pointermove', (e) => {
    const c = cellAt(e);
    if (painting && c?.where === 'in') { paint(c); rerun(); return; }
    if (c?.where === 'out' && res && pos >= N * N) {
      hoverCell = [c.i, c.j];
      const terms = [];
      let sum = 0;
      for (let u = -1; u <= 1; u++) for (let v = -1; v <= 1; v++) {
        const px = res.image[c.i + u]?.[c.j + v] ?? 0, kv = res.kernel[u + 1][v + 1];
        sum += px * kv;
        if (kv) terms.push(`${px.toFixed(2)}×${kv}`);
      }
      $('[data-hover]').innerHTML = `pixel (${c.i}, ${c.j}) = ${terms.slice(0, 9).join(' + ')} = <b>${sum.toFixed(2)}</b>${st.relu ? ` → ReLU → <b>${Math.max(0, sum).toFixed(2)}</b>` : ''}`;
    } else { hoverCell = null; }
  });
  stage.canvas.addEventListener('pointerup', () => { if (painting) { painting = false; run(); } });
  stage.canvas.addEventListener('pointerleave', () => { hoverCell = null; });
  $('[data-replay]').addEventListener('click', () => { pos = 0; });
  if (st.image === 'draw') drawn = blankWithSeven();
  stop = loop(frame);
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { stop?.(); stage.dispose(); } };
}
