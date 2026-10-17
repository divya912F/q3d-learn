// DS lab: A/B test studio — z-test, permutation null distribution, confidence interval, power and the peeking trap.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, glowDot, glowLine, label, loop, reducedMotion, rgba, TAU } from './neon.js';

export const meta = {
  howto: [
    'Version A (current page) converts at rate A. Version B has a true uplift you choose — in real life you never know it.',
    'Run the experiment: visitors stream into both versions. The test asks: is the observed difference bigger than chance alone would produce?',
    'The glowing histogram is the null distribution (labels shuffled). The shaded tails beyond the observed difference are the p-value.',
    'Turn on “peeking”: checking the p-value after every batch and stopping at the first p < α inflates false positives — see the A/A study.',
  ],
};

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { rate_a: 0.1, uplift: 0.02, n: 2000, alpha: 0.05, peeking: false, seed: 11, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <div class="row"><button class="btn btn-course grow" data-run>${icon('play')} Run experiment</button><button class="icon-btn" data-dice title="New random visitors">${icon('dice')}</button></div>
      <div class="card card-tight sticky small" data-explain></div></div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('users')} Visitors → conversions</h3><span class="chip" data-verdict></span></div><div data-stream></div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
        <div class="card board neon-card"><div class="card-head"><h3>${icon('chart')} Permutation null distribution</h3></div><div data-null></div></div>
        <div class="card board neon-card"><div class="card-head"><h3>${icon('trend')} p-value as data arrives</h3></div><div data-path></div></div>
      </div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
        <div class="card"><div class="card-head"><h3>Result</h3></div><div class="metrics" data-metrics></div></div>
        <div class="card board neon-card"><div class="card-head"><h3>${icon('alert')} 300 A/A tests (no real difference)</h3></div><div data-aa></div></div>
      </div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  controls($('[data-ctl]'), [
    { type: 'slider', key: 'rate_a', label: 'Conversion rate of A', min: 0.01, max: 0.5, step: 0.01, fmt: (v) => `${(v * 100).toFixed(0)}%` },
    { type: 'slider', key: 'uplift', label: 'True uplift of B (unknown in real life)', min: -0.05, max: 0.08, step: 0.005, fmt: (v) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)} pts` },
    { type: 'slider', key: 'n', label: 'Visitors per version', min: 100, max: 30000, log: true, fmt: (v) => Math.round(v).toLocaleString() },
    { type: 'seg', key: 'alpha', label: 'Significance level α', numeric: true, options: [[0.1, '0.10'], [0.05, '0.05'], [0.01, '0.01']] },
    { type: 'toggle', key: 'peeking', label: 'I peek and stop early 👀' },
  ], st, (k, v, live) => { if (!live) run(); }, { lock });

  const stream = new Plot($('[data-stream]'), { height: 240 });
  const nul = new Plot($('[data-null]'), { height: 220 });
  const path = new Plot($('[data-path]'), { height: 220 });
  const aa = new Plot($('[data-aa]'), { height: 180 });
  let res = null, stop = null, t0 = 0, tNow = 0;
  const parts = Array.from({ length: 140 }, (_, i) => ({ lane: i % 2, off: Math.random(), y: Math.random() }));

  function drawStream(t) {
    stream.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#2f9e44', stars: 40, t });
      if (!res) return;
      const lanes = [{ name: 'A · current', rate: res.observed.a, conv: res.conversions.a, c: '#40f0ff' }, { name: 'B · new design', rate: res.observed.b, conv: res.conversions.b, c: '#f06595' }];
      const gx = w - 150;
      lanes.forEach((L, i) => {
        const yc = h * (0.3 + 0.42 * i);
        label(ctx, L.name, 14, yc - 34, { size: 12, weight: 800, color: L.c });
        // particle stream: visitors fly to the goal; converters glow
        parts.filter((p) => p.lane === i).forEach((p, k) => {
          const f = reducedMotion() ? p.off : ((t / 2600) + p.off) % 1;
          const x = 14 + f * (gx - 30), y = yc + (p.y - 0.5) * 34;
          const converts = (k * 0.6180339) % 1 < L.rate;
          if (converts && f > 0.8) { glowDot(ctx, x, y, 2.6, '#ffe066', 14); } else { ctx.fillStyle = rgba(L.c, 0.5); ctx.fillRect(x, y, 2, 2); }
        });
        // goal ring with the observed rate
        const r = 28, frac = Math.min(1, L.rate / Math.max(res.observed.a, res.observed.b, 0.01));
        ctx.save(); glow(ctx, L.c, 18); ctx.strokeStyle = rgba(L.c, 0.25); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(gx + 60, yc, r, 0, TAU); ctx.stroke();
        ctx.strokeStyle = L.c; ctx.beginPath(); ctx.arc(gx + 60, yc, r, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.stroke(); ctx.restore();
        label(ctx, `${(L.rate * 100).toFixed(2)}%`, gx + 60, yc, { align: 'center', size: 13, weight: 800, color: '#fff' });
        label(ctx, `${L.conv.toLocaleString()} / ${res.n.toLocaleString()}`, gx + 60, yc + r + 14, { align: 'center', size: 10, color: 'rgba(220,230,255,.7)' });
      });
    });
  }

  function drawNull() {
    nul.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#2f9e44', stars: 10 });
      const P = res.permutation, H = P.hist, E = P.edges, max = Math.max(...H, 1), obs = res.observed.diff;
      const lo = Math.min(E[0], -Math.abs(obs) * 1.15), hi = Math.max(E[E.length - 1], Math.abs(obs) * 1.15);
      const sx = (v) => 16 + ((v - lo) / (hi - lo)) * (w - 32);
      H.forEach((c, i) => {
        const x0 = sx(E[i]), x1 = sx(E[i + 1]), mid = (E[i] + E[i + 1]) / 2, tail = Math.abs(mid) >= Math.abs(obs);
        ctx.fillStyle = tail ? 'rgba(255,107,107,.85)' : 'rgba(105,219,124,.55)';
        ctx.fillRect(x0, h - 26 - (c / max) * (h - 50), Math.max(1, x1 - x0 - 1), (c / max) * (h - 50));
      });
      [obs, -obs].forEach((v, i) => { const x = sx(v); ctx.save(); glow(ctx, '#ffd43b', 16); ctx.strokeStyle = i ? 'rgba(255,224,102,.4)' : '#ffe066'; ctx.lineWidth = 2; ctx.setLineDash(i ? [4, 4] : []); ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, h - 22); ctx.stroke(); ctx.restore(); });
      label(ctx, `observed ${(obs * 100).toFixed(2)} pts`, sx(obs) + (obs >= 0 ? 6 : -6), 16, { align: obs >= 0 ? 'left' : 'right', size: 11, weight: 800, color: '#ffe066' });
      label(ctx, `p ≈ ${P.p_value}`, w - 12, h - 10, { align: 'right', size: 11, color: '#ffa8a8' });
      label(ctx, 'difference if A and B were identical', 14, h - 10, { size: 10, color: 'rgba(220,230,255,.6)' });
    });
  }

  function drawPath() {
    path.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#2f9e44', stars: 10 });
      const sy = (p) => 12 + (Math.log10(Math.max(1e-4, p)) / -4) * (h - 38); // log scale: 1 at top, 0.0001 at bottom
      const sx = (i) => 30 + (i / (res.p_path.length - 1)) * (w - 44);
      const ya = sy(res.alpha);
      ctx.fillStyle = 'rgba(255,107,107,.08)'; ctx.fillRect(30, ya, w - 44, h - 26 - ya);
      ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#ff8787'; ctx.beginPath(); ctx.moveTo(30, ya); ctx.lineTo(w - 14, ya); ctx.stroke(); ctx.restore();
      label(ctx, `α = ${res.alpha}`, w - 14, ya - 8, { align: 'right', size: 10, color: '#ffa8a8' });
      glowLine(ctx, res.p_path.map((p, i) => [sx(i), sy(p.p)]), '#63e6be', 2.4, 14);
      if (st.peeking) {
        const first = res.p_path.findIndex((p) => p.p < res.alpha);
        if (first >= 0) { glowDot(ctx, sx(first), sy(res.p_path[first].p), 6, '#ffe066', 26); label(ctx, `peeker stops here (n=${res.p_path[first].n})`, sx(first) + 8, sy(res.p_path[first].p) + 14, { size: 10, color: '#ffe066' }); }
      }
      label(ctx, '1', 8, sy(1), { size: 9, color: 'rgba(220,230,255,.6)' }); label(ctx, '0.001', 2, sy(0.001), { size: 9, color: 'rgba(220,230,255,.6)' });
      label(ctx, 'visitors →', w - 14, h - 8, { align: 'right', size: 10, color: 'rgba(220,230,255,.6)' });
    });
  }

  function drawAA() {
    aa.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#2f9e44', stars: 10, grid: false });
      const bars = [['Fixed sample (honest)', res.aa.false_positive_fixed, '#69db7c'], [`Peeking ${res.aa.looks}× and stopping early`, res.aa.false_positive_peeking, '#ff6b6b']];
      bars.forEach(([name, v, c], i) => {
        const y = 30 + i * 60, bw = (w - 180) * Math.min(1, v / 0.4);
        label(ctx, name, 14, y - 10, { size: 11, color: '#e9ecef' });
        ctx.save(); glow(ctx, c, 16); ctx.fillStyle = c; ctx.fillRect(14, y, bw, 18); ctx.restore();
        label(ctx, `${(v * 100).toFixed(1)}% false positives`, 22 + bw, y + 9, { size: 11, weight: 800, color: '#fff' });
      });
      const ax = 14 + (w - 180) * (res.alpha / 0.4);
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(ax, 14); ctx.lineTo(ax, h - 12); ctx.stroke(); ctx.restore();
      label(ctx, `promised α = ${(res.alpha * 100).toFixed(0)}%`, ax + 4, h - 10, { size: 10, color: 'rgba(255,255,255,.7)' });
    });
  }

  async function run() {
    try { res = await api.lab('ds/abtest', { ...st, n: Math.round(st.n) }, store.user?.id); } catch (e) { toast(esc(e.message), 'error'); return; }
    t0 = tNow;
    drawNull(); drawPath(); drawAA();
    const v = $('[data-verdict]');
    v.textContent = res.significant ? `significant · p = ${res.p_value}` : `not significant · p = ${res.p_value}`;
    v.className = `chip ${res.significant ? 'green' : 'gray'}`;
    const pp = (x) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(2)}`;
    $('[data-metrics]').innerHTML = metric('Observed lift', `${res.observed.lift_pct ?? '—'}%`) + metric('z', res.z) + metric('p-value', res.p_value, res.significant ? 'good' : '')
      + metric(`${Math.round((1 - res.alpha) * 100)}% CI (pts)`, `${pp(res.ci[0])} … ${pp(res.ci[1])}`) + metric('Power', `${Math.round(res.power * 100)}%`, res.power >= 0.8 ? 'good' : 'bad')
      + metric('n for 80% power', res.n_for_80_power ? res.n_for_80_power.toLocaleString() : '—');
    $('[data-explain]').innerHTML = (res.significant
      ? `B’s conversion differs from A’s by more than chance would usually produce (p = ${res.p_value} &lt; α).`
      : `The difference could easily be noise (p = ${res.p_value} ≥ α). That is <i>not</i> proof that A and B are equal.`)
      + (res.power < 0.8 ? ` ⚠️ Power is only ${Math.round(res.power * 100)}% — this test would miss the real effect most of the time. You need about <b>${res.n_for_80_power?.toLocaleString()}</b> visitors per version.` : '')
      + `<br><br>The confidence interval for the difference is ${pp(res.ci[0])} to ${pp(res.ci[1])} percentage points${res.ci[0] <= 0 && res.ci[1] >= 0 ? ' — it includes zero.' : '.'}`;
    setLabContext('abtest', 'A/B test studio', [`A ${res.conversions.a}/${res.n} (${res.observed.a}), B ${res.conversions.b}/${res.n} (${res.observed.b}); true rates ${res.rate_a} vs ${res.rate_b_true}`,
      `z = ${res.z}, p = ${res.p_value}, permutation p = ${res.permutation.p_value}, CI ${res.ci.join(' to ')}, power ${res.power}, n for 80% power ${res.n_for_80_power}`,
      `A/A false-positive rate: fixed ${res.aa.false_positive_fixed}, with peeking ${res.aa.false_positive_peeking}`]);
  }
  $('[data-run]').addEventListener('click', run);
  $('[data-dice]').addEventListener('click', () => { st.seed = Math.floor(Math.random() * 1e5); run(); });
  stop = loop((t) => { tNow = t; drawStream(t); });
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { stop?.(); stream.dispose(); nul.dispose(); path.dispose(); aa.dispose(); } };
}
