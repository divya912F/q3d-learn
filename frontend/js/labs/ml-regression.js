// ML lab: polynomial regression trained by gradient descent, with a 3D loss landscape.
import { api } from '../api.js';
import { store } from '../store.js';
import { icon, toast, cssVar, hydrateIcons } from '../ui.js';
import { lineChart } from '../charts.js';
import { controls, Plot, frame, drawAxes, dot, Player, setLabContext, metric } from './kit.js';
import { LossLandscape } from '../three/landscape.js';

export const meta = {
  howto: [
    'Pick a dataset (or draw your own points by clicking the plot).',
    'Choose the polynomial degree, learning rate and number of epochs.',
    'Press Train and watch the curve fit itself, epoch by epoch.',
    'Open the 3D loss landscape to see gradient descent roll downhill.',
    'Raise the degree on the sine data and compare train vs. test error.',
  ],
};

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const state = { dataset: 'linear', noise: 0.3, degree: 1, lr: 0.1, epochs: 100, seed: 0, ...preset };
  let custom = state.dataset === 'custom' ? [] : null;
  let res = null;
  let frameIdx = 0;
  let land = null;

  root.innerHTML = `<div class="lab-grid">
    <div class="stack">
      <div class="card controls" data-ctl></div>
      <button class="btn btn-course btn-lg" data-train>${icon('play')} Train model</button>
      <div class="card card-tight sticky small" data-note>Tip: a learning rate that is too large makes the loss explode. Try 1.2!</div>
    </div>
    <div class="stack" style="min-width:0">
      <div class="card">
        <div class="card-head"><h3>${icon('trend')} Fitting the data</h3><div class="legend"><span><i style="background:var(--course)"></i>train</span><span><i style="background:transparent;border:2px solid var(--violet)"></i>test</span><span><i style="background:var(--text)"></i>model</span></div></div>
        <div class="graph-paper" data-plot></div>
        <div data-player style="margin-top:10px"></div>
        <div class="metrics" data-metrics style="margin-top:12px"></div>
        <div class="faint small mono" data-eq style="margin-top:8px"></div>
      </div>
      <div class="card">
        <div class="tabs" data-tabs><button class="tab active" data-t="loss">Loss curve</button><button class="tab" data-t="land">3D loss landscape</button><button class="tab" data-t="sweep">Degree sweep (bias–variance)</button></div>
        <div data-tabbody style="margin-top:14px"></div>
      </div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);

  const spec = [
    { type: 'select', key: 'dataset', label: 'Dataset', options: [['linear', 'Linear trend'], ['quadratic', 'Quadratic curve'], ['sine', 'Sine wave'], ['custom', '✏️ Draw your own']] },
    { type: 'slider', key: 'noise', label: 'Noise', min: 0, max: 1.5, step: 0.05, fmt: (v) => v.toFixed(2), show: (s) => s.dataset !== 'custom' },
    { type: 'slider', key: 'degree', label: 'Polynomial degree', min: 1, max: 9, step: 1 },
    { type: 'slider', key: 'lr', label: 'Learning rate η', min: 0.001, max: 2, log: true, fmt: (v) => v.toPrecision(2) },
    { type: 'slider', key: 'epochs', label: 'Epochs', min: 5, max: 1000, step: 5 },
  ];
  controls($('[data-ctl]'), spec, state, (k, v, live) => {
    if (k === 'dataset') { custom = v === 'custom' ? [] : null; res = null; drawPlot(); if (v !== 'custom') train(); else toast('Click on the plot to add points, then press Train.', 'info'); }
    else if (!live) train();
  }, { lock });

  const plot = new Plot($('[data-plot]'), { height: 380 });
  const player = new Player($('[data-player]'), { label: (i, n) => `epoch ${res?.snapshots[i]?.epoch ?? 0} / ${res?.history.at(-1)?.epoch ?? 0}` });
  let tab = 'loss';

  function extentOf(points) {
    const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
    const px = (Math.max(...xs) - Math.min(...xs)) * 0.08 || 1, py = (Math.max(...ys) - Math.min(...ys)) * 0.15 || 1;
    return [Math.min(...xs) - px, Math.max(...xs) + px, Math.min(...ys) - py, Math.max(...ys) + py];
  }

  function drawPlot() {
    plot.draw((ctx, w, h) => {
      const pts = custom ?? res?.points ?? [];
      const ext = custom ? [-3.5, 3.5, -6, 6] : pts.length > 1 ? extentOf(pts) : [-3, 3, -5, 5];
      const f = frame(ext, w, h);
      drawAxes(ctx, f, w, h, { xLabel: 'x', yLabel: 'y' });
      const course = cssVar('--course') || '#e8590c';
      const violet = cssVar('--violet');
      const testSet = new Set(res && !custom ? res.test_idx : []);
      pts.forEach((p, i) => {
        if (testSet.has(i)) dot(ctx, f.sx(p[0]), f.sy(p[1]), 5, cssVar('--surface'), violet, 2);
        else dot(ctx, f.sx(p[0]), f.sy(p[1]), 4.5, course);
      });
      if (res && res.snapshots[frameIdx]) {
        const curve = res.snapshots[frameIdx].curve;
        ctx.save();
        ctx.beginPath();
        ctx.rect(f.pad, 0, w - f.pad, h - f.pad);
        ctx.clip();
        ctx.strokeStyle = cssVar('--text');
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        res.xs.forEach((x, i) => { const y = curve[i]; if (i) ctx.lineTo(f.sx(x), f.sy(y)); else ctx.moveTo(f.sx(x), f.sy(y)); });
        ctx.stroke();
        ctx.restore();
      }
      if (custom && !custom.length) {
        ctx.fillStyle = cssVar('--text-3');
        ctx.font = '20px Caveat, cursive';
        ctx.textAlign = 'center';
        ctx.fillText('click anywhere to add points ✏️', w / 2, h / 2);
      }
      plot.f = f;
    });
  }

  plot.canvas.addEventListener('click', (e) => {
    if (!custom) return;
    const [px, py] = plot.local(e);
    const f = plot.f;
    custom.push([+f.ix(px).toFixed(3), +f.iy(py).toFixed(3)]);
    drawPlot();
  });

  function showFrame(i) {
    frameIdx = i;
    drawPlot();
    const snap = res.snapshots[i];
    const hist = res.history.find((x) => x.epoch === snap.epoch) || res.history.at(-1);
    $('[data-metrics]').innerHTML = metric('Epoch', snap.epoch) + metric('Train MSE', fmt(hist.train)) + metric('Test MSE', fmt(hist.test), hist.test != null && res.final.best_possible_test_mse && hist.test <= res.final.best_possible_test_mse * 1.1 + 0.01 ? 'good' : '')
      + metric('Best possible', fmt(res.final.best_possible_test_mse));
    if (tab === 'loss') drawLoss(snap.epoch);
    if (tab === 'land' && land) land.setStep(Math.min(snap.epoch, (res.landscape?.path.length || 1) - 1));
  }

  const fmt = (v) => (v == null ? '∞' : v > 1e5 ? v.toExponential(1) : v.toFixed(3));

  function drawLoss(marker) {
    const body = $('[data-tabbody]');
    if (!res) { body.innerHTML = '<div class="empty">Train a model to see the loss curve.</div>'; return; }
    let holder = body.querySelector('[data-loss]');
    if (!holder) { body.innerHTML = '<div data-loss></div><p class="faint small" style="margin:6px 0 0">Log scale. A gap between the lines = the model memorises the training points (overfitting).</p>'; holder = body.querySelector('[data-loss]'); }
    const ok = res.history.filter((x) => x.train != null);
    lineChart(holder, [
      { name: 'train loss', color: 'var(--course)', points: ok.map((x) => [x.epoch, x.train]) },
      { name: 'test loss', color: 'var(--violet)', points: ok.map((x) => [x.epoch, x.test]), dashed: true },
    ], { height: 220, logY: true, xLabel: 'epoch', yLabel: 'MSE', marker });
  }

  async function renderTab() {
    const body = $('[data-tabbody]');
    land?.dispose(); land = null;
    if (tab === 'loss') { body.innerHTML = ''; drawLoss(res?.snapshots[frameIdx]?.epoch); }
    if (tab === 'land') {
      if (!res?.landscape) {
        body.innerHTML = `<div class="empty">${res?.diverged ? 'The model diverged — there is no path to show. Lower the learning rate.' : 'The 3D loss landscape is available for degree 1 (a straight line has two parameters: slope and intercept).'}</div>`;
        return;
      }
      body.innerHTML = `<div class="board landscape-holder"></div><p class="faint small" style="margin:8px 0 0">Every point on the surface is a possible line; height = its error. The yellow ball is your model during training; the blue cone is the best possible line. Drag to orbit.</p>`;
      land = new LossLandscape(body.querySelector('.landscape-holder'));
      land.setData(res.landscape);
      land.setStep(Math.min(res.snapshots[frameIdx].epoch, res.landscape.path.length - 1));
    }
    if (tab === 'sweep') {
      const ds = state.dataset === 'custom' ? 'sine' : state.dataset;
      body.innerHTML = '<div data-sw></div><p class="faint small" style="margin:6px 0 0" data-swn></p>';
      const sweep = await api.get(`/api/ml/degree-sweep?dataset=${ds}&noise=${state.noise}&seed=${state.seed}`);
      const best = sweep.reduce((a, b) => (b.test < a.test ? b : a));
      lineChart(body.querySelector('[data-sw]'), [
        { name: 'train error', color: 'var(--course)', points: sweep.map((s) => [s.degree, s.train]), dots: true },
        { name: 'test error', color: 'var(--violet)', points: sweep.map((s) => [s.degree, s.test]), dots: true, dashed: true },
      ], { height: 220, xLabel: 'polynomial degree', yLabel: 'MSE', marker: state.degree });
      body.querySelector('[data-swn]').textContent = `Closed-form fits on the “${ds}” data. Training error always falls as the degree grows; test error is lowest at degree ${best.degree} — beyond that the model starts to overfit.`;
    }
  }
  $('[data-tabs]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    tab = b.dataset.t;
    $('[data-tabs]').querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === b));
    renderTab();
  });

  let busy = false;
  async function train() {
    if (busy) return;
    if (custom && custom.length < 3) { toast('Add at least 3 points first.', 'info'); return; }
    busy = true;
    $('[data-train]').disabled = true;
    try {
      const cfg = { ...state, points: custom || undefined };
      res = await api.lab('ml/regression', cfg, store.user?.id);
      if (res.diverged) toast('Diverged! The learning rate is too large — the loss blew up.', 'error', 4500);
      $('[data-eq]').textContent = res.diverged ? '' : res.equation;
      setLabContext('regression', 'Regression lab', [
        `Dataset: ${state.dataset}, ${res.points.length} points (${res.test_idx.length} held out for testing)`,
        `Model: polynomial of degree ${res.degree}, trained by gradient descent, learning rate ${res.lr}, ${res.final.epochs_run} epochs`,
        res.diverged ? 'Training DIVERGED: the loss exploded because the learning rate is too large' : `Final train MSE ${res.final.train_mse}, test MSE ${res.final.test_mse}`,
        `Best possible test MSE for this degree (closed-form least squares): ${res.final.best_possible_test_mse}`,
        res.final.test_mse && res.final.train_mse && res.final.test_mse > res.final.train_mse * 1.5 ? 'Test error is much higher than train error → signs of overfitting' : '',
      ]);
      player.load(res.snapshots.length, showFrame);
      renderTab();
    } catch (e) { toast(e.message, 'error'); } finally { busy = false; $('[data-train]').disabled = false; }
  }
  $('[data-train]').addEventListener('click', train);
  drawPlot();
  if (state.dataset !== 'custom') train();

  return {
    getConfig: () => ({ ...state, points: custom || undefined }),
    destroy: () => { plot.dispose(); land?.dispose(); player.pause(); },
  };
}
