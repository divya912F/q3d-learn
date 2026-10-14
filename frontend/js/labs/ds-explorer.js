// Data Science lab: dataset explorer — table, summary statistics, histogram, scatter, correlation, groups.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, cssVar, CLASS_COLORS, hydrateIcons } from '../ui.js';
import { binHistogram, heatMatrix, hbars, niceNum } from '../charts.js';
import { Plot, frame, drawAxes, dot, setLabContext } from './kit.js';

export const meta = {
  howto: [
    'Pick a dataset and skim the raw table — what does one row represent?',
    'Read the summary statistics: compare mean vs. median, look for missing values.',
    'Plot a histogram to see the shape (skew, outliers).',
    'Scatter two columns, colour by a category and check the trend line r.',
    'Use the correlation heatmap to find the strongest relationships — click a cell to plot it.',
  ],
};

const TABS = [['table', 'Data & summary'], ['dist', 'Distribution'], ['scatter', 'Relationships'], ['corr', 'Correlation heatmap'], ['group', 'Compare groups']];

export async function mount(root, { preset = {} } = {}) {
  const st = { dataset: 'students', x: null, y: null, color: null, hist: null, bins: 20, tab: 'table', ...preset };
  const { datasets } = await api.get('/api/ds/datasets');
  let res = null;
  root.innerHTML = `
    <div class="card" style="margin-bottom:16px"><div class="row-between">
      <div class="row"><label class="field" style="min-width:230px">Dataset<select class="input" data-ds>${datasets.map((d) => `<option value="${d.id}" ${d.id === st.dataset ? 'selected' : ''}>${esc(d.title)} · ${d.rows} rows</option>`).join('')}</select></label>
      <p class="muted small" style="margin:18px 0 0;max-width:60ch" data-desc></p></div>
    </div></div>
    <div class="tabs" data-tabs style="margin-bottom:14px">${TABS.map(([k, l]) => `<button class="tab ${k === st.tab ? 'active' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
    <div data-body></div>`;
  const $ = (s) => root.querySelector(s);
  let plot = null;

  async function load() {
    try {
      res = await api.lab('ds/explore', { dataset: st.dataset, x: st.x, y: st.y, color: st.color, hist: st.hist, bins: st.bins }, store.user?.id);
      st.x = res.x; st.y = res.y; st.hist = res.hist_col; st.color = res.color;
      $('[data-desc]').textContent = res.info;
      render();
      context();
    } catch (e) { toast(e.message, 'error'); }
  }

  function context() {
    const target = res.describe.find((d) => d.column === res.y);
    const corr = res.correlation;
    const facts = [`Dataset “${st.dataset}”: ${res.preview.total} rows, columns ${res.preview.columns.join(', ')}`];
    if (target?.type === 'numeric') facts.push(`${target.column}: mean ${target.mean}, median ${target.median}, std ${target.std}, min ${target.min}, max ${target.max}`);
    if (res.scatter?.fit) facts.push(`Scatter ${res.x} vs ${res.y}: Pearson r = ${res.scatter.fit.r}, trend line slope ${res.scatter.fit.slope}`);
    const yi = corr.columns.indexOf(res.y);
    if (yi >= 0) facts.push(`Correlations with ${res.y}: ${corr.columns.map((c, j) => (c === res.y ? null : `${c} ${corr.matrix[yi][j]}`)).filter(Boolean).join(', ')}`);
    if (res.histogram) facts.push(`Histogram of ${res.hist_col}: mean ${res.histogram.mean}, median ${res.histogram.median}`);
    if (res.group) facts.push(`Average ${res.group.value} by ${res.group.by}: ${res.group.rows.map((r) => `${r.group} ${r.mean}`).join(', ')}`);
    const missing = res.describe.filter((d) => d.missing).map((d) => `${d.column} (${d.missing})`);
    if (missing.length) facts.push(`Missing values: ${missing.join(', ')}`);
    setLabContext('explorer', 'Data explorer', facts);
  }

  const colOptions = (cols, val, none = false) => (none ? '<option value="">— none —</option>' : '') + cols.map((c) => `<option ${c === val ? 'selected' : ''}>${esc(c)}</option>`).join('');

  function render() {
    plot?.dispose(); plot = null;
    const body = $('[data-body]');
    if (st.tab === 'table') {
      body.innerHTML = `<div class="grid" style="grid-template-columns:minmax(0,1fr)">
        <div class="card"><div class="card-head"><h3>${icon('table')} First rows</h3><span class="faint small">${res.preview.total} rows × ${res.preview.columns.length} columns</span></div>
          <div class="table-wrap"><table class="data-table"><thead><tr>${res.preview.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>
          ${res.preview.rows.map((r) => `<tr>${r.map((v) => (v == null ? '<td class="miss">missing</td>' : `<td>${esc(typeof v === 'boolean' ? String(v) : v)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div></div>
        <div class="card"><div class="card-head"><h3>${icon('notebook')} Summary statistics</h3><span class="margin-note">mean ≠ median? → skewed!</span></div>
          <div class="table-wrap"><table class="data-table"><thead><tr><th>column</th><th>type</th><th>count</th><th>missing</th><th>mean</th><th>std</th><th>min</th><th>Q1</th><th>median</th><th>Q3</th><th>max</th><th>top / unique</th></tr></thead><tbody>
          ${res.describe.map((d) => `<tr><td><b>${esc(d.column)}</b></td><td>${d.type}</td><td>${d.count}</td><td class="${d.missing ? 'miss' : ''}">${d.missing}</td>${d.type === 'numeric'
            ? `<td>${d.mean}</td><td>${d.std}</td><td>${d.min}</td><td>${d.q1}</td><td>${d.median}</td><td>${d.q3}</td><td>${d.max}</td><td></td>`
            : `<td colspan="7" class="faint">—</td><td>${esc(d.top ?? '')} · ${d.unique} unique</td>`}</tr>`).join('')}</tbody></table></div></div></div>`;
    }
    if (st.tab === 'dist') {
      const d = res.describe.find((x) => x.column === st.hist);
      body.innerHTML = `<div class="lab-grid"><div class="card controls">
          <label class="field">Column<select class="input" data-hist>${colOptions(res.numeric, st.hist)}</select></label>
          <label class="field">Bins: <span class="mono" data-binv>${st.bins}</span><input type="range" min="5" max="50" value="${st.bins}" data-bins></label>
          ${d ? `<div class="metrics">${['mean', 'median', 'std', 'skew'].map((k) => `<div class="metric"><small>${k}</small><b>${d[k]}</b></div>`).join('')}</div>
          <p class="small muted" style="margin:0">${Math.abs(d.skew) < 0.3 ? 'Roughly symmetric.' : d.skew > 0 ? 'Right-skewed: a long tail of large values pulls the mean above the median.' : 'Left-skewed: the mean is below the median.'}</p>` : ''}
        </div><div class="card"><div class="card-head"><h3>${icon('chart')} Histogram of ${esc(st.hist)}</h3></div><div data-h></div></div></div>`;
      if (res.histogram) binHistogram(body.querySelector('[data-h]'), res.histogram, { height: 320, xLabel: st.hist,
        lines: [{ x: res.histogram.mean, label: 'mean', color: 'var(--red)' }, { x: res.histogram.median, label: 'median', color: 'var(--violet)', dy: 14 }] });
      body.querySelector('[data-hist]').onchange = (e) => { st.hist = e.target.value; load(); };
      const bins = body.querySelector('[data-bins]');
      bins.oninput = () => { body.querySelector('[data-binv]').textContent = bins.value; };
      bins.onchange = () => { st.bins = +bins.value; load(); };
    }
    if (st.tab === 'scatter') {
      body.innerHTML = `<div class="lab-grid"><div class="card controls">
          <label class="field">x axis<select class="input" data-x>${colOptions(res.numeric, st.x)}</select></label>
          <label class="field">y axis<select class="input" data-y>${colOptions(res.numeric, st.y)}</select></label>
          <label class="field">colour by<select class="input" data-c>${colOptions(res.categorical, st.color, true)}</select></label>
          ${res.scatter?.fit ? `<div class="metrics"><div class="metric ${Math.abs(res.scatter.fit.r) > 0.5 ? 'good' : ''}"><small>Pearson r</small><b>${res.scatter.fit.r}</b></div><div class="metric"><small>slope</small><b>${niceNum(res.scatter.fit.slope)}</b></div></div>
          <p class="small muted" style="margin:0">${strength(res.scatter.fit.r)}</p>` : ''}
          <div class="legend" data-leg></div>
        </div><div class="card"><div class="card-head"><h3>${icon('trend')} ${esc(st.y)} vs ${esc(st.x)}</h3></div><div class="graph-paper" data-sc></div></div></div>`;
      plot = new Plot(body.querySelector('[data-sc]'), { aspect: 0.62 });
      const cats = [...new Set(res.scatter.points.map((p) => p[2]).filter((c) => c != null))];
      body.querySelector('[data-leg]').innerHTML = cats.map((c, i) => `<span><i style="background:${CLASS_COLORS[i % 10]}"></i>${esc(c)}</span>`).join('');
      plot.draw((ctx, w, h) => {
        const pts = res.scatter.points;
        const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
        const px = (Math.max(...xs) - Math.min(...xs)) * 0.05 || 1, py = (Math.max(...ys) - Math.min(...ys)) * 0.08 || 1;
        const f = frame([Math.min(...xs) - px, Math.max(...xs) + px, Math.min(...ys) - py, Math.max(...ys) + py], w, h, 40);
        drawAxes(ctx, f, w, h, { xLabel: st.x, yLabel: st.y });
        pts.forEach((p) => dot(ctx, f.sx(p[0]), f.sy(p[1]), 3.6, p[2] != null ? CLASS_COLORS[cats.indexOf(p[2]) % 10] : cssVar('--course'), null));
        const fit = res.scatter.fit;
        if (fit) {
          const [x0, x1] = [f.extent[0], f.extent[1]];
          ctx.strokeStyle = cssVar('--text');
          ctx.lineWidth = 2;
          ctx.setLineDash([7, 5]);
          ctx.beginPath(); ctx.moveTo(f.sx(x0), f.sy(fit.intercept + fit.slope * x0)); ctx.lineTo(f.sx(x1), f.sy(fit.intercept + fit.slope * x1)); ctx.stroke();
          ctx.setLineDash([]);
        }
      });
      body.querySelector('[data-x]').onchange = (e) => { st.x = e.target.value; load(); };
      body.querySelector('[data-y]').onchange = (e) => { st.y = e.target.value; load(); };
      body.querySelector('[data-c]').onchange = (e) => { st.color = e.target.value || null; load(); };
    }
    if (st.tab === 'corr') {
      body.innerHTML = `<div class="card"><div class="card-head"><h3>${icon('grid')} Correlation heatmap (Pearson r)</h3><div class="legend"><span><i style="background:#3b5bdb"></i>negative</span><span><i style="background:#e8590c"></i>positive</span></div></div>
        <div data-hm style="overflow-x:auto"></div><p class="faint small" style="margin:10px 0 0">Click any cell to open that pair in the scatter plot. Remember: correlation is not causation!</p></div>`;
      const c = res.correlation;
      heatMatrix(body.querySelector('[data-hm]'), c.columns, c.columns, c.matrix, { max: 1, onClick: (i, j) => { st.x = c.columns[j]; st.y = c.columns[i]; st.tab = 'scatter'; syncTabs(); load(); } });
    }
    if (st.tab === 'group') {
      if (!res.group) { body.innerHTML = '<div class="card empty">This dataset has no categorical column to group by.</div>'; return; }
      body.innerHTML = `<div class="lab-grid"><div class="card controls">
          <label class="field">group by<select class="input" data-gb>${colOptions(res.categorical, res.group.by)}</select></label>
          <label class="field">average of<select class="input" data-gv>${colOptions(res.numeric, res.group.value)}</select></label>
        </div><div class="card"><div class="card-head"><h3>${icon('chart')} Average ${esc(res.group.value)} by ${esc(res.group.by)}</h3></div><div data-gbars></div></div></div>`;
      hbars(body.querySelector('[data-gbars]'), res.group.rows.map((r, i) => ({ label: r.group, value: r.mean, note: `n=${r.count}`, color: CLASS_COLORS[i % 10] })));
      body.querySelector('[data-gb]').onchange = (e) => { st.color = e.target.value; load(); };
      body.querySelector('[data-gv]').onchange = (e) => { st.y = e.target.value; load(); };
    }
    hydrateIcons(body);
  }

  function strength(r) {
    const a = Math.abs(r);
    const s = a > 0.7 ? 'strong' : a > 0.4 ? 'moderate' : a > 0.15 ? 'weak' : 'almost no';
    return `${s[0].toUpperCase() + s.slice(1)} ${r > 0 ? 'positive' : 'negative'} linear relationship.`;
  }
  function syncTabs() { $('[data-tabs]').querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.t === st.tab)); }
  $('[data-tabs]').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b) return; st.tab = b.dataset.t; syncTabs(); render(); });
  $('[data-ds]').addEventListener('change', (e) => { st.dataset = e.target.value; st.x = st.y = st.hist = st.color = null; load(); });
  await load();
  return { getConfig: () => ({ ...st }), destroy: () => plot?.dispose() };
}
