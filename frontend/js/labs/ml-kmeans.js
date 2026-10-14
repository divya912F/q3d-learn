// ML lab: k-means clustering, one assign/update step at a time, plus elbow & silhouette.
import { api } from '../api.js';
import { store } from '../store.js';
import { icon, toast, cssVar, CLASS_COLORS, hydrateIcons } from '../ui.js';
import { lineChart } from '../charts.js';
import { controls, Plot, frame, drawAxes, dot, Player, setLabContext, metric } from './kit.js';

export const meta = {
  howto: [
    'Generate a dataset with some hidden groups (or use moons/circles to see where k-means struggles).',
    'Choose k — how many clusters to look for — and the initialisation.',
    'Step through: ASSIGN colours each point by its nearest centroid, UPDATE moves each ✕ to the mean of its points.',
    'Use the elbow (inertia) and silhouette charts to pick a good k.',
  ],
};

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const state = { k: 3, true_clusters: 4, spread: 0.55, init: 'kmeans++', seed: 0, dataset: 'blobs', ...preset };
  let res = null;
  let si = 0;
  root.innerHTML = `<div class="lab-grid three">
    <div class="stack"><div class="card controls" data-ctl></div><button class="btn btn-course btn-lg" data-run>${icon('play')} Run k-means</button>
      <div class="card card-tight sticky small">k-means always finds k clusters — even when the data has no real groups. That's why we check the silhouette score.</div></div>
    <div class="stack" style="min-width:0">
      <div class="card"><div class="card-head"><h3>${icon('target')} Clustering</h3><span class="chip gray" data-phase>—</span></div>
        <div class="graph-paper" data-plot></div><div data-player style="margin-top:10px"></div></div>
    </div>
    <div class="stack">
      <div class="card"><div class="card-head"><h3>Result</h3></div><div class="metrics" data-metrics></div></div>
      <div class="card"><div class="card-head"><h3>Elbow method</h3></div><div data-elbow></div></div>
      <div class="card"><div class="card-head"><h3>Silhouette score</h3></div><div data-sil></div><p class="faint tiny" style="margin:6px 0 0">Higher is better (max 1). The best k is the peak.</p></div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  controls($('[data-ctl]'), [
    { type: 'select', key: 'dataset', label: 'Data', options: [['blobs', 'Random blobs'], ['moons', 'Moons'], ['circles', 'Circles']] },
    { type: 'slider', key: 'true_clusters', label: 'Hidden groups', min: 2, max: 8, step: 1, show: (s) => s.dataset === 'blobs' },
    { type: 'slider', key: 'spread', label: 'Spread', min: 0.2, max: 1.4, step: 0.05, fmt: (v) => v.toFixed(2), show: (s) => s.dataset === 'blobs' },
    { type: 'slider', key: 'seed', label: 'Random seed', min: 0, max: 20, step: 1 },
    { type: 'slider', key: 'k', label: 'k (clusters to find)', min: 1, max: 8, step: 1 },
    { type: 'seg', key: 'init', label: 'Initialisation', options: [['kmeans++', 'k-means++'], ['random', 'random']] },
  ], state, (k, v, live) => { if (!live) run(); }, { lock });

  const plot = new Plot($('[data-plot]'), { aspect: 0.7 });
  const player = new Player($('[data-player]'), { fps: 2.5, label: (i) => (res ? `iteration ${res.steps[i].iter + 1} · ${res.steps[i].phase}` : '—') });
  const trails = [];

  function draw() {
    plot.draw((ctx, w, h) => {
      if (!res) return;
      const xs = res.points.map((p) => p[0]), ys = res.points.map((p) => p[1]);
      const ext = [Math.min(...xs) - 0.4, Math.max(...xs) + 0.4, Math.min(...ys) - 0.4, Math.max(...ys) + 0.4];
      const f = frame(ext, w, h, 28);
      drawAxes(ctx, f, w, h);
      const step = res.steps[si];
      res.points.forEach((p, i) => dot(ctx, f.sx(p[0]), f.sy(p[1]), 4, CLASS_COLORS[step.labels[i] % CLASS_COLORS.length], 'rgba(255,255,255,.8)', 0.8));
      // centroid trails
      ctx.lineWidth = 2;
      step.centroids.forEach((_, j) => {
        ctx.strokeStyle = CLASS_COLORS[j % CLASS_COLORS.length];
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        res.steps.slice(0, si + 1).forEach((s, t) => { const c = s.centroids[j]; if (t) ctx.lineTo(f.sx(c[0]), f.sy(c[1])); else ctx.moveTo(f.sx(c[0]), f.sy(c[1])); });
        ctx.stroke();
      });
      ctx.setLineDash([]);
      step.centroids.forEach((c, j) => {
        const x = f.sx(c[0]), y = f.sy(c[1]);
        ctx.strokeStyle = cssVar('--text');
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(x - 9, y - 9); ctx.lineTo(x + 9, y + 9); ctx.moveTo(x + 9, y - 9); ctx.lineTo(x - 9, y + 9); ctx.stroke();
        ctx.strokeStyle = CLASS_COLORS[j % CLASS_COLORS.length];
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(x - 8, y - 8); ctx.lineTo(x + 8, y + 8); ctx.moveTo(x + 8, y - 8); ctx.lineTo(x - 8, y + 8); ctx.stroke();
      });
    });
  }

  function show(i) {
    si = i;
    draw();
    const s = res.steps[i];
    $('[data-phase]').textContent = s.phase === 'assign' ? 'ASSIGN: nearest centroid' : 'UPDATE: move to the mean';
    $('[data-metrics]').innerHTML = metric('k', res.k) + metric('Inertia', s.inertia.toFixed(1)) + metric('Iterations', res.final.iterations)
      + metric('Silhouette', res.final.silhouette == null ? '—' : res.final.silhouette.toFixed(3), res.final.silhouette > 0.6 ? 'good' : '');
  }

  async function run() {
    try {
      res = await api.lab('ml/kmeans', state, store.user?.id);
      trails.length = 0;
      player.load(res.steps.length, show);
      lineChart($('[data-elbow]'), [{ name: 'inertia', color: 'var(--course)', points: res.elbow.map((e) => [e.k, e.inertia]), dots: true }], { height: 160, xLabel: 'k', marker: res.k });
      lineChart($('[data-sil]'), [{ name: 'silhouette', color: 'var(--violet)', points: res.elbow.filter((e) => e.silhouette != null).map((e) => [e.k, e.silhouette]), dots: true }], { height: 150, xLabel: 'k', marker: res.k });
      const best = res.elbow.filter((e) => e.silhouette != null).reduce((a, b) => (b.silhouette > a.silhouette ? b : a));
      setLabContext('kmeans', 'k-means lab', [
        `Data: ${state.dataset === 'blobs' ? `${state.true_clusters} hidden groups, spread ${state.spread}` : state.dataset}, ${res.points.length} points`,
        `k = ${res.k}, init ${state.init}; converged after ${res.final.iterations} iterations`,
        `Final inertia ${res.final.inertia}, silhouette ${res.final.silhouette}`,
        `Silhouette by k: ${res.elbow.filter((e) => e.silhouette != null).map((e) => `k=${e.k}: ${e.silhouette}`).join(', ')} (best k = ${best.k})`,
      ]);
    } catch (e) { toast(e.message, 'error'); }
  }
  $('[data-run]').addEventListener('click', run);
  run();
  return { getConfig: () => ({ ...state }), destroy: () => { plot.dispose(); player.pause(); } };
}
