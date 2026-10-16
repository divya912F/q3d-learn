// Blockchain lab: 51% attack race — simulated secret chains racing the honest chain, plus Nakamoto's curve.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, label, loop, reducedMotion, TAU, glowLine } from './neon.js';

export const meta = {
  howto: [
    'Set the attacker’s share q of the total mining power and how many confirmations z the merchant waits for.',
    'Each glowing line is one simulated attack: it goes up when the attacker finds a block, down when honest miners do. Crossing the zero line means the double spend succeeds.',
    'Compare the simulated success rate with Nakamoto’s formula from the Bitcoin whitepaper.',
    'Push q above 50% and watch every race eventually succeed.',
  ],
};

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { q: 0.3, z: 6, races: 400, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div><button class="btn btn-course" data-run>${icon('play')} Run 400 races</button><div class="card card-tight sticky small" data-explain></div></div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('trend')} Attacker lead over time</h3><span class="faint tiny">a sample of successful and failed races</span><div class="legend"><span><i style="background:#ff3b5c"></i>attack succeeded</span><span><i style="background:#4dabf7"></i>attack failed</span></div></div><div data-race></div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
        <div class="card board neon-card"><div class="card-head"><h3>${icon('chart')} Success chance vs confirmations</h3></div><div data-curve></div></div>
        <div class="card"><div class="card-head"><h3>Result</h3></div><div class="metrics" data-metrics></div><p class="small muted" data-note style="margin:10px 0 0"></p></div>
      </div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  controls($('[data-ctl]'), [
    { type: 'slider', key: 'q', label: 'Attacker hash share q', min: 0.02, max: 0.6, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
    { type: 'slider', key: 'z', label: 'Confirmations z', min: 0, max: 30 },
  ], st, (k, v, live) => { if (!live) run(); }, { lock });

  const race = new Plot($('[data-race]'), { height: 320 });
  const curve = new Plot($('[data-curve]'), { height: 230 });
  let res = null, stop = null, t0 = 0, tNow = 0;

  function drawRace(t) {
    race.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#d49b00', stars: 60, t });
      if (!res) return;
      const paths = res.paths;
      const maxLen = Math.max(...paths.map((p) => p.path.length));
      const lo = Math.min(-res.z - 4, ...paths.flatMap((p) => p.path)), hi = Math.max(3, ...paths.flatMap((p) => p.path));
      const pad = 34;
      const sx = (i) => pad + (i / Math.max(1, maxLen - 1)) * (w - pad - 14);
      const sy = (v) => 14 + ((hi - v) / (hi - lo)) * (h - 40);
      // honest-chain zero line
      ctx.save(); glow(ctx, '#ffd43b', 14); ctx.strokeStyle = 'rgba(255,212,59,.75)'; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(pad, sy(0)); ctx.lineTo(w - 10, sy(0)); ctx.stroke(); ctx.restore();
      label(ctx, 'catch-up line (lead = 0)', w - 12, sy(0) - 10, { align: 'right', size: 10, color: '#ffe066' });
      label(ctx, `−${res.z}`, 8, sy(-res.z), { size: 10, color: 'rgba(200,210,255,.7)' });
      const prog = reducedMotion() ? maxLen : Math.min(maxLen, ((t - t0) / 1000) * 14);
      paths.forEach((p) => {
        const n = Math.min(p.path.length, Math.ceil(prog));
        const pts = p.path.slice(0, n).map((v, i) => [sx(i), sy(v)]);
        glowLine(ctx, pts, p.won ? '#ff3b5c' : 'rgba(77,171,247,.75)', p.won ? 2.6 : 1.4, p.won ? 18 : 8);
        if (n && n === p.path.length && p.won) {
          const [x, y] = pts[pts.length - 1];
          ctx.save(); glow(ctx, '#ff3b5c', 30); ctx.fillStyle = '#ffd8de'; ctx.beginPath(); ctx.arc(x, y, 4 + Math.sin(t / 120) * 1.5, 0, TAU); ctx.fill(); ctx.restore();
        }
      });
      label(ctx, 'blocks found →', w - 12, h - 10, { align: 'right', size: 10, color: 'rgba(200,210,255,.6)' });
    });
  }

  function drawCurve() {
    curve.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#d49b00', stars: 20 });
      const pts = res.curve.slice(0, 31);
      const pad = 34;
      const sx = (z) => pad + (z / 30) * (w - pad - 14);
      const sy = (p) => 12 + (1 - (Math.log10(Math.max(1e-6, p)) + 6) / 6) * (h - 36); // log scale 1e-6 … 1
      [[1, '100%'], [1e-2, '1%'], [1e-4, '0.01%'], [1e-6, '0.0001%']].forEach(([p, txt]) => { ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.moveTo(pad, sy(p)); ctx.lineTo(w - 10, sy(p)); ctx.stroke(); label(ctx, txt, 4, sy(p) - 7, { size: 9, color: 'rgba(200,210,255,.6)' }); });
      const y01 = sy(0.001);
      ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(105,219,124,.6)'; ctx.beginPath(); ctx.moveTo(pad, y01); ctx.lineTo(w - 10, y01); ctx.stroke(); ctx.restore();
      label(ctx, '0.1%', w - 12, y01 - 8, { align: 'right', size: 9, color: '#69db7c' });
      glowLine(ctx, pts.map((p) => [sx(p.z), sy(p.p)]), '#ffd43b', 2.4, 16);
      const cur = res.curve[Math.min(res.z, res.curve.length - 1)];
      ctx.save(); glow(ctx, '#fff', 22); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx(Math.min(30, res.z)), sy(cur.p), 5, 0, TAU); ctx.fill(); ctx.restore();
      label(ctx, 'z →', w - 12, h - 8, { align: 'right', size: 10, color: 'rgba(200,210,255,.6)' });
    });
  }

  async function run() {
    try {
      res = await api.lab('chain/attack', { q: st.q, z: st.z, races: st.races }, store.user?.id);
    } catch (e) { toast(esc(e.message), 'error'); return; }
    t0 = tNow;
    drawCurve();
    const pct = (p) => (p >= 0.01 ? `${(p * 100).toFixed(1)}%` : `${(p * 100).toFixed(3)}%`);
    $('[data-metrics]').innerHTML = metric('Formula', pct(res.probability)) + metric('Simulated', pct(res.simulated)) + metric('Races', res.races)
      + metric('z for < 0.1%', res.confirmations_for_0_1pct ?? '> 40', res.confirmations_for_0_1pct ? '' : 'bad');
    $('[data-note]').innerHTML = res.majority ? '⚠️ With 50% or more of the hash power the attacker <b>always</b> catches up eventually — no number of confirmations is safe.'
      : `An attacker with ${Math.round(res.q * 100)}% of the hash power has a ${pct(res.probability)} chance after ${res.z} confirmation${res.z === 1 ? '' : 's'}. Each extra block makes it exponentially less likely.`;
    $('[data-explain]').innerHTML = 'The attacker pays a merchant, then secretly mines a chain without that payment. If their chain ever becomes as long as the honest one, they publish it and the payment vanishes — a <b>double spend</b>.';
    setLabContext('attack', '51% attack race', [`Attacker share q = ${res.q}, merchant waits z = ${res.z} confirmations`,
      `Nakamoto formula success probability ${res.probability}; simulated ${res.simulated} over ${res.races} races`,
      `Confirmations needed for < 0.1%: ${res.confirmations_for_0_1pct ?? 'more than 40'}`, res.majority ? 'q ≥ 50%: majority attack always succeeds eventually' : '']);
  }
  $('[data-run]').addEventListener('click', run);
  stop = loop((t) => { tNow = t; drawRace(t); });
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { stop?.(); race.dispose(); curve.dispose(); } };
}
