// Quantum lab: Quantum Walk — a 3D neon ridgeline of probability over time, versus a classical random walk.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, label, glowLine, TAU } from './neon.js';

export const meta = {
  howto: [
    'A walker starts at position 0 holding a qubit “coin”. Every step: apply the coin gate, then move left for |0⟩ and right for |1⟩.',
    'The 3D landscape shows the probability of each position (left↔right) at every time step (front→back). Drag to orbit.',
    'Compare the final distribution with a classical random walk (dashed blue): the quantum walker races outward with two horns.',
    'Raise decoherence to measure the walker a little each step — interference fades and the classical bell curve returns.',
  ],
};

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { steps: 50, coin: 'hadamard', start: 'symmetric', decoherence: 0, theta: 0.785, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div><button class="btn btn-course" data-run>${icon('play')} Launch walker</button><div class="card card-tight sticky small" data-explain></div></div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('wave')} Probability landscape</h3><div class="legend"><span><i style="background:linear-gradient(90deg,#5a0dc0,#f033bf,#40f0ff)"></i>quantum</span><span><i style="background:#4dabf7"></i>classical (final)</span></div></div>
        <div class="walk-stage" data-stage></div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
        <div class="card board neon-card"><div class="card-head"><h3>${icon('chart')} Final distribution</h3></div><div data-final></div></div>
        <div class="card board neon-card"><div class="card-head"><h3>${icon('trend')} Spread σ over time</h3></div><div data-std></div></div>
      </div>
      <div class="card"><div class="card-head"><h3>Result</h3></div><div class="metrics" data-metrics></div></div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  controls($('[data-ctl]'), [
    { type: 'slider', key: 'steps', label: 'Steps', min: 10, max: 80, step: 2 },
    { type: 'seg', key: 'coin', label: 'Coin gate', options: [['hadamard', 'Hadamard'], ['balanced', 'Balanced'], ['rotation', 'Rotation θ']] },
    { type: 'slider', key: 'theta', label: 'Coin angle θ', min: 0.1, max: 1.47, step: 0.01, fmt: (v) => `${(v * 180 / Math.PI).toFixed(0)}°`, show: (s) => s.coin === 'rotation' },
    { type: 'seg', key: 'start', label: 'Starting coin', options: [['symmetric', '(|0⟩+i|1⟩)/√2'], ['down', '|0⟩'], ['up', '|1⟩']] },
    { type: 'slider', key: 'decoherence', label: 'Decoherence per step', min: 0, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` },
  ], st, (k, v, live) => { if (!live) run(); }, { lock });

  let scene = null;
  try { const { WalkScene } = await import('../three/walk3d.js'); scene = new WalkScene($('[data-stage]')); }
  catch { $('[data-stage]').innerHTML = '<div class="empty small">3D view unavailable on this device.</div>'; }
  const finalPlot = new Plot($('[data-final]'), { height: 220 });
  const stdPlot = new Plot($('[data-std]'), { height: 220 });
  let res = null;

  function charts() {
    finalPlot.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#3b5bdb', stars: 20 });
      const xs = res.positions, T = res.steps;
      const max = Math.max(...res.final, ...res.classical);
      const sx = (x) => 16 + ((x + T) / (2 * T)) * (w - 32), sy = (p) => h - 22 - (p / max) * (h - 36);
      const even = (i) => (xs[i] + T) % 2 === 0;
      const q = xs.map((x, i) => [sx(x), sy(res.final[i])]).filter((_, i) => even(i));
      const c = xs.map((x, i) => [sx(x), sy(res.classical[i])]).filter((_, i) => even(i));
      glowLine(ctx, c, '#4dabf7', 2, 10);
      glowLine(ctx, q, '#f06595', 2.6, 18);
      label(ctx, `−${T}`, 16, h - 8, { size: 9, color: 'rgba(200,210,255,.6)' });
      label(ctx, `+${T}`, w - 16, h - 8, { align: 'right', size: 9, color: 'rgba(200,210,255,.6)' });
      label(ctx, '0', sx(0), h - 8, { align: 'center', size: 9, color: 'rgba(200,210,255,.6)' });
    });
    stdPlot.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#3b5bdb', stars: 20 });
      const n = res.std_quantum.length, max = Math.max(...res.std_quantum, ...res.std_classical);
      const sx = (i) => 30 + (i / (n - 1)) * (w - 44), sy = (v) => h - 22 - (v / max) * (h - 36);
      glowLine(ctx, res.std_classical.map((v, i) => [sx(i), sy(v)]), '#4dabf7', 2, 10);
      glowLine(ctx, res.std_quantum.map((v, i) => [sx(i), sy(v)]), '#f06595', 2.6, 18);
      label(ctx, 'quantum ∝ t', sx(n - 1) - 4, sy(res.std_quantum[n - 1]) - 10, { align: 'right', size: 10, color: '#faa2c1' });
      label(ctx, 'classical ∝ √t', sx(n - 1) - 4, sy(res.std_classical[n - 1]) + 12, { align: 'right', size: 10, color: '#a5d8ff' });
      label(ctx, 'time →', w - 12, h - 8, { align: 'right', size: 10, color: 'rgba(200,210,255,.6)' });
    });
  }

  async function run() {
    try { res = await api.lab('quantum/walk', { ...st }, store.user?.id); } catch (e) { toast(esc(e.message), 'error'); return; }
    scene?.setData(res, { animate: true });
    charts();
    $('[data-metrics]').innerHTML = metric('σ quantum', res.std_quantum[res.steps].toFixed(1)) + metric('σ classical', res.std_classical[res.steps].toFixed(1))
      + metric('Speed-up', `×${res.spread_ratio}`, res.spread_ratio > 1.5 ? 'good' : '') + metric('Peaks at', res.peak_positions.join(', ')) + metric('Total P', res.total_probability.toFixed(4));
    $('[data-explain]').innerHTML = res.decoherence > 0
      ? `With <b>${Math.round(res.decoherence * 100)}%</b> decoherence per step, the environment keeps “peeking” at the walker. Interference fades and the spread slides back toward the classical √t.`
      : 'Paths that reach the same position interfere. Most of the middle cancels out while the outer paths reinforce, so the walker spreads <b>linearly</b> in time — quadratically faster than a coin-flipping classical walker.';
    setLabContext('walk', 'Quantum walk', [`Discrete-time quantum walk, ${res.steps} steps, coin ${res.coin}, start ${res.start}, decoherence ${res.decoherence}`,
      `Final spread σ = ${res.std_quantum[res.steps]} vs classical ${res.std_classical[res.steps]} (ratio ${res.spread_ratio})`,
      `Highest probability at positions ${res.peak_positions.join(' and ')}; total probability ${res.total_probability}`]);
  }
  $('[data-run]').addEventListener('click', run);
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { scene?.dispose(); finalPlot.dispose(); stdPlot.dispose(); } };
}
