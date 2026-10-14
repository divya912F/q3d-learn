// Data Science lab: probability distributions and the Central Limit Theorem.
import { api } from '../api.js';
import { store } from '../store.js';
import { icon, toast, hydrateIcons } from '../ui.js';
import { binHistogram, niceNum } from '../charts.js';
import { controls, setLabContext, metric } from './kit.js';

export const meta = {
  howto: [
    'Distributions: pick a distribution and its parameters, then draw a sample.',
    'Compare the sample histogram with the theoretical curve — more samples, better match.',
    'Central Limit Theorem: draw many samples of size n and plot their MEANS.',
    'Even from a skewed distribution the means form a bell curve, narrowing like σ/√n.',
  ],
};

const DISTS = [['normal', 'Normal (bell)'], ['uniform', 'Uniform'], ['exponential', 'Exponential (skewed)'], ['binomial', 'Binomial (coin flips)'], ['dice', 'Fair die']];

export async function mount(root, { preset = {} } = {}) {
  const st = { mode: 'dist', dist: 'normal', mean: 2, std: 1, low: 0, high: 10, n: 500, bn: 10, p: 0.5, sample_size: 30, n_samples: 1000, seed: 0, ...preset };
  if (preset.mode === 'clt' && preset.dist === 'exponential' && preset.mean == null) st.mean = 2;
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <button class="btn btn-course btn-lg" data-go>${icon('dice')} Draw samples</button>
      <div class="card card-tight sticky small" data-tip></div></div>
    <div class="stack" style="min-width:0">
      <div class="card"><div class="card-head"><h3 data-title>${icon('chart')} Sample</h3></div><div data-main></div><div class="metrics" data-metrics style="margin-top:12px"></div></div>
      <div class="card" data-popcard hidden><div class="card-head"><h3>${icon('chart')} The population you are sampling from</h3></div><div data-pop></div></div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  const ctl = controls($('[data-ctl]'), [
    { type: 'seg', key: 'mode', label: 'Experiment', options: [['dist', 'Distributions'], ['clt', 'Central Limit Theorem']] },
    { type: 'select', key: 'dist', label: 'Distribution', options: DISTS },
    { type: 'slider', key: 'mean', label: 'Mean μ', min: -5, max: 10, step: 0.5, show: (s) => s.dist === 'normal' },
    { type: 'slider', key: 'std', label: 'Std σ', min: 0.2, max: 5, step: 0.1, fmt: (v) => v.toFixed(1), show: (s) => s.dist === 'normal' },
    { type: 'slider', key: 'mean', label: 'Mean (1/λ)', min: 0.5, max: 8, step: 0.5, show: (s) => s.dist === 'exponential' },
    { type: 'slider', key: 'low', label: 'Low', min: -5, max: 5, step: 1, show: (s) => s.dist === 'uniform' },
    { type: 'slider', key: 'high', label: 'High', min: 6, max: 20, step: 1, show: (s) => s.dist === 'uniform' },
    { type: 'slider', key: 'bn', label: 'Number of flips n', min: 1, max: 50, step: 1, show: (s) => s.dist === 'binomial' },
    { type: 'slider', key: 'p', label: 'P(heads) p', min: 0.05, max: 0.95, step: 0.05, fmt: (v) => v.toFixed(2), show: (s) => s.dist === 'binomial' },
    { type: 'slider', key: 'n', label: 'Sample size', min: 10, max: 10000, log: true, fmt: (v) => Math.round(v), show: (s) => s.mode === 'dist' },
    { type: 'slider', key: 'sample_size', label: 'n per sample (averaged)', min: 1, max: 200, step: 1, show: (s) => s.mode === 'clt' },
    { type: 'slider', key: 'n_samples', label: 'Number of samples', min: 50, max: 5000, step: 50, show: (s) => s.mode === 'clt' },
    { type: 'slider', key: 'seed', label: 'Random seed', min: 0, max: 50, step: 1 },
  ], st, (k, v, live) => {
    if (k === 'dist' && v === 'exponential' && st.mean < 0.5) { st.mean = 2; ctl.render(); }
    if (!live) go();
  });

  const params = () => (st.dist === 'normal' ? { mean: st.mean, std: st.std } : st.dist === 'uniform' ? { low: st.low, high: st.high }
    : st.dist === 'exponential' ? { mean: st.mean } : st.dist === 'binomial' ? { n: st.bn, p: st.p } : {});

  async function go() {
    try {
      $('[data-popcard]').hidden = st.mode !== 'clt';
      if (st.mode === 'dist') {
        const r = await api.lab('ds/sample', { dist: st.dist, params: params(), n: Math.round(st.n), seed: st.seed }, store.user?.id);
        $('[data-title]').innerHTML = `${icon('chart')} ${Math.round(st.n)} samples from the ${st.dist} distribution`;
        binHistogram($('[data-main]'), r, { height: 300, lines: [{ x: r.sample_mean, label: `sample mean ${niceNum(r.sample_mean)}`, color: 'var(--red)' }] });
        $('[data-metrics]').innerHTML = metric('Sample mean', niceNum(r.sample_mean)) + metric('Theory mean', niceNum(r.theory_mean)) + metric('Sample std', niceNum(r.sample_std)) + metric('Theory std', niceNum(r.theory_std));
        $('[data-tip]').textContent = r.curve_y ? 'The black curve is the theoretical density, scaled to your sample. Increase the sample size and watch the bars hug the curve (the law of large numbers).' : 'Discrete distribution: each bar is one possible value.';
        setLabContext('stats', 'Probability lab', [`Distribution ${st.dist} with parameters ${JSON.stringify(params())}`, `Sample of ${Math.round(st.n)}: mean ${r.sample_mean}, std ${r.sample_std}; theory mean ${r.theory_mean}, std ${r.theory_std}`]);
      } else {
        const r = await api.lab('ds/clt', { dist: st.dist, params: params(), sample_size: st.sample_size, n_samples: st.n_samples, seed: st.seed }, store.user?.id);
        $('[data-title]').innerHTML = `${icon('chart')} Means of ${st.n_samples} samples, each of size n = ${st.sample_size}`;
        binHistogram($('[data-main]'), r, { height: 300, color: 'var(--violet)', lines: [{ x: r.theory_mean, label: 'μ', color: 'var(--red)' }] });
        binHistogram($('[data-pop]'), r.population, { height: 170, color: 'var(--text-3)' });
        $('[data-metrics]').innerHTML = metric('Mean of means', niceNum(r.mean_of_means)) + metric('Population μ', niceNum(r.theory_mean))
          + metric('Std of means', niceNum(r.std_of_means)) + metric('Theory σ/√n', niceNum(r.theory_se));
        $('[data-tip]').textContent = `Even though the population is ${st.dist === 'exponential' ? 'heavily skewed' : st.dist}, the sample means form a bell curve (black). Increase n: the bell gets narrower like σ/√n.`;
        setLabContext('stats', 'Central Limit Theorem lab', [`Population: ${st.dist} ${JSON.stringify(params())}`, `${st.n_samples} samples of size n=${st.sample_size}`,
          `Mean of sample means ${r.mean_of_means} (population mean ${r.theory_mean})`, `Standard deviation of the sample means ${r.std_of_means}; theory σ/√n = ${r.theory_se}`]);
      }
    } catch (e) { toast(e.message, 'error'); }
  }
  $('[data-go]').addEventListener('click', () => { st.seed = (st.seed + 1) % 51; go(); });
  go();
  return { getConfig: () => ({ ...st }), destroy: () => {} };
}
