// Quantum lab: Mach–Zehnder interferometer — one photon, two paths, and interference you can switch off.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, glowDot, glowLine, label, loop, reducedMotion, TAU, rgba } from './neon.js';

export const meta = {
  howto: [
    'A single photon hits the first beam splitter and takes BOTH paths at once (a superposition).',
    'Turn the phase shifter on the upper arm: the two paths meet at the second splitter and interfere — the detector counts swing between 0% and 100%.',
    'Switch on the which-path detector: the moment you can know the path, interference disappears and both detectors get 50%.',
    'Change the second splitter’s reflectivity to see partial (washed-out) fringes.',
  ],
};

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { phaseDeg: 0, reflectivity: 0.5, which_path: false, photons: 200, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <button class="btn btn-course" data-run>${icon('zap')} Fire ${st.photons} photons</button>
      <div class="card card-tight sticky small" data-explain></div></div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('sparkle')} Optical table</h3><div class="legend"><span><i style="background:#40f0ff"></i>probability amplitude</span><span><i style="background:#ffd43b"></i>detector click</span></div></div><div data-table></div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
        <div class="card board neon-card"><div class="card-head"><h3>${icon('wave')} Interference fringe</h3><span class="faint tiny">P(detector) vs phase</span></div><div data-fringe></div></div>
        <div class="card"><div class="card-head"><h3>Detector counts</h3></div><div class="metrics" data-metrics></div></div>
      </div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  controls($('[data-ctl]'), [
    { type: 'slider', key: 'phaseDeg', label: 'Phase shift φ (upper arm)', min: 0, max: 360, step: 5, fmt: (v) => `${v}°` },
    { type: 'slider', key: 'reflectivity', label: 'Splitter 2 reflectivity', min: 0.05, max: 0.95, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` },
    { type: 'toggle', key: 'which_path', label: 'Which-path detector on the upper arm 👁️' },
    { type: 'seg', key: 'photons', label: 'Photons per run', numeric: true, options: [[50, '50'], [200, '200'], [1000, '1000']] },
  ], st, (k, v, live) => { if (live) { liveProbs(); return; } run(); }, { lock });

  const table = new Plot($('[data-table]'), { height: 360 });
  const fringe = new Plot($('[data-fringe]'), { height: 220 });
  let res = null, t0 = 0, tNow = 0, probs = [0, 1], stop = null;

  function liveProbs() {
    if (!res) return;
    const c = res.curve, f = (st.phaseDeg / 360) * (c.length - 1), i = Math.min(c.length - 2, Math.floor(f)), k = f - i;
    probs = [c[i].d1 + (c[i + 1].d1 - c[i].d1) * k, c[i].d2 + (c[i + 1].d2 - c[i].d2) * k];
    drawFringe();
  }

  function drawTable(t) {
    table.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#3b5bdb', stars: 70, t });
      const L = Math.min(w * 0.14, 90), x0 = L + 40, x1 = w - L - 70, y0 = 70, y1 = h - 70;
      const wp = st.which_path;
      // beams: laser→BS1, upper arm BS1→M1→BS2, lower arm BS1→M2→BS2, outputs
      const beam = (pts, a, phaseOff = 0) => {
        if (a < 0.01) return;
        const col = rgba('#40f0ff', 0.25 + 0.75 * a);
        glowLine(ctx, pts, col, 1.5 + 4 * a, 18 * a);
        // travelling wave crests along the beam
        if (reducedMotion()) return;
        for (let s = 0; s < pts.length - 1; s++) {
          const [ax, ay] = pts[s], [bx, by] = pts[s + 1], len = Math.hypot(bx - ax, by - ay);
          for (let d = ((t / 6 + phaseOff * 20) % 24); d < len; d += 24) {
            const x = ax + (bx - ax) * d / len, y = ay + (by - ay) * d / len;
            ctx.fillStyle = `rgba(220,255,255,${0.5 * a})`; ctx.fillRect(x - 1, y - 1, 2.4, 2.4);
          }
        }
      };
      beam([[12, y1], [x0, y1]], 1);
      beam([[x0, y1], [x0, y0], [x1, y0]], 0.5, st.phaseDeg / 360);
      beam([[x0, y1], [x1, y1], [x1, y0]], 0.5);
      beam([[x1, y0], [w - 30, y0]], probs[0]);
      beam([[x1, y0], [x1, 20]], probs[1]);
      // optics
      const splitter = (x, y, txt) => { ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 4); glow(ctx, '#b197fc', 16); ctx.fillStyle = 'rgba(177,151,252,.35)'; ctx.strokeStyle = '#d0bfff'; ctx.lineWidth = 2; ctx.fillRect(-20, -4, 40, 8); ctx.strokeRect(-20, -4, 40, 8); ctx.restore(); label(ctx, txt, x + 14, y + 22, { size: 10, color: '#d0bfff' }); };
      const mirror = (x, y) => { ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 4); glow(ctx, '#e9ecef', 12); ctx.fillStyle = '#dee2e6'; ctx.fillRect(-18, -3, 36, 6); ctx.restore(); };
      splitter(x0, y1, 'BS1 50/50'); splitter(x1, y0, `BS2 ${Math.round(st.reflectivity * 100)}%`);
      mirror(x0, y0); mirror(x1, y1);
      // laser
      ctx.save(); glow(ctx, '#ff6b6b', 20); ctx.fillStyle = '#2b0a12'; ctx.strokeStyle = '#ff8787'; ctx.lineWidth = 2; ctx.fillRect(4, y1 - 14, 26, 28); ctx.strokeRect(4, y1 - 14, 26, 28); ctx.restore();
      label(ctx, 'single-photon source', 6, y1 + 26, { size: 10, color: '#ffa8a8' });
      // phase shifter (rotating glass)
      const px = (x0 + x1) / 2;
      ctx.save(); ctx.translate(px, y0); ctx.rotate((st.phaseDeg * Math.PI) / 180); glow(ctx, '#f06595', 18); ctx.strokeStyle = '#faa2c1'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU * 0.85); ctx.stroke(); ctx.restore();
      label(ctx, `φ = ${st.phaseDeg}°`, px, y0 - 28, { align: 'center', size: 12, weight: 800, color: '#faa2c1' });
      if (wp) { glowDot(ctx, px - 60, y0 - 20, 7, '#ffd43b', 24); label(ctx, '👁 which-path', px - 60, y0 - 38, { align: 'center', size: 10, color: '#ffe066' }); }
      // detectors
      const det = (x, y, name, p, flash) => {
        ctx.save(); glow(ctx, flash ? '#ffd43b' : '#40f0ff', flash ? 40 : 10 + 20 * p); ctx.fillStyle = flash ? '#fff3bf' : rgba('#40f0ff', 0.15 + 0.6 * p); ctx.beginPath(); ctx.arc(x, y, 16, 0, TAU); ctx.fill(); ctx.restore();
        label(ctx, `${name}  ${(p * 100).toFixed(0)}%`, x, y + 30, { align: 'center', size: 11, weight: 800, color: '#e7f5ff' });
      };
      // which detector just clicked (cycle through sampled outcomes)
      let flash = 0;
      if (res && !reducedMotion()) { const idx = Math.floor((t - t0) / 160); if (idx >= 0 && idx < res.outcomes.length) flash = res.outcomes[idx]; }
      det(w - 30, y0, 'D1', probs[0], flash === 1);
      det(x1, 20, 'D2', probs[1], flash === 2);
      if (res) {
        const shown = Math.min(res.outcomes.length, Math.max(0, Math.floor((t - t0) / 160) + 1));
        const c1 = res.outcomes.slice(0, shown).filter((o) => o === 1).length;
        label(ctx, `photons: ${shown}/${res.photons} · D1 ${c1} · D2 ${shown - c1}`, 12, 16, { size: 11, color: 'rgba(220,230,255,.8)' });
      }
    });
  }

  function drawFringe() {
    fringe.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#3b5bdb', stars: 15 });
      if (!res) return;
      const sx = (p) => 30 + (p / TAU) * (w - 44), sy = (v) => h - 22 - v * (h - 40);
      glowLine(ctx, res.curve.map((c) => [sx(c.phase), sy(c.d1)]), '#40f0ff', 2.4, 14);
      glowLine(ctx, res.curve.map((c) => [sx(c.phase), sy(c.d2)]), '#f06595', 2.4, 14);
      const x = sx((st.phaseDeg / 180) * Math.PI);
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, h - 20); ctx.stroke(); ctx.setLineDash([]);
      glowDot(ctx, x, sy(probs[0]), 4.5, '#c5f6fa'); glowDot(ctx, x, sy(probs[1]), 4.5, '#ffdeeb');
      label(ctx, 'D1', w - 14, sy(res.curve[res.curve.length - 1].d1) - 8, { align: 'right', size: 10, color: '#99e9f2' });
      label(ctx, 'D2', w - 14, sy(res.curve[res.curve.length - 1].d2) + 10, { align: 'right', size: 10, color: '#fcc2d7' });
      ['0', 'π', '2π'].forEach((s, i) => label(ctx, s, sx(i * Math.PI), h - 8, { align: 'center', size: 10, color: 'rgba(200,210,255,.6)' }));
    });
  }

  async function run() {
    try {
      res = await api.lab('quantum/interference', { phase: (st.phaseDeg * Math.PI) / 180, reflectivity: st.reflectivity, which_path: st.which_path, photons: st.photons }, store.user?.id);
    } catch (e) { toast(esc(e.message), 'error'); return; }
    probs = [res.p_d1, res.p_d2];
    t0 = tNow;
    $('[data-run]').innerHTML = `${icon('zap')} Fire ${st.photons} photons`;
    drawFringe();
    $('[data-metrics]').innerHTML = metric('P(D1)', `${(res.p_d1 * 100).toFixed(1)}%`) + metric('P(D2)', `${(res.p_d2 * 100).toFixed(1)}%`)
      + metric('Counted D1', res.counts.d1) + metric('Counted D2', res.counts.d2) + metric('Fringe visibility', res.visibility.toFixed(2), res.visibility > 0.9 ? 'good' : res.visibility < 0.1 ? 'bad' : '');
    $('[data-explain]').innerHTML = res.which_path
      ? '👁️ The detector records which arm the photon used. With that information in the world, the two paths can no longer interfere — each detector fires half the time, whatever the phase.'
      : `The photon’s amplitude splits into both arms. At the second splitter the two amplitudes add with relative phase φ: <b>constructive</b> at one detector, <b>destructive</b> at the other. With φ = ${st.phaseDeg}°, D1 fires ${(res.p_d1 * 100).toFixed(0)}% of the time.`;
    setLabContext('interference', 'Mach–Zehnder interferometer', [`Phase φ = ${st.phaseDeg}°, splitter 2 reflectivity ${res.reflectivity}, which-path detector ${res.which_path ? 'ON' : 'off'}`,
      `P(D1) = ${res.p_d1}, P(D2) = ${res.p_d2}; counts D1 ${res.counts.d1}, D2 ${res.counts.d2} of ${res.photons}`, `Fringe visibility ${res.visibility}`]);
  }
  $('[data-run]').addEventListener('click', run);
  stop = loop((t) => { tNow = t; drawTable(t); });
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { stop?.(); table.dispose(); fringe.dispose(); } };
}
