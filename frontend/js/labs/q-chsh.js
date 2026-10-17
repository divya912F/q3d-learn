// Quantum lab: Bell test (CHSH game) — entangled pairs beat every classical strategy.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, glowDot, glowLine, label, loop, reducedMotion, TAU, rgba } from './neon.js';

export const meta = {
  howto: [
    'A source sends one half of an entangled pair to Alice and the other to Bob. Each randomly picks one of two measurement angles.',
    'The CHSH number S combines the four correlations. Any classical (local hidden-variable) explanation obeys |S| ≤ 2.',
    'With the optimal angles (0°, 90° for Alice; 45°, −45° for Bob) quantum mechanics reaches 2√2 ≈ 2.83.',
    'Lower the visibility (noise) to see when the violation disappears — real experiments must beat this.',
  ],
};

const PRESETS = { optimal: { a0: 0, a1: 90, b0: 45, b1: -45 }, aligned: { a0: 0, a1: 0, b0: 0, b1: 0 }, wide: { a0: 0, a1: 60, b0: 30, b1: -30 } };

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { a0: 0, a1: 90, b0: 45, b1: -45, visibility: 1, rounds: 2000, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <div class="row" style="flex-wrap:wrap;gap:6px">${Object.keys(PRESETS).map((k) => `<button class="btn btn-ghost btn-sm" data-p="${k}">${k}</button>`).join('')}</div>
      <button class="btn btn-course" data-run>${icon('play')} Run Bell test</button>
      <div class="card card-tight sticky small" data-explain></div></div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('entangle')} Alice ← entangled source → Bob</h3><div class="legend"><span><i style="background:#40f0ff"></i>outcome +1</span><span><i style="background:#f06595"></i>outcome −1</span></div></div><div data-stage></div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
        <div class="card board neon-card"><div class="card-head"><h3>${icon('zap')} CHSH meter</h3></div><div data-meter></div></div>
        <div class="card board neon-card"><div class="card-head"><h3>${icon('chart')} Correlation vs angle difference</h3></div><div data-curve></div></div>
      </div>
      <div class="card"><div class="card-head"><h3>Result</h3></div><div class="metrics" data-metrics></div></div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  const ang = (k, l) => ({ type: 'slider', key: k, label: l, min: -90, max: 180, step: 5, fmt: (v) => `${v}°` });
  const ctl = controls($('[data-ctl]'), [ang('a0', 'Alice angle a₀'), ang('a1', 'Alice angle a₁'), ang('b0', 'Bob angle b₀'), ang('b1', 'Bob angle b₁'),
    { type: 'slider', key: 'visibility', label: 'Entanglement quality (visibility)', min: 0, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` },
  ], st, (k, v, live) => { if (!live) run(); }, { lock });
  root.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => { Object.assign(st, PRESETS[b.dataset.p]); ctl.render(); run(); }));

  const stage = new Plot($('[data-stage]'), { height: 300 });
  const meter = new Plot($('[data-meter]'), { height: 220 });
  const curve = new Plot($('[data-curve]'), { height: 220 });
  let res = null, stop = null, t0 = 0, tNow = 0, needle = 0;

  function drawStage(t) {
    stage.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#5f3dc4', stars: 80, t });
      const cx = w / 2, cy = h / 2, ax = 70, bx = w - 70;
      // source
      const pulse = 1 + 0.15 * Math.sin(t / 200);
      ctx.save(); glow(ctx, '#da77f2', 40); ctx.fillStyle = '#f3d9fa'; ctx.beginPath(); ctx.arc(cx, cy, 10 * pulse, 0, TAU); ctx.fill(); ctx.restore();
      label(ctx, '|Φ⁺⟩ source', cx, cy + 30, { align: 'center', size: 11, color: '#e599f7' });
      if (!res) return;
      const period = 900, k = reducedMotion() ? 0 : Math.floor((t - t0) / period), f = reducedMotion() ? 1 : ((t - t0) % period) / period;
      const r = res.sample[k % res.sample.length];
      // photon pair in flight (a wavy entangled thread)
      const d = Math.min(1, f * 1.4);
      const pa = [cx - (cx - ax) * d, cy], pb = [cx + (bx - cx) * d, cy];
      const thread = [];
      for (let i = 0; i <= 40; i++) { const x = pa[0] + (pb[0] - pa[0]) * (i / 40); thread.push([x, cy + Math.sin(i / 3 + t / 90) * 6 * (1 - d * 0.6)]); }
      glowLine(ctx, thread, rgba('#da77f2', 0.6), 1.4, 12);
      glowDot(ctx, pa[0], pa[1], 5, '#fff', 20); glowDot(ctx, pb[0], pb[1], 5, '#fff', 20);
      // detectors with polariser dials
      const dial = (x, name, angles, sel, out) => {
        ctx.save(); ctx.translate(x, cy);
        glow(ctx, '#748ffc', 14); ctx.strokeStyle = 'rgba(145,167,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 42, 0, TAU); ctx.stroke();
        angles.forEach((a, i) => { const rad = (-a * Math.PI) / 180; ctx.strokeStyle = i === sel ? '#ffd43b' : 'rgba(255,255,255,.25)'; ctx.lineWidth = i === sel ? 3 : 1.5; ctx.beginPath(); ctx.moveTo(-Math.cos(rad) * 40, -Math.sin(rad) * 40); ctx.lineTo(Math.cos(rad) * 40, Math.sin(rad) * 40); ctx.stroke(); });
        if (d >= 1) { const c = out > 0 ? '#40f0ff' : '#f06595'; glow(ctx, c, 40); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill(); }
        ctx.restore();
        label(ctx, name, x, cy - 58, { align: 'center', size: 13, weight: 800, color: '#e7f5ff' });
        label(ctx, `setting ${sel} · ${angles[sel]}°`, x, cy + 58, { align: 'center', size: 10, color: '#ffe066' });
        if (d >= 1) label(ctx, out > 0 ? '+1' : '−1', x, cy + 74, { align: 'center', size: 12, weight: 800, color: out > 0 ? '#99e9f2' : '#fcc2d7' });
      };
      dial(ax, 'Alice', [st.a0, st.a1], r.x, r.a);
      dial(bx, 'Bob', [st.b0, st.b1], r.y, r.b);
      if (d >= 1) {
        const win = ((r.a < 0 ? 1 : 0) ^ (r.b < 0 ? 1 : 0)) === (r.x & r.y);
        label(ctx, win ? 'round won ✓' : 'round lost ✗', cx, 26, { align: 'center', size: 12, weight: 800, color: win ? '#8ce99a' : '#ffa8a8' });
      }
      label(ctx, `round ${k % res.sample.length + 1}`, 12, h - 12, { size: 10, color: 'rgba(200,210,255,.6)' });
    });
  }

  function drawMeter(t) {
    meter.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#5f3dc4', stars: 15 });
      if (!res) return;
      const cx = w / 2, cy = h - 30, R = Math.min(w / 2 - 30, h - 60);
      const ang = (s) => Math.PI + (Math.min(4, Math.max(0, s)) / 4) * Math.PI;
      const arc = (a, b, c) => { ctx.save(); glow(ctx, c, 14); ctx.strokeStyle = c; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(cx, cy, R, ang(a), ang(b)); ctx.stroke(); ctx.restore(); };
      arc(0, 2, 'rgba(116,143,252,.75)'); arc(2, 2.828, 'rgba(240,101,149,.9)'); arc(2.828, 4, 'rgba(255,255,255,.08)');
      [[0, '0'], [2, '2 classical limit'], [2.828, '2√2'], [4, '4']].forEach(([s, txt]) => { const a = ang(s); label(ctx, txt, cx + Math.cos(a) * (R + 18), cy + Math.sin(a) * (R + 18), { align: s < 2 ? 'right' : s > 2.9 ? 'left' : 'center', size: 10, color: '#dbe4ff' }); });
      const target = Math.abs(res.S_sampled);
      needle += (target - needle) * 0.08;
      const a = ang(needle);
      ctx.save(); glow(ctx, '#ffd43b', 20); ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (R - 6), cy + Math.sin(a) * (R - 6)); ctx.stroke(); ctx.restore();
      glowDot(ctx, cx, cy, 6, '#ffe066');
      label(ctx, `|S| = ${needle.toFixed(3)}`, cx, cy - R * 0.4, { align: 'center', size: 18, weight: 800, color: needle > 2 ? '#ffdeeb' : '#dbe4ff' });
    });
  }

  function drawCurve() {
    curve.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#5f3dc4', stars: 15 });
      if (!res) return;
      const sx = (d) => 30 + (d / 180) * (w - 44), sy = (v) => 14 + ((1 - v) / 2) * (h - 38);
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.moveTo(30, sy(0)); ctx.lineTo(w - 14, sy(0)); ctx.stroke();
      glowLine(ctx, res.curve.map((c) => [sx(c.delta), sy(c.local)]), '#748ffc', 2, 10);
      glowLine(ctx, res.curve.map((c) => [sx(c.delta), sy(c.quantum)]), '#f06595', 2.6, 16);
      label(ctx, 'quantum cos(Δ)', sx(100), sy(-0.1) - 16, { size: 10, color: '#fcc2d7' });
      label(ctx, 'best local model', sx(40), sy(0.6) + 20, { size: 10, color: '#bac8ff' });
      ['0°', '90°', '180°'].forEach((s, i) => label(ctx, s, sx(i * 90), h - 8, { align: 'center', size: 10, color: 'rgba(200,210,255,.6)' }));
    });
  }

  async function run() {
    try { res = await api.lab('quantum/chsh', { ...st }, store.user?.id); } catch (e) { toast(esc(e.message), 'error'); return; }
    t0 = tNow;
    drawCurve();
    $('[data-metrics]').innerHTML = metric('S measured', res.S_sampled, Math.abs(res.S_sampled) > 2 ? 'good' : 'bad') + metric('S quantum theory', res.S_quantum)
      + metric('S local model', res.S_local) + metric('CHSH game win rate', `${(res.win_rate * 100).toFixed(1)}%`) + metric('Classical best', '75%');
    $('[data-explain]').innerHTML = Math.abs(res.S_sampled) > 2
      ? `🎉 <b>|S| = ${Math.abs(res.S_sampled).toFixed(2)} &gt; 2</b>: no local hidden-variable theory can produce these correlations. This is the experiment behind the 2022 Nobel Prize in Physics.`
      : `|S| = ${Math.abs(res.S_sampled).toFixed(2)} ≤ 2 — these results <i>could</i> be explained classically. Try the <b>optimal</b> preset or raise the visibility.`;
    setLabContext('chsh', 'Bell / CHSH test', [`Angles a0=${st.a0}°, a1=${st.a1}°, b0=${st.b0}°, b1=${st.b1}°, visibility ${res.visibility}`,
      `S sampled ${res.S_sampled} (theory ${res.S_quantum}); local model gives ${res.S_local}; classical bound 2, Tsirelson bound ${res.tsirelson}`,
      `CHSH game win rate ${res.win_rate} (classical max 0.75)`]);
  }
  $('[data-run]').addEventListener('click', run);
  stop = loop((t) => { tNow = t; drawStage(t); drawMeter(t); });
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { stop?.(); stage.dispose(); meter.dispose(); curve.dispose(); } };
}
