// DL lab: Dream Machine — feature visualisation. Gradient ascent paints what a neuron "wants to see".
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, label, loop, reducedMotion, glowLine, TAU } from './neon.js';

export const meta = {
  howto: [
    'Pick a layer and a channel (neuron). Layer 1 holds edge/stripe detectors; layer 2 combines them into textures.',
    'Press Dream: starting from noise, gradient ascent changes the pixels to make that neuron fire as strongly as possible.',
    'Watch the image evolve and the activation climb. Try other palettes, seeds and kaleidoscope mode for surreal art.',
    'Open the neuron zoo to see every channel of a layer at once.',
  ],
};

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { layer: 2, channel: 3, palette: 'neon', steps: 40, seed: 7, size: 64, kaleido: false, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <div class="row"><button class="btn btn-course grow" data-run>${icon('sparkle')} Dream</button><button class="icon-btn" data-dice title="New random seed">${icon('dice')}</button></div>
      <button class="btn btn-ghost" data-zoo>${icon('grid')} Neuron zoo (all channels)</button>
      <div class="card card-tight sticky small" data-explain>Weights stay frozen — only the <b>input image</b> changes. The result shows the pattern this neuron detects. The first layer here is a bank of Gabor filters: the same stripe-and-edge detectors real CNNs learn first.</div>
    </div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('sparkle')} <span data-title>Dreaming…</span></h3><div class="row" style="gap:6px"><span class="chip gray" data-step></span><button class="btn btn-ghost btn-sm" data-save>${icon('download')} Save PNG</button></div></div><div data-stage></div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
        <div class="card board neon-card"><div class="card-head"><h3>${icon('trend')} Neuron activation</h3><span class="faint tiny">gradient ascent steps</span></div><div data-curve></div></div>
        <div class="card"><div class="card-head"><h3>Dream stats</h3></div><div class="metrics" data-metrics></div></div>
      </div>
      <div class="card board neon-card" data-zoowrap hidden><div class="card-head"><h3>${icon('grid')} Neuron zoo — layer <span data-zl></span></h3><span class="faint tiny">click one to study it</span></div><div class="dream-zoo" data-zooGrid></div></div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  const ctl = controls($('[data-ctl]'), [
    { type: 'seg', key: 'layer', label: 'Layer', numeric: true, options: [[1, 'Layer 1 · edges'], [2, 'Layer 2 · textures']] },
    { type: 'slider', key: 'channel', label: 'Channel (neuron)', min: 0, max: 11 },
    { type: 'seg', key: 'palette', label: 'Palette', options: [['neon', 'Neon'], ['aurora', 'Aurora'], ['magma', 'Magma'], ['ocean', 'Ocean'], ['natural', 'Raw RGB']] },
    { type: 'slider', key: 'steps', label: 'Ascent steps', min: 12, max: 60, step: 4 },
    { type: 'seg', key: 'size', label: 'Resolution', numeric: true, options: [[48, '48²'], [64, '64²'], [80, '80²']] },
    { type: 'toggle', key: 'kaleido', label: 'Kaleidoscope mode ✨' },
  ], st, (k, v, live) => {
    if (live) return;
    if (k === 'layer' && st.channel > (st.layer === 1 ? 11 : 7)) st.channel = 0;
    if (k === 'kaleido') return;
    run();
  }, { lock });

  const stage = new Plot($('[data-stage]'), { height: 440 });
  const curve = new Plot($('[data-curve]'), { height: 200 });
  let res = null, frames = [], shown = 0, tStart = 0, stop = null, tNow = 0;

  const loadImg = (src) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.src = src; });

  function draw(t) {
    stage.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#ae3ec9', stars: 90, t, grid: false });
      if (!frames.length) { label(ctx, 'Press Dream ✨', w / 2, h / 2, { align: 'center', size: 16, color: '#e5dbff' }); return; }
      const dur = reducedMotion() ? 0 : 900;
      const f = dur ? Math.min(frames.length - 1, (t - tStart) / dur) : frames.length - 1;
      const i = Math.floor(f), k = f - i;
      shown = i;
      const size = Math.min(w, h) - 30;
      const breathe = reducedMotion() ? 1 : 1 + 0.015 * Math.sin(t / 900);
      const x = (w - size) / 2, y = (h - size) / 2;
      ctx.save();
      ctx.translate(w / 2, h / 2); ctx.scale(breathe, breathe); ctx.translate(-w / 2, -h / 2);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      const paint = (img, alpha) => {
        ctx.globalAlpha = alpha;
        if (st.kaleido) {
          const half = size / 2;
          for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
            ctx.save(); ctx.translate(x + half, y + half); ctx.scale(sx, sy); ctx.drawImage(img, 0, 0, half, half); ctx.restore();
          }
        } else ctx.drawImage(img, x, y, size, size);
      };
      ctx.save(); glow(ctx, '#da77f2', 40); ctx.fillStyle = '#000'; ctx.fillRect(x, y, size, size); ctx.restore();
      paint(frames[i].img, 1);
      if (frames[i + 1]) paint(frames[i + 1].img, k);
      ctx.restore();
      ctx.globalAlpha = 1;
      $('[data-step]').textContent = `step ${frames[Math.min(frames.length - 1, Math.round(f))].step}/${res.steps}`;
    });
  }

  function drawCurve() {
    curve.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#ae3ec9', stars: 15 });
      const s = res.scores, max = Math.max(...s), min = Math.min(...s);
      const pts = s.map((v, i) => [30 + (i / (s.length - 1)) * (w - 44), h - 22 - ((v - min) / (max - min || 1)) * (h - 40)]);
      glowLine(ctx, pts, '#da77f2', 2.4, 16);
      const half = Math.floor(s.length / 2);
      label(ctx, '↑ finer octave', pts[half][0] + 6, h - 14, { size: 9, color: 'rgba(220,210,255,.6)' });
      label(ctx, `×${res.activation_gain}`, w - 12, 14, { align: 'right', size: 13, weight: 800, color: '#f3d9fa' });
      label(ctx, 'step →', w - 12, h - 8, { align: 'right', size: 10, color: 'rgba(220,210,255,.6)' });
    });
  }

  async function run() {
    $('[data-title]').textContent = 'Dreaming…';
    try {
      res = await api.lab('dl/dream', { layer: st.layer, channel: st.channel, palette: st.palette, steps: st.steps, seed: st.seed, size: st.size }, store.user?.id);
    } catch (e) { toast(esc(e.message), 'error'); return; }
    frames = await Promise.all(res.frames.map(async (f) => ({ step: f.step, img: await loadImg(f.png) })));
    tStart = tNow;
    $('[data-title]').textContent = `Layer ${res.layer} · neuron ${res.channel}`;
    drawCurve();
    $('[data-metrics]').innerHTML = metric('Activation gain', `×${res.activation_gain}`, 'good') + metric('Steps', res.steps) + metric('Image', `${res.size}×${res.size}×3`) + metric('Channels in layer', res.channels);
    setLabContext('dream', 'Dream machine', [`Feature visualisation of layer ${res.layer}, channel ${res.channel} (of ${res.channels}) by gradient ascent on the input`,
      `${res.steps} steps at ${res.size}×${res.size}; activation rose from ${res.scores[0]} to ${res.scores[res.scores.length - 1]} (×${res.activation_gain})`,
      `Layer 1 is a Gabor filter bank (oriented stripes/edges in colour); layer 2 mixes them into textures`, `Palette ${res.palette}`]);
  }

  $('[data-run]').addEventListener('click', run);
  $('[data-dice]').addEventListener('click', () => { st.seed = Math.floor(Math.random() * 10000); run(); });
  $('[data-save]').addEventListener('click', () => {
    if (!res) return;
    const a = Object.assign(document.createElement('a'), { href: res.final, download: `q3d-dream-L${res.layer}-c${res.channel}.png` });
    a.click();
  });
  $('[data-zoo]').addEventListener('click', async () => {
    const wrap = $('[data-zoowrap]');
    wrap.hidden = false;
    $('[data-zl]').textContent = st.layer;
    const n = st.layer === 1 ? 12 : 8;
    const grid = $('[data-zooGrid]');
    grid.innerHTML = Array.from({ length: n }, (_, c) => `<button class="zoo-cell" data-c="${c}"><span class="faint tiny">#${c}</span></button>`).join('');
    grid.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => { st.channel = +b.dataset.c; ctl.render(); run(); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
    for (let c = 0; c < n; c++) {
      try {
        const r = await api.lab('dl/dream', { layer: st.layer, channel: c, palette: st.palette, steps: 20, seed: st.seed, size: 48 });
        const cell = grid.querySelector(`[data-c="${c}"]`);
        cell.style.backgroundImage = `url(${r.final})`;
        cell.classList.add('ready');
      } catch { /* skip */ }
    }
  });
  stop = loop((t) => { tNow = t; draw(t); });
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { stop?.(); stage.dispose(); curve.dispose(); } };
}
