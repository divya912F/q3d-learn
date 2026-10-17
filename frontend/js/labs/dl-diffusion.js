// DL lab: Diffusion — noise becomes a shape. Watch the reverse process pull random dots onto the data manifold.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { controls, Plot, Player, setLabContext, metric } from './kit.js';
import { space, glow, glowDot, label, loop, reducedMotion, cmap, rgba } from './neon.js';

export const meta = {
  howto: [
    'A diffusion model learns to turn pure noise into data. First it watches a shape dissolve into noise (the forward process).',
    'Then it runs that in reverse: press Generate and a cloud of random dots is nudged, step by step, until it lands on the shape.',
    'DDPM adds a little randomness each step (more variety); DDIM is deterministic and sharper. “Creativity” lets samples drift off the exact training points.',
    'This is exactly how image generators work — just in 2 dimensions so you can watch every denoising step.',
  ],
};

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { shape: 'spiral', particles: 400, steps: 50, sampler: 'ddpm', creativity: 0.05, seed: 3, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <div class="row"><button class="btn btn-course grow" data-run>${icon('sparkle')} Generate</button><button class="icon-btn" data-dice title="New noise">${icon('dice')}</button></div>
      <div class="card card-tight sticky small" data-explain></div></div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('sparkle')} <span data-title>Reverse diffusion</span></h3><span class="chip gray" data-step></span></div><div data-stage></div><div data-player style="margin-top:10px"></div></div>
      <div class="grid" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)" data-two>
        <div class="card board neon-card"><div class="card-head"><h3>${icon('wave')} Forward process (shape → noise)</h3></div><div data-forward></div></div>
        <div class="card"><div class="card-head"><h3>Result</h3></div><div class="metrics" data-metrics></div></div>
      </div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  controls($('[data-ctl]'), [
    { type: 'select', key: 'shape', label: 'Target shape', options: [['spiral', 'Spiral'], ['heart', 'Heart'], ['star', 'Star'], ['rings', 'Rings'], ['moons', 'Two moons'], ['smiley', 'Smiley']] },
    { type: 'seg', key: 'sampler', label: 'Sampler', options: [['ddpm', 'DDPM (stochastic)'], ['ddim', 'DDIM (deterministic)']] },
    { type: 'slider', key: 'steps', label: 'Denoising steps', min: 8, max: 120, step: 2 },
    { type: 'slider', key: 'particles', label: 'Particles', min: 50, max: 800, step: 50 },
    { type: 'slider', key: 'creativity', label: 'Creativity (kernel width)', min: 0, max: 0.2, step: 0.01 },
  ], st, (k, v, live) => { if (!live) run(); }, { lock });
  if (innerWidth < 900) $('[data-two]').style.gridTemplateColumns = '1fr';

  const stage = new Plot($('[data-stage]'), { height: 400 });
  const forward = new Plot($('[data-forward]'), { height: 220 });
  const player = new Player($('[data-player]'), { fps: 18, label: (i, n) => `step ${Math.round((1 - i / (n - 1)) * st.steps)} → 0` });
  let res = null, frame = 0, stop = null;

  const V = (w, h) => { const s = Math.min(w, h) / 2 - 20; return { s, cx: w / 2, cy: h / 2, X: (x) => w / 2 + x * s * 0.42, Y: (y) => h / 2 - y * s * 0.42 }; };

  function drawStage(t) {
    stage.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#9c36b5', stars: 60, t });
      if (!res) return;
      const { X, Y } = V(w, h);
      // faint target shape
      res.data.forEach(([x, y]) => { ctx.fillStyle = 'rgba(218,119,242,.12)'; ctx.fillRect(X(x) - 0.8, Y(y) - 0.8, 1.6, 1.6); });
      const pts = res.frames[Math.min(frame, res.frames.length - 1)];
      const prog = frame / (res.frames.length - 1);
      pts.forEach(([x, y]) => {
        const c = cmap('neon', 0.3 + 0.6 * prog);
        if (reducedMotion()) { ctx.fillStyle = c; ctx.fillRect(X(x) - 1.4, Y(y) - 1.4, 2.8, 2.8); }
        else glowDot(ctx, X(x), Y(y), 2, c, 8);
      });
      $('[data-step]').textContent = frame === res.frames.length - 1 ? 'done' : `denoising…`;
    });
  }

  function drawForward() {
    forward.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#9c36b5', stars: 10, grid: false });
      if (!res) return;
      const n = res.forward.length, cw = w / n;
      res.forward.forEach((f, i) => {
        const ox = i * cw, s = Math.min(cw, h) / 2 - 6, cx = ox + cw / 2, cy = h / 2;
        f.points.slice(0, 120).forEach(([x, y]) => { ctx.fillStyle = cmap('neon', 0.3 + 0.6 * (i / (n - 1)), 0.8); ctx.fillRect(cx + x * s * 0.42 - 1, cy - y * s * 0.42 - 1, 2, 2); });
        ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.strokeRect(ox, 2, cw, h - 4);
        if (i === 0) label(ctx, 'data', cx, h - 8, { align: 'center', size: 9, color: 'rgba(220,230,255,.7)' });
        if (i === n - 1) label(ctx, 'noise', cx, h - 8, { align: 'center', size: 9, color: 'rgba(220,230,255,.7)' });
      });
      label(ctx, 'add noise →', w / 2, 12, { align: 'center', size: 10, color: 'rgba(220,230,255,.6)' });
    });
  }

  async function run() {
    try { res = await api.lab('dl/diffusion', { ...st }, store.user?.id); } catch (e) { toast(esc(e.message), 'error'); return; }
    drawForward();
    player.load(res.frames.length, (i) => { frame = i; });
    $('[data-metrics]').innerHTML = metric('On-shape', `${res.on_shape_pct}%`, res.on_shape_pct > 80 ? 'good' : '') + metric('Avg dist to data', res.mean_distance_to_data) + metric('Steps', res.steps) + metric('Sampler', res.sampler.toUpperCase());
    $('[data-explain]').innerHTML = `Each step the model estimates “given this noisy point, where was the clean shape?” and takes a small step that way. After ${res.steps} steps, <b>${res.on_shape_pct}%</b> of the particles land on the ${esc(res.shape)}. ${res.sampler === 'ddim' ? 'DDIM is deterministic — same noise always gives the same result.' : 'DDPM injects fresh randomness, so each run differs.'}`;
    setLabContext('diffusion', 'Diffusion model', [`Shape ${res.shape}, ${res.particles} particles, ${res.steps} steps, ${res.sampler}, creativity ${res.creativity}`, `${res.on_shape_pct}% of generated points within 0.05 of the data; mean distance ${res.mean_distance_to_data}`]);
  }
  $('[data-run]').addEventListener('click', run);
  $('[data-dice]').addEventListener('click', () => { st.seed = Math.floor(Math.random() * 1e5); run(); });
  stop = loop(drawStage);
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { stop?.(); player.pause(); stage.dispose(); forward.dispose(); } };
}
