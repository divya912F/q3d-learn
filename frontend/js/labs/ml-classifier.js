// ML lab: classifier playground — decision boundaries forming epoch by epoch.
import { api } from '../api.js';
import { store } from '../store.js';
import { icon, toast, cssVar, CLASS_COLORS, hydrateIcons } from '../ui.js';
import { lineChart, heatMatrix } from '../charts.js';
import { controls, Plot, frame, drawAxes, dot, hexA, Player, setLabContext, metric, pct } from './kit.js';

export const meta = {
  howto: [
    'Choose a dataset — or draw your own points of each class.',
    'Pick a model: logistic regression, k-NN, a decision tree or a neural network.',
    'Train and watch the coloured decision regions form. Faded colour = low confidence.',
    'Compare train and test accuracy; hollow points are the held-out test set.',
    'For neural networks, inspect the weights; for trees, read the questions they ask.',
  ],
};

const MODELS = [['logistic', 'Logistic regression'], ['knn', 'k-nearest neighbours'], ['tree', 'Decision tree'], ['mlp', 'Neural network']];

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const state = {
    dataset: 'moons', noise: 0.15, model: 'mlp', lr: 0.03, epochs: 300, degree: 1, k: 5, max_depth: 4, min_samples: 2,
    hidden: [8, 8], activation: 'relu', l2: 0, seed: 0, drawClass: 0, ...preset,
  };
  state.hidden = [...(state.hidden || [8, 8])];
  let custom = state.dataset === 'custom' ? { points: [], labels: [] } : null;
  let res = null;
  let fi = 0;

  root.innerHTML = `<div class="lab-grid three">
    <div class="stack">
      <div class="card controls" data-ctl></div>
      <button class="btn btn-course btn-lg" data-train>${icon('play')} Train model</button>
    </div>
    <div class="stack" style="min-width:0">
      <div class="card">
        <div class="card-head"><h3>${icon('grid')} Decision boundary</h3><span class="faint small" data-legend></span></div>
        <div class="graph-paper" data-plot></div>
        <div data-player style="margin-top:10px"></div>
      </div>
      <div class="card"><div class="card-head"><h3>${icon('trend')} Learning curve</h3></div><div data-curve></div></div>
    </div>
    <div class="stack">
      <div class="card"><div class="card-head"><h3>Scoreboard</h3></div><div class="metrics" data-metrics></div></div>
      <div class="card"><div class="card-head"><h3>Confusion matrix <span class="faint tiny">(test)</span></h3></div><div data-cm></div></div>
      <div class="card" data-inside-card><div class="card-head"><h3 data-inside-title>Inside the model</h3></div><div data-inside></div></div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);

  const spec = [
    { type: 'select', key: 'dataset', label: 'Dataset', options: [['blobs', 'Two blobs'], ['blobs3', 'Three blobs'], ['moons', 'Moons'], ['circles', 'Circles'], ['xor', 'XOR'], ['spiral', 'Spiral'], ['custom', '✏️ Draw your own']] },
    { type: 'seg', key: 'drawClass', label: 'Paint class', numeric: true, options: [[0, 'A'], [1, 'B'], [2, 'C']], show: (s) => s.dataset === 'custom' },
    { type: 'slider', key: 'noise', label: 'Noise', min: 0, max: 0.6, step: 0.01, fmt: (v) => v.toFixed(2), show: (s) => s.dataset !== 'custom' },
    { type: 'select', key: 'model', label: 'Model', options: MODELS },
    { type: 'slider', key: 'degree', label: 'Polynomial features', min: 1, max: 5, step: 1, show: (s) => s.model === 'logistic', help: 'Degree > 1 lets a linear model bend.' },
    { type: 'slider', key: 'k', label: 'k (neighbours)', min: 1, max: 40, step: 1, show: (s) => s.model === 'knn' },
    { type: 'slider', key: 'max_depth', label: 'Max depth', min: 1, max: 10, step: 1, show: (s) => s.model === 'tree' },
    { type: 'slider', key: 'min_samples', label: 'Min samples to split', min: 2, max: 30, step: 1, show: (s) => s.model === 'tree' },
    { type: 'custom', key: 'hidden', label: 'Hidden layers', show: (s) => s.model === 'mlp', render: renderLayers },
    { type: 'seg', key: 'activation', label: 'Activation', options: [['relu', 'ReLU'], ['tanh', 'tanh'], ['sigmoid', 'sigmoid']], show: (s) => s.model === 'mlp' },
    { type: 'slider', key: 'lr', label: 'Learning rate', min: 0.001, max: 0.3, log: true, fmt: (v) => v.toPrecision(2), show: (s) => ['mlp', 'logistic'].includes(s.model) },
    { type: 'slider', key: 'epochs', label: 'Epochs', min: 10, max: 1500, step: 10, show: (s) => ['mlp', 'logistic'].includes(s.model) },
    { type: 'slider', key: 'l2', label: 'L2 regularisation', min: 0, max: 0.05, step: 0.001, fmt: (v) => v.toFixed(3), show: (s) => ['mlp', 'logistic'].includes(s.model) },
  ];

  function renderLayers(el, st, set) {
    const locked = lock.includes('hidden');
    el.innerHTML = `<label style="display:flex;justify-content:space-between;font-size:.8rem;font-weight:600;color:var(--text-2)">Hidden layers <span class="mono">${st.hidden.reduce((a, b) => a + b, 0)} neurons</span></label>
      <div class="stack" style="gap:6px">${st.hidden.map((n, i) => `<div class="row" style="gap:6px;flex-wrap:nowrap"><span class="faint tiny" style="width:52px">layer ${i + 1}</span>
        <div class="qcount"><button data-l="${i}" data-d="-1" ${locked ? 'disabled' : ''}>−</button><span>${n}</span><button data-l="${i}" data-d="1" ${locked ? 'disabled' : ''}>+</button></div>
        <button class="icon-btn" style="width:30px;height:30px" data-rm="${i}" title="Remove layer" ${st.hidden.length <= 1 || locked ? 'disabled' : ''}>${icon('x')}</button></div>`).join('')}
      ${st.hidden.length < 4 && !locked ? `<button class="btn btn-ghost btn-sm" data-add>${icon('plus')} Add layer</button>` : ''}</div>`;
    el.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      const h = [...st.hidden];
      if (b.dataset.add != null) h.push(4);
      else if (b.dataset.rm != null) h.splice(+b.dataset.rm, 1);
      else h[+b.dataset.l] = Math.max(1, Math.min(32, h[+b.dataset.l] + (+b.dataset.d) * (h[+b.dataset.l] >= 8 && +b.dataset.d > 0 ? 2 : 1)));
      st.hidden = h;
      renderLayers(el, st, set);
      set(h);
    };
  }

  const ctl = controls($('[data-ctl]'), spec, state, (k, v, live) => {
    if (k === 'dataset') {
      custom = v === 'custom' ? { points: [], labels: [] } : null;
      res = null;
      draw();
      if (!custom) train(); else toast('Pick a class, then click to paint points. Train when ready.', 'info');
      return;
    }
    if (k === 'drawClass') return;
    if (k === 'model') { ctl.render(); }
    if (!live) train();
  }, { lock });

  const plot = new Plot($('[data-plot]'), { aspect: 0.72 });
  const player = new Player($('[data-player]'), { label: (i) => (res ? `${res.model === 'tree' ? 'depth' : 'epoch'} ${res.snapshots[i]?.epoch ?? 0}` : '—') });
  const img = document.createElement('canvas');

  function draw() {
    plot.draw((ctx, w, h) => {
      const ext = res && !custom ? res.extent : (custom ? [-3, 3, -3, 3] : [-3, 3, -3, 3]);
      const f = frame(ext, w, h, 28);
      plot.f = f;
      if (res && res.snapshots[fi]) {
        const G = res.grid;
        img.width = G; img.height = G;
        const ictx = img.getContext('2d');
        const data = ictx.createImageData(G, G);
        const snap = res.snapshots[fi];
        const rgb = CLASS_COLORS.map((c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; });
        for (let iy = 0; iy < G; iy++) {
          for (let ix = 0; ix < G; ix++) {
            const k = iy * G + ix;
            const c = rgb[snap.cls[k]];
            const conf = snap.conf[k];
            const p = ((G - 1 - iy) * G + ix) * 4;
            data.data[p] = c[0]; data.data[p + 1] = c[1]; data.data[p + 2] = c[2];
            data.data[p + 3] = Math.round(255 * (0.08 + 0.42 * Math.max(0, (conf - 1 / res.classes) / (1 - 1 / res.classes))));
          }
        }
        ictx.putImageData(data, 0, 0);
        ctx.imageSmoothingEnabled = true;
        const x0 = f.sx(res.extent[0]), x1 = f.sx(res.extent[1]), y0 = f.sy(res.extent[3]), y1 = f.sy(res.extent[2]);
        ctx.drawImage(img, x0, y0, x1 - x0, y1 - y0);
      }
      drawAxes(ctx, f, w, h, { xLabel: 'x₁', yLabel: 'x₂' });
      const pts = custom ? custom.points : res?.points || [];
      const labels = custom ? custom.labels : res?.labels || [];
      const test = new Set(res && !custom ? res.test_idx : []);
      const surface = cssVar('--surface') || '#fff';
      pts.forEach((p, i) => {
        const col = CLASS_COLORS[labels[i]];
        if (test.has(i)) dot(ctx, f.sx(p[0]), f.sy(p[1]), 5, surface, col, 2.2);
        else dot(ctx, f.sx(p[0]), f.sy(p[1]), 4.2, col, hexA('#ffffff', 0.9), 1);
      });
      if (custom && !custom.points.length) {
        ctx.fillStyle = cssVar('--text-3');
        ctx.font = '20px Caveat, cursive';
        ctx.textAlign = 'center';
        ctx.fillText('choose a class and click to paint points ✏️', w / 2, h / 2);
      }
    });
    const k = res?.classes || (custom ? Math.max(2, ...custom.labels.map((l) => l + 1)) : 2);
    $('[data-legend]').innerHTML = Array.from({ length: k }, (_, i) => `<span style="display:inline-flex;align-items:center;gap:4px;margin-left:10px"><i style="width:10px;height:10px;border-radius:50%;background:${CLASS_COLORS[i]};display:inline-block"></i>class ${'ABC'[i]}</span>`).join('') + ' · ○ test point';
  }

  plot.canvas.addEventListener('click', (e) => {
    if (!custom) return;
    const [px, py] = plot.local(e);
    custom.points.push([+plot.f.ix(px).toFixed(3), +plot.f.iy(py).toFixed(3)]);
    custom.labels.push(state.drawClass);
    draw();
  });

  function showFrame(i) {
    fi = i;
    draw();
    const snap = res.snapshots[i];
    const hrow = res.history.find((x) => x.epoch === snap.epoch) || res.history.at(-1);
    $('[data-metrics]').innerHTML = metric('Train acc', pct(hrow.train_acc)) + metric('Test acc', pct(hrow.test_acc), hrow.test_acc >= 0.9 ? 'good' : hrow.test_acc < 0.7 ? 'bad' : '')
      + (res.params ? metric('Parameters', res.params) : '') + (res.tree ? metric('Tree depth', treeDepth(res.tree)) : '') + metric('Points', res.points.length);
    curve(snap.epoch);
  }

  function curve(marker) {
    const hist = res.history;
    if (hist.length < 2) { $('[data-curve]').innerHTML = `<p class="muted small" style="margin:0">${res.model === 'knn' ? 'k-NN has no training loop — it simply remembers the training points and votes at prediction time.' : 'One step only.'}</p>`; return; }
    const series = [
      { name: 'train accuracy', color: 'var(--course)', points: hist.map((x) => [x.epoch, x.train_acc]) },
      { name: 'test accuracy', color: 'var(--violet)', points: hist.map((x) => [x.epoch, x.test_acc]), dashed: true },
    ];
    if (hist[0].loss != null) series.push({ name: 'loss', color: 'var(--text-3)', points: hist.map((x) => [x.epoch, Math.min(x.loss, 2)]), width: 1.5 });
    lineChart($('[data-curve]'), series, { height: 190, xLabel: res.model === 'tree' ? 'depth' : 'epoch', marker, yMin: 0 });
  }

  function treeDepth(n) { return n.feature == null ? 0 : 1 + Math.max(treeDepth(n.left), treeDepth(n.right)); }

  function renderInside() {
    const box = $('[data-inside]');
    const title = $('[data-inside-title]');
    if (res.model === 'mlp' && res.network) { title.textContent = 'Network weights'; box.innerHTML = networkSVG(res.network); }
    else if (res.model === 'tree' && res.tree) { title.textContent = 'The tree’s questions'; box.innerHTML = treeSVG(res.tree, res.scaler); }
    else if (res.model === 'knn') { title.textContent = 'How k-NN decides'; box.innerHTML = `<p class="muted small">Each location is coloured by a vote of its <b>${state.k}</b> nearest training points. Small k → wiggly islands around noisy points; large k → smooth, simpler regions.</p>`; }
    else { title.textContent = 'How logistic regression decides'; box.innerHTML = `<p class="muted small">A weighted sum of ${state.degree > 1 ? `polynomial features (degree ${state.degree})` : 'the two features'} is squashed by the sigmoid/softmax into class probabilities. ${state.degree === 1 ? 'With degree 1 the boundary is a straight line.' : 'Higher degrees let the boundary curve.'}</p>`; }
    const cm = res.final.confusion;
    const labels = cm.map((_, i) => `true ${'ABC'[i]}`);
    heatMatrix($('[data-cm]'), labels, cm.map((_, i) => `pred ${'ABC'[i]}`), cm, { diverging: false, fmt: (v) => String(v) });
  }

  let busy = false;
  async function train() {
    if (busy) return;
    if (custom && (custom.points.length < 4 || new Set(custom.labels).size < 2)) { toast('Paint at least 4 points from 2 different classes.', 'info'); return; }
    busy = true;
    $('[data-train]').disabled = true;
    try {
      const cfg = { ...state, ...(custom ? { points: custom.points, labels: custom.labels } : {}) };
      res = await api.lab('ml/classifier', cfg, store.user?.id);
      renderInside();
      player.load(res.snapshots.length, showFrame, { autoplay: res.snapshots.length > 1 });
      setLabContext('classifier', 'Classifier playground', [
        `Dataset: ${state.dataset} (${res.points.length} points, ${res.classes} classes, ${res.test_idx.length} test points)`,
        `Model: ${MODELS.find((m) => m[0] === res.model)[1]}${res.model === 'mlp' ? ` with hidden layers [${state.hidden.join(', ')}], ${state.activation}, lr ${state.lr}, ${state.epochs} epochs` : ''}${res.model === 'knn' ? `, k = ${state.k}` : ''}${res.model === 'tree' ? `, max depth ${state.max_depth}` : ''}${res.model === 'logistic' ? `, polynomial degree ${state.degree}` : ''}`,
        `Train accuracy ${pct(res.final.train_acc)}, test accuracy ${pct(res.final.test_acc)}`,
        `Confusion matrix (rows = true class, columns = predicted): ${JSON.stringify(res.final.confusion)}`,
        res.final.train_acc - res.final.test_acc > 0.1 ? 'Train accuracy is much higher than test accuracy → overfitting' : '',
        res.final.train_acc < 0.75 ? 'Even training accuracy is low → the model is too simple for this data (underfitting)' : '',
      ]);
    } catch (e) { toast(e.message, 'error'); } finally { busy = false; $('[data-train]').disabled = false; }
  }
  $('[data-train]').addEventListener('click', train);
  draw();
  if (!custom) train();

  return {
    getConfig: () => ({ ...state, ...(custom ? { points: custom.points, labels: custom.labels } : {}) }),
    destroy: () => { plot.dispose(); player.pause(); },
  };
}

function networkSVG(net) {
  const W = 340, H = 230;
  const L = net.sizes.length;
  const pos = net.sizes.map((n, l) => Array.from({ length: n }, (_, i) => [20 + (l * (W - 40)) / (L - 1), n === 1 ? H / 2 : 18 + (i * (H - 36)) / (n - 1)]));
  const maxW = Math.max(1e-9, ...net.weights.flat(2).map(Math.abs));
  let edges = '';
  net.weights.forEach((Wm, l) => {
    Wm.forEach((row, i) => row.forEach((w, j) => {
      const [x1, y1] = pos[l][i], [x2, y2] = pos[l + 1][j];
      const t = Math.abs(w) / maxW;
      if (t < 0.05) return;
      edges += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${w > 0 ? '#e8590c' : '#3b5bdb'}" stroke-width="${(0.4 + 3 * t).toFixed(2)}" stroke-opacity="${(0.25 + 0.6 * t).toFixed(2)}"/>`;
    }));
  });
  const nodes = pos.map((layer, l) => layer.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${l === 0 || l === L - 1 ? 7 : 5.5}" style="fill:var(--surface);stroke:var(--text)" stroke-width="1.5"/>`).join('')).join('');
  const labels = net.sizes.map((n, l) => `<text x="${pos[l][0][0]}" y="${H - 2}" text-anchor="middle" font-size="9.5" style="fill:var(--text-3)">${l === 0 ? 'input' : l === L - 1 ? 'output' : `${n} ${net.activation}`}</text>`).join('');
  return `<svg class="net-svg" viewBox="0 0 ${W} ${H + 8}">${edges}${nodes}${labels}</svg>
    <div class="legend"><span><i style="background:#e8590c"></i>positive weight</span><span><i style="background:#3b5bdb"></i>negative</span><span>thicker = stronger</span></div>`;
}

function treeSVG(tree, scaler) {
  const leaves = [];
  const layout = (n, d) => {
    n.depth = d;
    if (n.feature == null) { n.x = leaves.length; leaves.push(n); return; }
    layout(n.left, d + 1);
    layout(n.right, d + 1);
    n.x = (n.left.x + n.right.x) / 2;
  };
  layout(tree, 0);
  const depth = Math.max(...leaves.map((l) => l.depth));
  const W = Math.max(320, leaves.length * 46), H = 50 + depth * 62;
  const X = (x) => 24 + (x / Math.max(1, leaves.length - 1)) * (W - 48);
  const Y = (d) => 22 + d * 62;
  let s = '';
  const walk = (n) => {
    if (n.feature != null) {
      [n.left, n.right].forEach((c, k) => {
        s += `<line x1="${X(n.x)}" y1="${Y(n.depth) + 10}" x2="${X(c.x)}" y2="${Y(c.depth) - 10}" style="stroke:var(--line-strong)" stroke-width="1.5"/>
          <text x="${(X(n.x) + X(c.x)) / 2 + (k ? 6 : -6)}" y="${(Y(n.depth) + Y(c.depth)) / 2}" font-size="9" text-anchor="${k ? 'start' : 'end'}" style="fill:var(--text-3)">${k ? 'no' : 'yes'}</text>`;
        walk(c);
      });
      const thr = scaler ? n.threshold * scaler.std[n.feature] + scaler.mean[n.feature] : n.threshold;
      s += `<rect x="${X(n.x) - 34}" y="${Y(n.depth) - 11}" width="68" height="22" rx="6" style="fill:var(--surface);stroke:var(--text-2)"/>
        <text x="${X(n.x)}" y="${Y(n.depth) + 4}" text-anchor="middle" font-size="10" font-family="JetBrains Mono, monospace" style="fill:var(--text)">${n.feature ? 'x₂' : 'x₁'} ≤ ${thr.toFixed(2)}</text>`;
    } else {
      s += `<circle cx="${X(n.x)}" cy="${Y(n.depth)}" r="10" fill="${CLASS_COLORS[n.cls]}"><title>${n.samples} samples · counts ${n.counts.join('/')} · gini ${n.gini}</title></circle>
        <text x="${X(n.x)}" y="${Y(n.depth) + 22}" text-anchor="middle" font-size="9" style="fill:var(--text-3)">${n.samples}</text>`;
    }
  };
  walk(tree);
  return `<div style="overflow-x:auto"><svg class="tree-svg" viewBox="0 0 ${W} ${H}" style="min-width:${Math.min(W, 900)}px">${s}</svg></div><p class="faint tiny" style="margin:4px 0 0">Leaves are coloured by the class they predict; numbers are training samples. Hover a leaf for its Gini impurity.</p>`;
}
