// Neon visual toolkit for the "dreamy" labs: deep-space backgrounds, glow strokes, colour maps and heatmaps.
// Everything draws onto a normal 2D canvas (kit.js Plot) — no extra libraries.

export const TAU = Math.PI * 2;
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const MAPS = {
  magma: [[0, 0, 4], [59, 15, 112], [140, 41, 129], [222, 73, 104], [254, 159, 109], [252, 253, 191]],
  viridis: [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]],
  neon: [[8, 0, 30], [80, 0, 160], [230, 30, 170], [40, 230, 255], [255, 255, 220]],
  ice: [[2, 6, 24], [10, 50, 110], [20, 130, 200], [120, 220, 255], [240, 255, 255]],
  fire: [[10, 0, 0], [120, 10, 0], [230, 80, 0], [255, 190, 40], [255, 255, 210]],
  diverge: [[40, 120, 255], [12, 16, 40], [255, 70, 120]],
};

/** Colour at t ∈ [0,1] of a named map → [r,g,b]. */
export function cmapRGB(name, t) {
  const m = MAPS[name] || MAPS.magma;
  const x = clamp(t) * (m.length - 1);
  const i = Math.min(m.length - 2, Math.floor(x));
  const f = x - i;
  return [0, 1, 2].map((k) => Math.round(lerp(m[i][k], m[i + 1][k], f)));
}
export const cmap = (name, t, a = 1) => { const [r, g, b] = cmapRGB(name, t); return `rgba(${r},${g},${b},${a})`; };

/** Deep-space backdrop with a soft nebula tint and faint grid. */
export function space(ctx, w, h, { tint = '#7048e8', grid = true, stars = 60, seed = 1, t = 0 } = {}) {
  const g = ctx.createRadialGradient(w * 0.3, h * 0.2, 10, w * 0.5, h * 0.6, Math.max(w, h));
  g.addColorStop(0, mixHex(tint, '#0b0d1a', 0.72));
  g.addColorStop(0.55, '#090b16');
  g.addColorStop(1, '#04050b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  let s = seed * 9301;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < stars; i++) {
    const x = rnd() * w, y = rnd() * h, r = rnd() * 1.2 + 0.2;
    ctx.fillStyle = `rgba(220,230,255,${0.25 + 0.45 * Math.abs(Math.sin(t / 900 + i))})`;
    ctx.fillRect(x, y, r, r);
  }
  if (grid) {
    ctx.strokeStyle = 'rgba(140,160,255,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke(); }
  }
}

export function glow(ctx, color, blur = 14) { ctx.shadowColor = color; ctx.shadowBlur = blur; }
export function noGlow(ctx) { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; }

export function glowDot(ctx, x, y, r, color, blur = 18) {
  ctx.save();
  glow(ctx, color, blur);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.restore();
}

export function glowLine(ctx, pts, color, width = 2, blur = 12) {
  if (pts.length < 2) return;
  ctx.save();
  glow(ctx, color, blur);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.restore();
}

/** Draw a 2-D matrix as a crisp heatmap into a rectangle. */
export function heatmap(ctx, M, x, y, w, h, { map = 'magma', min = null, max = null, smooth = false } = {}) {
  const rows = M.length, cols = M[0].length;
  let lo = min, hi = max;
  if (lo == null || hi == null) {
    let a = Infinity, b = -Infinity;
    for (const r of M) for (const v of r) { if (v < a) a = v; if (v > b) b = v; }
    lo ??= a; hi ??= b;
  }
  const off = document.createElement('canvas');
  off.width = cols; off.height = rows;
  const oc = off.getContext('2d');
  const img = oc.createImageData(cols, rows);
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const [r, g, b] = cmapRGB(map, (M[i][j] - lo) / (hi - lo || 1));
    const k = 4 * (i * cols + j);
    img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = 255;
  }
  oc.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = smooth;
  ctx.drawImage(off, x, y, w, h);
  ctx.restore();
  return { lo, hi };
}

export function mixHex(a, b, t) {
  const pa = hexRGB(a), pb = hexRGB(b);
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], t))).join(',')})`;
}
export function hexRGB(h) {
  if (h.startsWith('rgb')) return h.match(/[\d.]+/g).slice(0, 3).map(Number);
  const s = h.replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map((c) => c + c).join('') : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgba = (hex, a) => { const [r, g, b] = hexRGB(hex); return `rgba(${r},${g},${b},${a})`; };

/** requestAnimationFrame loop helper → returns stop(). */
export function loop(fn) {
  let raf = 0, running = true;
  const t0 = performance.now();
  const tick = (t) => { if (!running) return; fn(t - t0); raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  return () => { running = false; cancelAnimationFrame(raf); };
}

export const reducedMotion = () => document.documentElement.dataset.motion === 'reduce'
  || (document.documentElement.dataset.motion !== 'full' && matchMedia('(prefers-reduced-motion: reduce)').matches);

/** Short readable label inside the canvas. */
export function label(ctx, text, x, y, { color = 'rgba(220,230,255,.85)', size = 11, align = 'left', weight = 600, font = 'Inter, system-ui, sans-serif' } = {}) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Project a 3-D point with yaw/pitch rotation into canvas space → [x, y, depth]. */
export function project([x, y, z], { yaw = 0, pitch = 0, scale = 100, cx = 0, cy = 0, persp = 3.2 } = {}) {
  const cy1 = Math.cos(yaw), sy1 = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const x1 = x * cy1 - z * sy1, z1 = x * sy1 + z * cy1;
  const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
  const k = persp / (persp + z2);
  return [cx + x1 * scale * k, cy - y2 * scale * k, z2];
}

/** Drag-to-orbit on a canvas. view = {yaw, pitch}; onChange() is called while dragging. Returns detach(). */
export function orbit(canvas, view, onChange = () => {}) {
  let drag = null;
  const down = (e) => { drag = [e.clientX, e.clientY]; view.dragging = true; canvas.setPointerCapture?.(e.pointerId); };
  const move = (e) => {
    if (!drag) return;
    view.yaw += (e.clientX - drag[0]) * 0.01;
    view.pitch = clamp(view.pitch + (e.clientY - drag[1]) * 0.01, -1.4, 1.4);
    drag = [e.clientX, e.clientY];
    onChange();
  };
  const up = () => { drag = null; view.dragging = false; };
  canvas.style.cursor = 'grab';
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  return () => { canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
}

/** Rainbow-ish neon hue for index i of n. */
export const hue = (i, n, s = 95, l = 62, a = 1) => `hsla(${Math.round((i / Math.max(1, n)) * 300 + 190) % 360},${s}%,${l}%,${a})`;
