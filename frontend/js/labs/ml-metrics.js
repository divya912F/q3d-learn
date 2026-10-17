// ML lab: Threshold & ROC — drag the decision threshold and watch precision, recall and the confusion matrix change.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, glowDot, glowLine, label, rgba } from './neon.js';

export const meta = {
  howto: [
    'A model gives every example a score between 0 and 1. Positives (pink) should score high, negatives (cyan) low — but they overlap.',
    'Drag the threshold (on the chart or the slider). Everything to the right is predicted positive.',
    'Watch the confusion matrix, precision and recall trade off, and the glowing dot move along the ROC and PR curves.',
    'Make positives rare (e.g. 5%): accuracy looks great even for a useless model — that is why we need precision and recall.',
  ],
};

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { separation: 1.6, positives: 0.3, n: 600, threshold: 0.5, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div><button class="btn btn-ghost" data-best>${icon('target')} Jump to best F1 threshold</button><div class="card card-tight sticky small" data-explain></div></div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('chart')} Score distributions</h3><div class="legend"><span><i style="background:#f06595"></i>actual positive</span><span><i style="background:#40f0ff"></i>actual negative</span></div></div><div data-hist></div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
        <div class="card board neon-card"><div class="card-head"><h3>${icon('grid')} Confusion matrix</h3></div><div data-cm></div></div>
        <div class="card board neon-card"><div class="card-head"><h3>ROC curve</h3><span class="chip gray" data-auc></span></div><div data-roc></div></div>
        <div class="card board neon-card"><div class="card-head"><h3>Precision–recall</h3></div><div data-pr></div></div>
      </div>
      <div class="card"><div class="card-head"><h3>At this threshold</h3></div><div class="metrics" data-metrics></div></div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  const ctl = controls($('[data-ctl]'), [
    { type: 'slider', key: 'threshold', label: 'Decision threshold', min: 0.01, max: 0.99, step: 0.01 },
    { type: 'slider', key: 'separation', label: 'Model quality (class separation)', min: 0, max: 4, step: 0.1 },
    { type: 'slider', key: 'positives', label: 'Share of positives', min: 0.02, max: 0.9, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
  ], st, (k, v, live) => { if (k === 'threshold') { update(); return; } if (!live) run(); }, { lock });

  const hist = new Plot($('[data-hist]'), { height: 260 });
  const cm = new Plot($('[data-cm]'), { height: 230 });
  const roc = new Plot($('[data-roc]'), { height: 230 });
  const pr = new Plot($('[data-pr]'), { height: 230 });
  let res = null, cur = null;

  function at(th) {
    let tp = 0, fp = 0, fn = 0, tn = 0;
    res.scores.forEach((s, i) => { const p = s >= th, y = res.labels[i] === 1; if (p && y) tp++; else if (p) fp++; else if (y) fn++; else tn++; });
    const precision = tp + fp ? tp / (tp + fp) : 1, recall = tp + fn ? tp / (tp + fn) : 0;
    return { tp, fp, fn, tn, precision, recall, f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0, accuracy: (tp + tn) / res.n, fpr: fp / Math.max(1, res.negatives) };
  }

  function drawHist() {
    hist.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#c2255c', stars: 30 });
      const B = 40, pos = new Array(B).fill(0), neg = new Array(B).fill(0);
      res.scores.forEach((s, i) => { const b = Math.min(B - 1, Math.floor(s * B)); (res.labels[i] ? pos : neg)[b]++; });
      const max = Math.max(...pos, ...neg), bw = (w - 40) / B, sy = (v) => (v / max) * (h - 50);
      for (let b = 0; b < B; b++) {
        const x = 20 + b * bw, right = (b + 0.5) / B >= st.threshold;
        ctx.fillStyle = rgba('#40f0ff', right ? 0.85 : 0.35); ctx.fillRect(x + 1, h - 26 - sy(neg[b]), bw / 2 - 1, sy(neg[b]));
        ctx.fillStyle = rgba('#f06595', right ? 0.95 : 0.4); ctx.fillRect(x + bw / 2, h - 26 - sy(pos[b]), bw / 2 - 1, sy(pos[b]));
      }
      const tx = 20 + st.threshold * (w - 40);
      ctx.save(); glow(ctx, '#ffd43b', 20); ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx, 8); ctx.lineTo(tx, h - 22); ctx.stroke(); ctx.restore();
      label(ctx, `threshold ${st.threshold.toFixed(2)}`, tx + 6, 16, { size: 11, weight: 800, color: '#ffe066' });
      label(ctx, '← predicted negative', tx - 8, h - 10, { align: 'right', size: 10, color: '#a5d8ff' });
      label(ctx, 'predicted positive →', tx + 8, h - 10, { size: 10, color: '#fcc2d7' });
    });
  }

  function drawCM() {
    cm.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#c2255c', stars: 10, grid: false });
      const cells = [['TP', cur.tp, '#69db7c', 'caught'], ['FN', cur.fn, '#ff8787', 'missed'], ['FP', cur.fp, '#ffa94d', 'false alarm'], ['TN', cur.tn, '#74c0fc', 'correctly ignored']];
      const s = Math.min((w - 80) / 2, (h - 50) / 2), x0 = (w - 2 * s) / 2 + 20, y0 = 30;
      cells.forEach(([n, v, c, sub], i) => {
        const x = x0 + (i % 2) * s, y = y0 + Math.floor(i / 2) * s, a = 0.15 + 0.75 * (v / res.n) ** 0.5;
        ctx.save(); glow(ctx, c, 18 * a); ctx.fillStyle = rgba(c, a); ctx.fillRect(x + 3, y + 3, s - 6, s - 6); ctx.restore();
        label(ctx, `${n} ${v}`, x + s / 2, y + s / 2 - 6, { align: 'center', size: 15, weight: 800, color: '#fff' });
        label(ctx, sub, x + s / 2, y + s / 2 + 12, { align: 'center', size: 10, color: 'rgba(255,255,255,.8)' });
      });
      label(ctx, 'predicted +', x0 + s / 2, 16, { align: 'center', size: 10, color: '#dbe4ff' }); label(ctx, 'predicted −', x0 + 1.5 * s, 16, { align: 'center', size: 10, color: '#dbe4ff' });
      ctx.save(); ctx.translate(x0 - 12, y0 + s / 2); ctx.rotate(-Math.PI / 2); label(ctx, 'actual +', 0, 0, { align: 'center', size: 10, color: '#dbe4ff' }); ctx.restore();
      ctx.save(); ctx.translate(x0 - 12, y0 + 1.5 * s); ctx.rotate(-Math.PI / 2); label(ctx, 'actual −', 0, 0, { align: 'center', size: 10, color: '#dbe4ff' }); ctx.restore();
    });
  }

  function curvePlot(plot, pts, px, py, xl, yl, diag) {
    plot.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#c2255c', stars: 10 });
      const sx = (v) => 30 + v * (w - 44), sy = (v) => h - 24 - v * (h - 40);
      if (diag) { ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.moveTo(sx(0), sy(0)); ctx.lineTo(sx(1), sy(1)); ctx.stroke(); ctx.setLineDash([]); }
      glowLine(ctx, pts.map(([a, b]) => [sx(a), sy(b)]), '#f783ac', 2.6, 16);
      glowDot(ctx, sx(px), sy(py), 6, '#ffe066', 26);
      label(ctx, xl, w - 10, h - 8, { align: 'right', size: 10, color: 'rgba(220,230,255,.7)' });
      label(ctx, yl, 6, 10, { size: 10, color: 'rgba(220,230,255,.7)' });
    });
  }

  function update() {
    if (!res) return;
    cur = at(st.threshold);
    drawHist(); drawCM();
    curvePlot(roc, res.roc.map((p) => [p.fpr, p.tpr]), cur.fpr, cur.recall, 'false-positive rate →', '↑ recall (TPR)', true);
    curvePlot(pr, res.pr.map((p) => [p.recall, p.precision]), cur.recall, cur.precision, 'recall →', '↑ precision', false);
    const f = (v) => `${(v * 100).toFixed(1)}%`;
    $('[data-metrics]').innerHTML = metric('Accuracy', f(cur.accuracy)) + metric('Precision', f(cur.precision)) + metric('Recall', f(cur.recall))
      + metric('F1', cur.f1.toFixed(3), cur.f1 >= res.best_f1.f1 - 0.01 ? 'good' : '') + metric('“Always negative” accuracy', f(res.baseline_accuracy));
    $('[data-explain]').innerHTML = `Raising the threshold makes the model <b>pickier</b>: fewer false alarms (precision ↑) but more misses (recall ↓). AUC = <b>${res.auc}</b> measures ranking quality over all thresholds (0.5 = coin flip, 1 = perfect).`
      + (res.baseline_accuracy > 0.85 ? '<br><br>⚠️ Positives are rare: predicting “negative” for everyone already scores ' + f(res.baseline_accuracy) + ' accuracy!' : '');
    setLabContext('metrics', 'Threshold & ROC', [`${res.n} examples, ${res.positives} positive; separation ${res.separation}; AUC ${res.auc}`,
      `Threshold ${st.threshold}: TP ${cur.tp}, FP ${cur.fp}, FN ${cur.fn}, TN ${cur.tn}; precision ${cur.precision.toFixed(3)}, recall ${cur.recall.toFixed(3)}, F1 ${cur.f1.toFixed(3)}`,
      `Best F1 ${res.best_f1.f1} at threshold ${res.best_f1.threshold}`]);
  }

  async function run() {
    try { res = await api.lab('ml/metrics', { ...st }, store.user?.id); } catch (e) { toast(esc(e.message), 'error'); return; }
    $('[data-auc]').textContent = `AUC ${res.auc}`;
    update();
  }
  hist.canvas.style.cursor = 'ew-resize';
  const drag = (e) => { if (e.buttons !== 1 && e.type !== 'pointerdown') return; const [x] = hist.local(e); st.threshold = Math.min(0.99, Math.max(0.01, +((x - 20) / (hist.w - 40)).toFixed(2))); ctl.render(); update(); };
  hist.canvas.addEventListener('pointerdown', drag); hist.canvas.addEventListener('pointermove', drag);
  $('[data-best]').addEventListener('click', () => { st.threshold = res.best_f1.threshold; ctl.render(); update(); });
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { hist.dispose(); cm.dispose(); roc.dispose(); pr.dispose(); } };
}
