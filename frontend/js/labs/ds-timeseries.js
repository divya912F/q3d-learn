// DS lab: Time-series studio — decomposition into trend + season + noise, a seasonal "clock", and forecasts with a cone.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, glowDot, glowLine, label, loop, reducedMotion, rgba, TAU } from './neon.js';

export const meta = {
  howto: [
    'Pick a series. The cyan line is history; the amber line is a moving average that smooths out noise.',
    'The decomposition splits the series into trend (long-term direction), seasonality (repeating cycle) and residual (what is left).',
    'The glowing clock shows one seasonal cycle wrapped around a circle — e.g. which weekday sells most.',
    'Choose a forecasting method and compare its error (MAE) on the hidden future against the others.',
  ],
};
const METHODS = [['naive', 'Naive (last value)'], ['seasonal_naive', 'Seasonal naive'], ['moving_average', 'Moving average'], ['holt_winters', 'Holt–Winters']];

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { series: 'shop', noise: 0.3, window: 7, method: 'holt_winters', horizon: 21, alpha: 0.4, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div><div class="card card-tight sticky small" data-explain></div></div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('trend')} History & forecast</h3><div class="legend"><span><i style="background:#40f0ff"></i>history</span><span><i style="background:#ffd43b"></i>moving average</span><span><i style="background:#f06595"></i>forecast</span><span><i style="background:#fff"></i>what really happened</span></div></div><div data-main></div></div>
      <div class="grid" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)" data-two>
        <div class="card board neon-card"><div class="card-head"><h3>${icon('layers')} Decomposition</h3></div><div data-dec></div></div>
        <div class="card board neon-card"><div class="card-head"><h3>${icon('clock')} Seasonal clock</h3></div><div data-clock></div></div>
      </div>
      <div class="card"><div class="card-head"><h3>Forecast error on the hidden future (MAE)</h3></div><div class="metrics" data-metrics></div></div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  controls($('[data-ctl]'), [
    { type: 'select', key: 'series', label: 'Series', options: [['shop', 'Online shop · daily orders'], ['temperature', 'City temperature · monthly'], ['traffic', 'Website traffic · hourly']] },
    { type: 'select', key: 'method', label: 'Forecast method', options: METHODS },
    { type: 'slider', key: 'window', label: 'Moving-average window', min: 2, max: 30 },
    { type: 'slider', key: 'horizon', label: 'Forecast horizon', min: 4, max: 48 },
    { type: 'slider', key: 'noise', label: 'Noise', min: 0, max: 1.5, step: 0.1 },
    { type: 'slider', key: 'alpha', label: 'Holt–Winters smoothing α', min: 0.05, max: 0.95, step: 0.05, show: (s) => s.method === 'holt_winters' },
  ], st, (k, v, live) => { if (!live) run(); }, { lock });

  const main = new Plot($('[data-main]'), { height: 320 });
  const dec = new Plot($('[data-dec]'), { height: 260 });
  const clock = new Plot($('[data-clock]'), { height: 260 });
  if (innerWidth < 900) $('[data-two]').style.gridTemplateColumns = '1fr';
  let res = null, stop = null, t0 = 0, tNow = 0;

  const extent = (arrs) => { const v = arrs.flat().filter((x) => x != null); return [Math.min(...v), Math.max(...v)]; };

  function drawMain(t) {
    main.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#2f9e44', stars: 40, t });
      if (!res) return;
      const N = res.length + res.horizon, [lo0, hi0] = extent([res.y, res.actual_future, res.forecast.map((f, i) => f + res.band[i]), res.forecast.map((f, i) => f - res.band[i])]);
      const pad = (hi0 - lo0) * 0.06, lo = lo0 - pad, hi = hi0 + pad;
      const sx = (i) => 40 + (i / (N - 1)) * (w - 54), sy = (v) => 12 + (1 - (v - lo) / (hi - lo)) * (h - 40);
      const reveal = reducedMotion() ? 1 : Math.min(1, (t - t0) / 1400);
      // forecast cone
      ctx.beginPath();
      res.forecast.forEach((f, i) => { const x = sx(res.length + i), y = sy(f + res.band[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      for (let i = res.forecast.length - 1; i >= 0; i--) ctx.lineTo(sx(res.length + i), sy(res.forecast[i] - res.band[i]));
      ctx.closePath(); ctx.fillStyle = 'rgba(240,101,149,.14)'; ctx.fill();
      ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.moveTo(sx(res.length - 0.5), 8); ctx.lineTo(sx(res.length - 0.5), h - 26); ctx.stroke(); ctx.restore();
      label(ctx, 'now', sx(res.length - 0.5) + 4, 14, { size: 10, color: 'rgba(255,255,255,.6)' });
      const cut = Math.floor(res.length * reveal);
      glowLine(ctx, res.y.slice(0, cut).map((v, i) => [sx(i), sy(v)]), '#40f0ff', 1.6, 10);
      glowLine(ctx, res.moving_average.slice(0, cut).map((v, i) => [sx(i), sy(v)]).filter((p, i) => res.moving_average[i] != null), '#ffd43b', 2.2, 12);
      if (reveal >= 1) {
        ctx.save(); ctx.setLineDash([2, 3]); glowLine(ctx, res.actual_future.map((v, i) => [sx(res.length + i), sy(v)]), 'rgba(255,255,255,.75)', 1.4, 6); ctx.restore();
        glowLine(ctx, [[sx(res.length - 1), sy(res.y[res.length - 1])], ...res.forecast.map((v, i) => [sx(res.length + i), sy(v)])], '#f06595', 2.6, 18);
      }
      res.anomalies.forEach((i) => { if (i < cut) { glowDot(ctx, sx(i), sy(res.y[i]), 4 + 1.5 * Math.sin(t / 150), '#ff6b6b', 24); } });
      if (res.anomalies.length && reveal >= 1) label(ctx, `${res.anomalies.length} anomalies flagged (|residual| > 3σ)`, 44, h - 10, { size: 10, color: '#ffa8a8' });
      label(ctx, `${res.unit}s →`, w - 12, h - 10, { align: 'right', size: 10, color: 'rgba(220,230,255,.6)' });
    });
  }

  function drawDec() {
    dec.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#2f9e44', stars: 10 });
      const rows = [['trend', res.trend, '#ffd43b'], ['seasonal', res.seasonal, '#63e6be'], ['residual', res.residual, '#b197fc']];
      const rh = (h - 20) / 3;
      rows.forEach(([name, arr, c], r) => {
        const [lo, hi] = extent([arr]), y0 = 8 + r * rh;
        const sx = (i) => 70 + (i / (arr.length - 1)) * (w - 82), sy = (v) => y0 + 6 + (1 - (v - lo) / (hi - lo || 1)) * (rh - 16);
        label(ctx, name, 10, y0 + rh / 2, { size: 11, weight: 800, color: c });
        const segs = []; let cur = [];
        arr.forEach((v, i) => { if (v == null) { if (cur.length) segs.push(cur); cur = []; } else cur.push([sx(i), sy(v)]); });
        if (cur.length) segs.push(cur);
        segs.forEach((s) => glowLine(ctx, s, c, 1.6, 10));
        ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.moveTo(70, y0 + rh); ctx.lineTo(w - 10, y0 + rh); ctx.stroke();
      });
    });
  }

  function drawClock(t) {
    clock.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#2f9e44', stars: 30, t, grid: false });
      if (!res) return;
      const S = res.seasonal_pattern, P = S.length, cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 30;
      const lo = Math.min(...S), hi = Math.max(...S), rad = (v) => R * (0.35 + 0.65 * (v - lo) / (hi - lo || 1));
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; [0.35, 0.68, 1].forEach((f) => { ctx.beginPath(); ctx.arc(cx, cy, R * f, 0, TAU); ctx.stroke(); });
      const spin = reducedMotion() ? 0 : t / 6000;
      const pts = S.map((v, i) => { const a = -Math.PI / 2 + (i / P) * TAU; return [cx + Math.cos(a) * rad(v), cy + Math.sin(a) * rad(v)]; });
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      ctx.save(); glow(ctx, '#63e6be', 24); ctx.fillStyle = 'rgba(99,230,190,.18)'; ctx.fill(); ctx.strokeStyle = '#63e6be'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      const names = { 7: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], 12: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] }[P];
      S.forEach((v, i) => {
        if (P > 12 && i % 3) return;
        const a = -Math.PI / 2 + (i / P) * TAU;
        label(ctx, names ? names[i] : `${i}h`, cx + Math.cos(a) * (R + 14), cy + Math.sin(a) * (R + 14), { align: 'center', size: 9, color: 'rgba(220,230,255,.7)' });
      });
      const hand = (spin % 1) * TAU - Math.PI / 2;
      ctx.save(); glow(ctx, '#ffe066', 14); ctx.strokeStyle = 'rgba(255,224,102,.7)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(hand) * R, cy + Math.sin(hand) * R); ctx.stroke(); ctx.restore();
      const peak = S.indexOf(hi);
      label(ctx, `peak: ${names ? names[peak] : `${peak}:00`}`, cx, cy, { align: 'center', size: 12, weight: 800, color: '#fff' });
    });
  }

  async function run() {
    try { res = await api.lab('ds/timeseries', { ...st }, store.user?.id); } catch (e) { toast(esc(e.message), 'error'); return; }
    t0 = tNow;
    drawDec();
    const label2 = Object.fromEntries(METHODS);
    $('[data-metrics]').innerHTML = Object.entries(res.errors).map(([k, v]) => metric(label2[k] + (k === res.method ? ' ✦' : ''), v, k === res.best_method ? 'good' : '')).join('');
    $('[data-explain]').innerHTML = `${esc(res.description)} The cycle length is <b>${res.period} ${res.unit}s</b>. ${res.best_method === res.method ? '✅ Your method is the most accurate here.' : `Best here: <b>${label2[res.best_method]}</b>.`} The pink cone is an ~80% prediction interval — it widens because the future gets less certain.`;
    setLabContext('timeseries', 'Time-series studio', [`Series ${res.series} (${res.length} ${res.unit}s, period ${res.period}), noise ${st.noise}`,
      `Forecast ${res.method} for ${res.horizon} steps: MAE ${res.mae}; all methods ${JSON.stringify(res.errors)}`, `Anomalies at indices ${res.anomalies.join(', ') || 'none'}`]);
  }
  stop = loop((t) => { tNow = t; drawMain(t); drawClock(t); });
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { stop?.(); main.dispose(); dec.dispose(); clock.dispose(); } };
}
