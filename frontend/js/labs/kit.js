// Shared building blocks for the visual labs: declarative controls, HiDPI canvases,
// an animation player and the AI-tutor context hook.
import { store } from '../store.js';
import { esc, icon, setRangeFill, cssVar } from '../ui.js';

/* ------------------------------------------------------------------ controls */
/**
 * Render a list of controls into `root` bound to `state`.
 * spec item: {type:'select'|'slider'|'seg'|'toggle'|'text'|'number', key, label, options:[[value,label]],
 *             min, max, step, fmt, log, show:(state)=>bool, help}
 */
export function controls(root, spec, state, onChange, { lock = [] } = {}) {
  const render = () => {
    root.innerHTML = spec.filter((c) => !c.show || c.show(state)).map((c) => {
      const locked = lock.includes(c.key) ? ' locked' : '';
      const v = state[c.key];
      const fmt = c.fmt || ((x) => x);
      if (c.type === 'select') {
        return `<div class="ctl${locked}"><label>${esc(c.label)}</label><select class="input" data-k="${c.key}">${c.options.map(([val, lab]) => `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>${c.help ? `<span class="faint tiny">${c.help}</span>` : ''}</div>`;
      }
      if (c.type === 'seg') {
        return `<div class="ctl${locked}"><label>${esc(c.label)}</label><div class="seg" data-k="${c.key}">${c.options.map(([val, lab]) => `<button type="button" data-v="${esc(val)}" class="${String(val) === String(v) ? 'active' : ''}">${esc(lab)}</button>`).join('')}</div></div>`;
      }
      if (c.type === 'slider') {
        const pos = c.log ? Math.log10(v) : v;
        const min = c.log ? Math.log10(c.min) : c.min, max = c.log ? Math.log10(c.max) : c.max;
        return `<div class="ctl${locked}"><label>${esc(c.label)} <span data-out="${c.key}">${fmt(v)}</span></label>
          <input type="range" data-k="${c.key}" min="${min}" max="${max}" step="${c.log ? 0.01 : c.step || 1}" value="${pos}" ${c.log ? 'data-log="1"' : ''}>${c.help ? `<span class="faint tiny">${c.help}</span>` : ''}</div>`;
      }
      if (c.type === 'toggle') {
        return `<div class="ctl${locked}"><label class="toggle" style="justify-content:flex-start"><input type="checkbox" data-k="${c.key}" ${v ? 'checked' : ''}> ${esc(c.label)}</label></div>`;
      }
      if (c.type === 'text' || c.type === 'number') {
        return `<div class="ctl${locked}"><label>${esc(c.label)}</label><input class="input" data-k="${c.key}" type="${c.type}" value="${esc(v ?? '')}" ${c.min != null ? `min="${c.min}"` : ''} ${c.max != null ? `max="${c.max}"` : ''} ${c.step ? `step="${c.step}"` : ''}></div>`;
      }
      if (c.type === 'custom') return `<div class="ctl${locked}" data-custom="${c.key}"></div>`;
      return '';
    }).join('');
    root.querySelectorAll('input[type=range]').forEach((r) => setRangeFill(r));
    spec.filter((c) => c.type === 'custom' && (!c.show || c.show(state))).forEach((c) => c.render(root.querySelector(`[data-custom="${c.key}"]`), state, (v) => set(c.key, v)));
  };
  const set = (k, v) => {
    const before = spec.map((c) => !c.show || c.show(state)).join();
    state[k] = v;
    const after = spec.map((c) => !c.show || c.show(state)).join();
    if (before !== after) render();
    onChange(k, v);
  };
  root.addEventListener('input', (e) => {
    const el = e.target.closest('[data-k]');
    if (!el || el.tagName !== 'INPUT' || el.type !== 'range') return;
    const c = spec.find((s) => s.key === el.dataset.k);
    let v = +el.value;
    if (el.dataset.log) v = +(10 ** v).toPrecision(2);
    setRangeFill(el);
    const out = root.querySelector(`[data-out="${c.key}"]`);
    if (out) out.textContent = (c.fmt || ((x) => x))(v);
    state[c.key] = v;
    onChange(c.key, v, true);
  });
  root.addEventListener('change', (e) => {
    const el = e.target.closest('[data-k]');
    if (!el) return;
    const c = spec.find((s) => s.key === el.dataset.k);
    if (!c) return;
    if (el.type === 'range') { onChange(c.key, state[c.key], false); return; }
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (c.type === 'number') v = +v;
    if (c.numeric) v = +v;
    set(c.key, v);
  });
  root.addEventListener('click', (e) => {
    const b = e.target.closest('.seg button');
    if (!b) return;
    const seg = b.closest('[data-k]');
    const c = spec.find((s) => s.key === seg.dataset.k);
    seg.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
    set(c.key, c.numeric ? +b.dataset.v : b.dataset.v);
  });
  render();
  return { render };
}

/* ------------------------------------------------------------------ canvas */
export class Plot {
  /** A HiDPI canvas that redraws on resize. draw(ctx, w, h) */
  constructor(container, { height = 420, aspect = null } = {}) {
    this.container = container;
    container.classList.add('plot');
    this.canvas = document.createElement('canvas');
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.height = height;
    this.aspect = aspect;
    this.drawFn = null;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
  }

  resize() {
    const w = Math.max(200, this.container.clientWidth);
    const h = this.aspect ? Math.round(w * this.aspect) : this.height;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = w; this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.redraw();
  }

  draw(fn) { this.drawFn = fn; this.redraw(); }

  redraw() {
    if (!this.drawFn) return;
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.drawFn(this.ctx, this.w, this.h);
  }

  /** Map client coords to canvas coords. */
  local(e) {
    const r = this.canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  dispose() { this.ro.disconnect(); this.canvas.remove(); }
}

/** Linear mapping helper between data extent and pixel box. */
export function frame(extent, w, h, pad = 34) {
  const [x0, x1, y0, y1] = extent;
  return {
    sx: (x) => pad + ((x - x0) / (x1 - x0 || 1)) * (w - pad - 10),
    sy: (y) => h - pad - ((y - y0) / (y1 - y0 || 1)) * (h - pad - 10),
    ix: (px) => x0 + ((px - pad) / (w - pad - 10)) * (x1 - x0),
    iy: (py) => y0 + ((h - pad - py) / (h - pad - 10)) * (y1 - y0),
    pad, extent,
  };
}

export function drawAxes(ctx, f, w, h, { xLabel = '', yLabel = '', ticks = 5 } = {}) {
  const grid = cssVar('--chart-grid') || 'rgba(0,0,0,.08)';
  const axis = cssVar('--chart-axis') || '#999';
  const text = cssVar('--text-3') || '#888';
  const [x0, x1, y0, y1] = f.extent;
  ctx.save();
  ctx.lineWidth = 1;
  ctx.font = '10px Inter, system-ui, sans-serif';
  ctx.fillStyle = text;
  for (let k = 0; k <= ticks; k++) {
    const xv = x0 + ((x1 - x0) * k) / ticks;
    const yv = y0 + ((y1 - y0) * k) / ticks;
    ctx.strokeStyle = grid;
    ctx.beginPath(); ctx.moveTo(f.sx(xv), f.sy(y0)); ctx.lineTo(f.sx(xv), f.sy(y1)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(f.sx(x0), f.sy(yv)); ctx.lineTo(f.sx(x1), f.sy(yv)); ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillText(short(xv), f.sx(xv), h - f.pad + 14);
    ctx.textAlign = 'right';
    ctx.fillText(short(yv), f.pad - 5, f.sy(yv) + 3);
  }
  ctx.strokeStyle = axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(f.sx(x0), f.sy(y1)); ctx.lineTo(f.sx(x0), f.sy(y0)); ctx.lineTo(f.sx(x1), f.sy(y0)); ctx.stroke();
  ctx.fillStyle = cssVar('--text-2');
  ctx.font = '600 11px Inter, system-ui, sans-serif';
  if (xLabel) { ctx.textAlign = 'right'; ctx.fillText(xLabel, f.sx(x1), h - 4); }
  if (yLabel) { ctx.save(); ctx.translate(11, f.sy(y1)); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'right'; ctx.fillText(yLabel, 0, 0); ctx.restore(); }
  ctx.restore();
}

function short(v) {
  const a = Math.abs(v);
  if (a >= 1000) return v.toFixed(0);
  if (a >= 10) return v.toFixed(0);
  if (a >= 1) return v.toFixed(1);
  return v.toFixed(2);
}

export function dot(ctx, x, y, r, fill, stroke = null, lw = 1.5) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

export function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* ------------------------------------------------------------------ player */
export class Player {
  /** Frame scrubber with play/pause. onFrame(i) is called for every frame shown. */
  constructor(root, { label = (i, n) => `${i + 1}/${n}`, fps = 12 } = {}) {
    this.root = root;
    this.labelFn = label;
    this.fps = fps;
    this.n = 0;
    this.i = 0;
    this.timer = null;
    root.classList.add('player');
    root.innerHTML = `<button class="icon-btn" data-play title="Play / pause">${icon('play')}</button>
      <input type="range" min="0" max="0" value="0" data-scrub aria-label="Training step">
      <span class="lbl" data-lbl>—</span>`;
    this.btn = root.querySelector('[data-play]');
    this.scrub = root.querySelector('[data-scrub]');
    this.lbl = root.querySelector('[data-lbl]');
    this.btn.addEventListener('click', () => (this.timer ? this.pause() : this.play()));
    this.scrub.addEventListener('input', () => { this.pause(); this.show(+this.scrub.value); });
  }

  load(n, onFrame, { autoplay = true } = {}) {
    this.pause();
    this.n = n;
    this.onFrame = onFrame;
    this.scrub.max = Math.max(0, n - 1);
    if (autoplay && n > 1) { this.show(0); this.play(); } else this.show(n - 1);
  }

  show(i) {
    this.i = Math.max(0, Math.min(this.n - 1, i));
    this.scrub.value = this.i;
    setRangeFill(this.scrub);
    this.lbl.textContent = this.labelFn(this.i, this.n);
    this.onFrame?.(this.i);
  }

  play() {
    if (this.n < 2) return;
    if (this.i >= this.n - 1) this.show(0);
    this.btn.innerHTML = icon('pause');
    this.timer = setInterval(() => {
      if (!this.root.isConnected) { this.pause(); return; }
      if (this.i >= this.n - 1) { this.pause(); return; }
      this.show(this.i + 1);
    }, 1000 / this.fps);
  }

  pause() {
    clearInterval(this.timer);
    this.timer = null;
    this.btn.innerHTML = icon('play');
  }
}

/* ------------------------------------------------------------------ context for Q-Bot */
export function setLabContext(lab, title, facts) {
  store.labContext = { lab, title, facts: facts.filter(Boolean).map(String).slice(0, 20) };
  store.lastLab = { course: store.currentCourse, ...store.labContext };
}

export function metric(label, value, cls = '') {
  return `<div class="metric ${cls}"><small>${esc(label)}</small><b>${value}</b></div>`;
}

export const pct = (v) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);
