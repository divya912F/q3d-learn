// AI lab: Genetic algorithm — evolving a travelling-salesperson route generation by generation.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { controls, Plot, Player, setLabContext, metric } from './kit.js';
import { space, glow, glowDot, glowLine, label, loop, hue, rgba } from './neon.js';

export const meta = {
  howto: [
    'Each glowing dot is a city. A route visits every city once and returns home — find the shortest one.',
    'Press Evolve: a population of random routes breeds (order crossover), mutates (reversing a stretch) and the shortest survive.',
    'Faint ghost routes are other members of the population; the neon loop is the best so far. Scrub the timeline to watch evolution.',
    'Compare with the greedy nearest-neighbour route. Try a tiny mutation rate (stuck early) and a huge one (random wandering).',
  ],
};

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { cities: 24, layout: 'random', population: 100, generations: 160, mutation: 0.15, elite: 4, seed: 9, showNN: false, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <div class="row"><button class="btn btn-course grow" data-run>${icon('dna')} Evolve</button><button class="icon-btn" data-dice title="New cities">${icon('dice')}</button></div>
      <div class="card card-tight sticky small" data-explain></div></div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('route')} Best route</h3><span class="chip gray" data-gen></span></div><div data-map></div><div data-player style="margin-top:10px"></div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
        <div class="card board neon-card"><div class="card-head"><h3>${icon('trend')} Fitness over generations</h3><div class="legend"><span><i style="background:#ffd43b"></i>best</span><span><i style="background:#748ffc"></i>population mean</span></div></div><div data-fit></div></div>
        <div class="card"><div class="card-head"><h3>Result</h3></div><div class="metrics" data-metrics></div></div>
      </div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  controls($('[data-ctl]'), [
    { type: 'slider', key: 'cities', label: 'Cities', min: 6, max: 60 },
    { type: 'seg', key: 'layout', label: 'Map', options: [['random', 'Random'], ['clusters', 'Clusters'], ['circle', 'Circle']] },
    { type: 'slider', key: 'population', label: 'Population size', min: 10, max: 200, step: 10 },
    { type: 'slider', key: 'generations', label: 'Generations', min: 10, max: 400, step: 10 },
    { type: 'slider', key: 'mutation', label: 'Mutation rate', min: 0, max: 1, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
    { type: 'slider', key: 'elite', label: 'Elites kept unchanged', min: 0, max: 20 },
    { type: 'toggle', key: 'showNN', label: 'Show greedy nearest-neighbour route' },
  ], st, (k, v, live) => { if (k === 'showNN') return; if (!live) run(); }, { lock });

  const map = new Plot($('[data-map]'), { height: 400 });
  const fit = new Plot($('[data-fit]'), { height: 220 });
  let res = null, frame = 0, stop = null;
  const player = new Player($('[data-player]'), { fps: 12, label: (i, n) => `snapshot ${i + 1}/${n}` });

  function drawMap(t) {
    map.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#e8590c', stars: 60, t });
      if (!res) return;
      const s = Math.min(w, h) - 40, ox = (w - s) / 2, oy = (h - s) / 2;
      const P = res.cities.map(([x, y]) => [ox + x * s, oy + y * s]);
      const snap = res.snapshots[Math.min(frame, res.snapshots.length - 1)];
      const loopPts = (tour) => [...tour.map((i) => P[i]), P[tour[0]]];
      snap.ghosts.forEach((g) => { ctx.strokeStyle = 'rgba(180,140,255,.12)'; ctx.lineWidth = 1; ctx.beginPath(); loopPts(g).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); });
      if (st.showNN) { ctx.save(); ctx.setLineDash([5, 5]); glowLine(ctx, loopPts(res.nearest_neighbour.tour), 'rgba(116,192,252,.7)', 1.6, 6); ctx.restore(); }
      // best route as a rainbow neon loop with a travelling spark
      const pts = loopPts(snap.best);
      for (let i = 0; i < pts.length - 1; i++) glowLine(ctx, [pts[i], pts[i + 1]], hue(i, pts.length), 2.6, 16);
      const L = pts.length - 1, f = ((t / 4000) % 1) * L, k = Math.floor(f), u = f - k;
      glowDot(ctx, pts[k][0] + (pts[k + 1][0] - pts[k][0]) * u, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * u, 4, '#fff', 26);
      P.forEach(([x, y], i) => glowDot(ctx, x, y, i === snap.best[0] ? 6 : 4, i === snap.best[0] ? '#ffe066' : '#ffd8a8', 16));
      label(ctx, `length ${snap.length.toFixed(3)}`, 12, 16, { size: 12, weight: 800, color: '#ffe066' });
      label(ctx, `diversity ${(snap.diversity * 100).toFixed(0)}%`, 12, 34, { size: 10, color: 'rgba(220,230,255,.7)' });
      $('[data-gen]').textContent = `generation ${snap.gen}/${res.generations}`;
    });
  }

  function fitDraw() {
    if (!res) return;
    fit.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#e8590c', stars: 10 });
      const H = res.history, lo = Math.min(...H.map((x) => x.best)) * 0.95, hi = Math.max(...H.map((x) => x.mean)) * 1.02;
      const sx = (g) => 34 + (g / res.generations) * (w - 48), sy = (v) => 12 + (1 - (v - lo) / (hi - lo)) * (h - 36);
      glowLine(ctx, H.map((x) => [sx(x.gen), sy(x.mean)]), '#748ffc', 1.6, 8);
      glowLine(ctx, H.map((x) => [sx(x.gen), sy(x.best)]), '#ffd43b', 2.4, 14);
      const nn = res.nearest_neighbour.length;
      if (nn > lo && nn < hi) { ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(116,192,252,.7)'; ctx.beginPath(); ctx.moveTo(34, sy(nn)); ctx.lineTo(w - 14, sy(nn)); ctx.stroke(); ctx.restore(); label(ctx, 'greedy', w - 14, sy(nn) - 8, { align: 'right', size: 10, color: '#a5d8ff' }); }
      const g = res.snapshots[Math.min(frame, res.snapshots.length - 1)].gen;
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(sx(g), 8); ctx.lineTo(sx(g), h - 22); ctx.stroke();
      label(ctx, 'generation →', w - 14, h - 8, { align: 'right', size: 10, color: 'rgba(220,230,255,.6)' });
    });
  }

  async function run() {
    try { res = await api.lab('ai/genetic', { ...st }, store.user?.id); } catch (e) { toast(esc(e.message), 'error'); return; }
    player.load(res.snapshots.length, (i) => { frame = i; fitDraw(); });
    fitDraw();
    const better = res.best_length < res.nearest_neighbour.length;
    $('[data-metrics]').innerHTML = metric('Best length', res.best_length, 'good') + metric('Greedy NN', res.nearest_neighbour.length, better ? '' : 'bad')
      + metric('Random route', res.random_length) + metric('Better than random', `${res.improvement_pct}%`) + metric('Possible routes', `${res.n > 20 ? '≈ 10^' + Math.round(lgFact(res.n - 1) - Math.log10(2)) : Math.round(fact(res.n - 1) / 2).toLocaleString()}`);
    $('[data-explain]').innerHTML = `Evolution tried about <b>${(res.population * res.generations).toLocaleString()}</b> routes out of an astronomically large space and ${better ? 'beat' : 'did not beat'} the greedy heuristic. GAs give <i>good</i> answers, not guaranteed best ones.`;
    setLabContext('genetic', 'Genetic algorithm (TSP)', [`${res.n} cities (${res.layout}), population ${res.population}, ${res.generations} generations, mutation ${res.mutation}, elites ${res.elite}`,
      `Best tour length ${res.best_length}; nearest-neighbour ${res.nearest_neighbour.length}; random average ${res.random_length}`]);
  }
  const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
  const lgFact = (n) => { let s = 0; for (let i = 2; i <= n; i++) s += Math.log10(i); return s; };
  $('[data-run]').addEventListener('click', run);
  $('[data-dice]').addEventListener('click', () => { st.seed = Math.floor(Math.random() * 1e5); run(); });
  stop = loop(drawMap);
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { stop?.(); player.pause(); map.dispose(); fit.dispose(); } };
}
