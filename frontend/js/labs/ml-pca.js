// ML lab: PCA explorer — a rotating 3-D cloud, its principal axes, and the "flatten" to k dimensions.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, glowDot, glowLine, label, loop, reducedMotion, project, orbit, ease, rgba } from './neon.js';

export const meta = {
  howto: [
    'Pick a dataset. The 3-D cloud rotates — drag it to orbit. Glowing arrows are the principal components (longest = most variance).',
    'Press Flatten: every point slides onto the k-dimensional subspace PCA keeps. Little movement = little information lost.',
    'The scree chart shows how much variance each component explains; the 2-D view is the data seen along PC1 and PC2.',
    'Try the 5-subject “students” dataset: two components (science vs humanities ability) explain most of it.',
  ],
};
const COLORS = ['#40f0ff', '#f06595', '#ffd43b', '#69db7c', '#b197fc'];

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { dataset: 'pancake', noise: 0, standardize: false, k: 2, n: 300, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <button class="btn btn-course" data-flat>${icon('layers')} Flatten to k dimensions</button>
      <div class="card card-tight sticky small" data-explain></div></div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('sphere')} Data cloud & principal axes</h3><span class="faint tiny">drag to orbit</span></div><div data-cloud></div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
        <div class="card board neon-card"><div class="card-head"><h3>${icon('chart')} Explained variance (scree)</h3></div><div data-scree></div></div>
        <div class="card board neon-card"><div class="card-head"><h3>${icon('target')} Seen along PC1 × PC2</h3></div><div data-proj></div></div>
      </div>
      <div class="card"><div class="card-head"><h3>Result</h3></div><div class="metrics" data-metrics></div><div data-load class="small" style="margin-top:10px"></div></div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  controls($('[data-ctl]'), [
    { type: 'select', key: 'dataset', label: 'Dataset', options: [['pancake', 'Pancake (flat cloud)'], ['cigar', 'Cigar (thin line)'], ['blobs', '3 clusters'], ['helix', 'Helix (curved)'], ['students', 'Students · 5 exam scores']] },
    { type: 'seg', key: 'k', label: 'Keep k components', numeric: true, options: [[1, '1'], [2, '2'], [3, '3']] },
    { type: 'slider', key: 'noise', label: 'Extra noise', min: 0, max: 1.5, step: 0.1 },
    { type: 'toggle', key: 'standardize', label: 'Standardise features (z-scores)' },
  ], st, (k, v, live) => { if (!live) run(); }, { lock });

  const cloud = new Plot($('[data-cloud]'), { height: 400 });
  const scree = new Plot($('[data-scree]'), { height: 220 });
  const proj = new Plot($('[data-proj]'), { height: 220 });
  const view = { yaw: 0.6, pitch: 0.35 };
  const detach = orbit(cloud.canvas, view);
  let res = null, flat = 0, flatTarget = 0, stop = null, scale = 1;

  function drawCloud(t) {
    if (!view.dragging && !reducedMotion()) view.yaw += 0.003;
    flat += (flatTarget - flat) * 0.06;
    cloud.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#7048e8', stars: 70, t });
      if (!res) return;
      const o = { yaw: view.yaw, pitch: view.pitch, scale: Math.min(w, h) * 0.42 / scale, cx: w / 2, cy: h / 2 };
      const m = res.mean;
      const pts = res.points3d.map((p, i) => {
        const r = res.recon3d[i], e = ease(Math.min(1, Math.max(0, flat)));
        const q = [p[0] + (r[0] - p[0]) * e - m[0], p[1] + (r[1] - p[1]) * e - m[1], p[2] + (r[2] - p[2]) * e - m[2]];
        return [...project(q, o), i];
      }).sort((a, b) => b[2] - a[2]);
      for (const [x, y, z, i] of pts) {
        const c = COLORS[res.labels[i] % COLORS.length];
        ctx.fillStyle = rgba(c, 0.35 + 0.5 * (1 - (z + 1) / 2));
        ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
      }
      // principal axes
            for (let i = 0; i < 3; i++) {
        const tip = res.axes3d[i];
        const a = project(tip.map((v) => -v), o), b = project(tip, o);
        const col = i < st.k ? ['#ffd43b', '#ff8787', '#63e6be'][i] : 'rgba(255,255,255,.25)';
        glowLine(ctx, [[a[0], a[1]], [b[0], b[1]]], col, i < st.k ? 3 : 1.5, i < st.k ? 22 : 4);
        glowDot(ctx, b[0], b[1], 3.5, col);
        label(ctx, `PC${i + 1} ${(res.explained[i] * 100).toFixed(0)}%`, b[0] + 6, b[1] - 8, { size: 11, weight: 800, color: col });
      }
      if (flat > 0.02) label(ctx, `flattened to ${st.k}-D · avg squared error ${res.recon_error[st.k].toFixed(3)}`, 12, h - 14, { size: 11, color: '#ffe066' });
    });
  }

  function drawScree() {
    scree.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#7048e8', stars: 10 });
      const e = res.explained, n = e.length, bw = (w - 60) / n;
      e.forEach((v, i) => {
        const x = 40 + i * bw + 6, bh = v * (h - 50);
        ctx.save(); glow(ctx, i < st.k ? '#ffd43b' : '#748ffc', 16); ctx.fillStyle = i < st.k ? 'rgba(255,212,59,.8)' : 'rgba(116,143,252,.5)'; ctx.fillRect(x, h - 26 - bh, bw - 12, bh); ctx.restore();
        label(ctx, `PC${i + 1}`, x + (bw - 12) / 2, h - 12, { align: 'center', size: 10, color: '#dbe4ff' });
        label(ctx, `${(v * 100).toFixed(1)}%`, x + (bw - 12) / 2, h - 34 - bh, { align: 'center', size: 10, color: '#fff' });
      });
      glowLine(ctx, res.cumulative.map((c, i) => [40 + i * bw + bw / 2, h - 26 - c * (h - 50)]), '#63e6be', 2, 12);
      label(ctx, 'cumulative', w - 10, 14, { align: 'right', size: 10, color: '#96f2d7' });
    });
  }

  function drawProj() {
    proj.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#7048e8', stars: 10 });
      const P = res.projected, mx = Math.max(...P.map((p) => Math.max(Math.abs(p[0]), Math.abs(p[1])))) || 1;
      P.forEach((p, i) => { ctx.fillStyle = rgba(COLORS[res.labels[i] % COLORS.length], 0.75); ctx.beginPath(); ctx.arc(w / 2 + (p[0] / mx) * (w / 2 - 16), h / 2 - (p[1] / mx) * (h / 2 - 16), 2.3, 0, Math.PI * 2); ctx.fill(); });
      label(ctx, 'PC1 →', w - 10, h / 2 - 8, { align: 'right', size: 10, color: '#ffe066' });
      label(ctx, '↑ PC2', w / 2 + 6, 12, { size: 10, color: '#ffa8a8' });
    });
  }

  async function run() {
    try { res = await api.lab('ml/pca', { ...st }, store.user?.id); } catch (e) { toast(esc(e.message), 'error'); return; }
    flat = 0; flatTarget = 0;
    scale = Math.max(...res.points3d.map((p) => Math.hypot(p[0] - res.mean[0], p[1] - res.mean[1], p[2] - res.mean[2]))) * 0.8 || 1;
    drawScree(); drawProj();
    const kept = res.cumulative[st.k - 1];
    $('[data-metrics]').innerHTML = metric('Variance kept', `${(kept * 100).toFixed(1)}%`, kept > 0.9 ? 'good' : '') + metric('Dimensions', `${res.columns.length} → ${st.k}`)
      + metric('PC1', `${(res.explained[0] * 100).toFixed(1)}%`) + metric('Reconstruction error', res.recon_error[st.k].toFixed(3));
    $('[data-load]').innerHTML = res.columns.length > 3 ? `<b>Loadings</b> (what each component is made of):<br>${res.loadings.slice(0, 2).map((l) => `PC${l.pc}: ${Object.entries(l.weights).map(([c, v]) => `${esc(c)} <b style="color:${v > 0 ? 'var(--green)' : 'var(--red)'}">${v > 0 ? '+' : ''}${v}</b>`).join(' · ')}`).join('<br>')}` : '';
    $('[data-explain]').innerHTML = `${esc(res.description)} Keeping <b>${st.k}</b> of ${res.columns.length} dimensions preserves <b>${(kept * 100).toFixed(1)}%</b> of the variance.${st.dataset === 'helix' ? ' PCA is <i>linear</i>: it cannot unroll the spiral — that needs methods like t-SNE or UMAP.' : ''}`;
    setLabContext('pca', 'PCA explorer', [`Dataset ${res.dataset} (${res.n} points, ${res.columns.length} features${res.standardize ? ', standardised' : ''})`,
      `Explained variance per component: ${res.explained.map((v) => (v * 100).toFixed(1) + '%').join(', ')}`, `Keeping k=${st.k} keeps ${(kept * 100).toFixed(1)}%; mean squared reconstruction error ${res.recon_error[st.k]}`]);
  }
  $('[data-flat]').addEventListener('click', () => { flatTarget = flatTarget ? 0 : 1; $('[data-flat]').innerHTML = `${icon('layers')} ${flatTarget ? 'Restore original' : 'Flatten to k dimensions'}`; });
  stop = loop(drawCloud);
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { stop?.(); detach(); cloud.dispose(); scree.dispose(); proj.dispose(); } };
}
