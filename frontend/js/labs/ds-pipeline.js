// Data Science lab: build a cleaning pipeline step by step and watch data quality improve.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, debounce, hydrateIcons } from '../ui.js';
import { binHistogram } from '../charts.js';
import { setLabContext } from './kit.js';

export const meta = {
  howto: [
    'Look at the scoreboard: how many missing values, duplicates and outliers does the raw data have?',
    'Add cleaning steps from the toolbox; each runs in order, top to bottom.',
    'Set each step’s column and options; re-order or delete steps freely.',
    'Watch rows, missing values and outliers change after every step.',
    'Compare the histogram before and after — and don’t throw away too much data!',
  ],
};

const DEFAULTS = {
  drop_duplicates: {}, drop_missing: { column: '*' }, fill_missing: { column: '*', strategy: 'median' },
  remove_outliers: { column: '*', z: 3 }, clip_range: { column: 'hours_studied', min: 0, max: 24 },
  standardize: { column: '*' }, normalize: { column: '*' }, drop_column: { column: '' }, filter: { column: '', op: '>=', value: 0 },
};

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { dataset: 'dirty_students', steps: [], focus: 'hours_studied', ...preset };
  st.steps = (st.steps || []).map((s) => ({ ...s }));
  const { datasets, steps: stepTypes } = await api.get('/api/ds/datasets');
  let res = null;
  root.innerHTML = `<div class="lab-grid three">
    <div class="stack">
      <div class="card controls">
        <label class="field ${lock.includes('dataset') ? 'locked' : ''}">Dataset<select class="input" data-ds ${lock.includes('dataset') ? 'disabled' : ''}>${datasets.map((d) => `<option value="${d.id}" ${d.id === st.dataset ? 'selected' : ''}>${esc(d.title)}</option>`).join('')}</select></label>
      </div>
      <div class="card"><div class="card-head"><h3>${icon('pencil')} Toolbox</h3></div>
        <div class="step-palette">${Object.entries(stepTypes).map(([k, l]) => `<button data-add="${k}">＋ ${esc(l)}</button>`).join('')}</div></div>
    </div>
    <div class="stack" style="min-width:0">
      <div class="card"><div class="card-head"><h3>${icon('layers')} Your pipeline</h3><button class="btn btn-ghost btn-sm" data-clear>${icon('trash')} Clear</button></div>
        <div class="stack" style="gap:8px" data-steps></div></div>
      <div class="card"><div class="card-head"><h3>${icon('chart')} Before vs. after</h3><select class="input" data-focus style="width:auto"></select></div>
        <div class="grid" style="grid-template-columns:1fr 1fr"><div><div class="faint small">Raw data</div><div data-hb></div></div><div><div class="faint small">After cleaning</div><div data-ha></div></div></div></div>
      <div class="card"><div class="card-head"><h3>${icon('table')} Cleaned data (first rows)</h3><span class="faint small" data-rows></span></div><div class="table-wrap" data-prev></div></div>
    </div>
    <div class="stack">
      <div class="card"><div class="card-head"><h3>Data quality</h3></div><div class="quality" data-q></div><div class="small" style="margin-top:10px" data-kept></div></div>
      <div class="card"><div class="card-head"><h3>Step-by-step log</h3></div><div class="stack" style="gap:6px" data-trace></div></div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  let columns = [];

  function paramInputs(s, i) {
    const colSel = (allowAll = true) => `<select class="input" data-p="column" data-i="${i}">${allowAll ? `<option value="*" ${s.column === '*' ? 'selected' : ''}>all columns</option>` : '<option value="">choose…</option>'}${columns.map((c) => `<option ${c === s.column ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>`;
    switch (s.type) {
      case 'drop_missing': case 'standardize': case 'normalize': return colSel();
      case 'fill_missing': return `${colSel()}<select class="input" data-p="strategy" data-i="${i}">${['median', 'mean', 'mode'].map((x) => `<option ${x === s.strategy ? 'selected' : ''}>${x}</option>`).join('')}</select>`;
      case 'remove_outliers': return `${colSel()}<span class="small">|z| &gt;</span><input class="input mono" style="width:70px" type="number" step="0.5" min="1" data-p="z" data-i="${i}" value="${s.z}">`;
      case 'clip_range': return `${colSel(false)}<span class="small">keep</span><input class="input mono" style="width:80px" type="number" data-p="min" data-i="${i}" value="${s.min}"><span class="small">to</span><input class="input mono" style="width:80px" type="number" data-p="max" data-i="${i}" value="${s.max}">`;
      case 'drop_column': return colSel(false);
      case 'filter': return `${colSel(false)}<select class="input" data-p="op" data-i="${i}">${['>=', '<=', '>', '<', '==', '!='].map((x) => `<option ${x === s.op ? 'selected' : ''}>${x}</option>`).join('')}</select><input class="input mono" style="width:100px" data-p="value" data-i="${i}" value="${esc(s.value)}">`;
      default: return '';
    }
  }

  function renderSteps() {
    const box = $('[data-steps]');
    if (!st.steps.length) { box.innerHTML = '<div class="empty small">No steps yet — add one from the toolbox. <br><span class="hand" style="font-size:1.2rem">hint: start with “Remove duplicate rows”</span></div>'; return; }
    box.innerHTML = st.steps.map((s, i) => `<div class="pipe-step ${res?.error?.index === i ? 'err' : ''}"><span class="n">${i + 1}</span>
      <div><b class="small">${esc(stepTypes[s.type])}</b><div class="params">${paramInputs(s, i)}</div>
      ${res?.trace?.[i + 1] ? `<div class="faint tiny" style="margin-top:4px">→ ${esc(res.trace[i + 1].label)}</div>` : ''}
      ${res?.error?.index === i ? `<div class="tiny" style="color:var(--red);margin-top:4px">${esc(res.error.message)}</div>` : ''}</div>
      <div class="row" style="gap:4px;flex-wrap:nowrap"><button class="icon-btn" style="width:28px;height:28px" data-up="${i}" title="Move up" ${i ? '' : 'disabled'}>↑</button>
      <button class="icon-btn" style="width:28px;height:28px" data-down="${i}" title="Move down" ${i < st.steps.length - 1 ? '' : 'disabled'}>↓</button>
      <button class="icon-btn" style="width:28px;height:28px" data-del="${i}" title="Remove">${icon('x')}</button></div></div>`).join('');
  }

  function renderResults() {
    const b = res.before, a = res.after;
    const cell = (label, k, goodDown = true) => {
      const d = a[k] - b[k];
      const good = goodDown ? d < 0 : d > 0;
      return `<div><small>${label}</small><b>${a[k]}</b><span class="delta" style="color:${d === 0 ? 'var(--text-3)' : good ? 'var(--green)' : 'var(--red)'}">${d > 0 ? '+' : ''}${d}</span></div>`;
    };
    $('[data-q]').innerHTML = cell('Rows', 'rows', false) + cell('Missing', 'missing') + cell('Duplicates', 'duplicates') + cell('Outliers', 'outliers');
    const kept = res.kept_fraction;
    $('[data-kept]').innerHTML = `<div class="row-between"><span>Rows kept</span><b class="mono">${(kept * 100).toFixed(0)}%</b></div><div class="progress" style="margin-top:6px"><span style="width:${kept * 100}%;background:${kept >= 0.85 ? 'var(--green)' : 'var(--amber)'}"></span></div>`;
    $('[data-trace]').innerHTML = res.trace.map((t, i) => `<div class="row" style="gap:8px;flex-wrap:nowrap;font-size:.8rem"><span class="chip ${i ? '' : 'gray'}" style="min-width:26px;justify-content:center">${i || '·'}</span><span class="grow">${esc(t.label)}</span><span class="mono faint">${t.rows}r · ${t.missing}m</span></div>`).join('');
    const focusSel = $('[data-focus]');
    const numericCols = res.describe.filter((d) => d.type === 'numeric').map((d) => d.column);
    focusSel.innerHTML = numericCols.map((c) => `<option ${c === res.focus ? 'selected' : ''}>${esc(c)}</option>`).join('');
    if (res.hist_before) binHistogram($('[data-hb]'), res.hist_before, { height: 200, color: 'var(--text-3)', lines: [{ x: res.hist_before.mean, label: 'mean', color: 'var(--red)' }] });
    if (res.hist_after) binHistogram($('[data-ha]'), res.hist_after, { height: 200, lines: [{ x: res.hist_after.mean, label: 'mean', color: 'var(--red)' }] });
    else $('[data-ha]').innerHTML = '<div class="empty small">Column was dropped.</div>';
    $('[data-rows]').textContent = `${res.after.rows} rows × ${res.after.columns} columns`;
    $('[data-prev]').innerHTML = `<table class="data-table"><thead><tr>${res.preview.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${res.preview.rows.map((r) => `<tr>${r.map((v) => (v == null ? '<td class="miss">missing</td>' : `<td>${esc(String(v))}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    setLabContext('pipeline', 'Cleaning pipeline', [
      `Dataset ${st.dataset}: raw ${b.rows} rows, ${b.missing} missing values, ${b.duplicates} duplicate rows, ${b.outliers} values with |z|>3`,
      `Pipeline: ${st.steps.length ? st.steps.map((s) => s.type + (s.column && s.column !== '*' ? `(${s.column})` : '')).join(' → ') : 'empty'}`,
      `After cleaning: ${a.rows} rows (${(kept * 100).toFixed(0)}% kept), ${a.missing} missing, ${a.duplicates} duplicates, ${a.outliers} outliers`,
      res.error ? `Step ${res.error.index + 1} failed: ${res.error.message}` : '',
    ]);
  }

  const run = debounce(async () => {
    try {
      res = await api.lab('ds/pipeline', { dataset: st.dataset, steps: st.steps, focus: st.focus }, store.user?.id);
      columns = res.trace.length ? (await colsOf()) : columns;
      renderSteps();
      renderResults();
    } catch (e) { toast(e.message, 'error'); }
  }, 250);

  let rawCols = null;
  async function colsOf() {
    if (!rawCols || rawCols.ds !== st.dataset) {
      const raw = await api.lab('ds/pipeline', { dataset: st.dataset, steps: [] });
      rawCols = { ds: st.dataset, cols: raw.columns };
    }
    return rawCols.cols;
  }

  root.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.add) {
      const s = { type: t.dataset.add, ...DEFAULTS[t.dataset.add] };
      if ((s.type === 'drop_column' || s.type === 'filter') && columns.length) s.column = columns[0];
      st.steps.push(s);
    } else if (t.dataset.del != null) st.steps.splice(+t.dataset.del, 1);
    else if (t.dataset.up != null) { const i = +t.dataset.up; [st.steps[i - 1], st.steps[i]] = [st.steps[i], st.steps[i - 1]]; }
    else if (t.dataset.down != null) { const i = +t.dataset.down; [st.steps[i + 1], st.steps[i]] = [st.steps[i], st.steps[i + 1]]; }
    else if (t.dataset.clear != null) st.steps = [];
    else return;
    renderSteps();
    run();
  });
  root.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.p) {
      const s = st.steps[+el.dataset.i];
      s[el.dataset.p] = el.type === 'number' ? +el.value : el.value;
      run();
    } else if (el.matches('[data-ds]')) { st.dataset = el.value; st.steps = []; renderSteps(); run(); }
    else if (el.matches('[data-focus]')) { st.focus = el.value; run(); }
  });
  columns = await colsOf();
  renderSteps();
  run();
  return { getConfig: () => ({ dataset: st.dataset, steps: st.steps.map((s) => ({ ...s })) }), destroy: () => {} };
}
