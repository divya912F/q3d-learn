// Algorithm library: guided, step-by-step walkthroughs of famous quantum algorithms.
import { api } from '../api.js';
import { store } from '../store.js';
import { CircuitEditor, sortOps } from '../circuit/editor.js';
import { ResultsPanel } from '../circuit/results.js';
import { esc, icon, setRangeFill, hydrateIcons } from '../ui.js';
import { navigate, openDrawer, loadIntoBuilder } from '../main.js';

const LEVEL = { Beginner: 'green', Intermediate: 'amber', Advanced: 'pink' };

export async function render(root, { params }) {
  const algs = await api.algorithms();
  if (!params[0]) {
    root.innerHTML = `<div style="margin-bottom:18px"><h2 style="margin:0">Algorithm Library</h2><p class="muted" style="margin:4px 0 0">Step through landmark quantum algorithms gate by gate — watch the state, the Bloch spheres and the Q-sphere evolve.</p></div>
      <div class="grid ch-grid">${algs.map((a) => `<div class="card alg-card" data-id="${a.id}" tabindex="0">
        <div class="row" style="gap:6px;margin-bottom:10px"><span class="chip ${LEVEL[a.level]}">${a.level}</span><span class="chip gray">${esc(a.category)}</span><span class="chip gray">${a.num_qubits} qubits</span></div>
        <h3>${esc(a.title)}</h3><p class="muted small">${esc(a.summary)}</p>
        <div class="faint tiny">Expected: <span class="mono">${esc(a.expected)}</span></div></div>`).join('')}</div>`;
    root.querySelectorAll('[data-id]').forEach((c) => {
      c.addEventListener('click', () => navigate(`/c/quantum/lab/algorithms/${c.dataset.id}`));
      c.addEventListener('keydown', (e) => { if (e.key === 'Enter') navigate(`/c/quantum/lab/algorithms/${c.dataset.id}`); });
    });
    return undefined;
  }

  const a = await api.algorithm(params[0]).catch(() => null);
  if (!a) { navigate('/c/quantum/lab/algorithms'); return undefined; }
  root.innerHTML = `
    <div class="row" style="margin-bottom:14px"><a href="#/c/quantum/lab/algorithms" class="btn btn-ghost btn-sm">← All algorithms</a></div>
    <div class="alg-layout">
      <div class="stack">
        <div class="card">
          <div class="row" style="gap:6px;margin-bottom:10px"><span class="chip ${LEVEL[a.level]}">${a.level}</span><span class="chip gray">${esc(a.category)}</span></div>
          <h2>${esc(a.title)}</h2><p class="muted">${esc(a.summary)}</p>
          <div class="target-box"><div class="faint tiny">EXPECTED OUTCOME</div><div class="mono">${esc(a.expected)}</div></div>
          <div class="row" style="margin-top:14px">
            <button class="btn btn-primary btn-sm" data-open>${icon('circuit')} Open in builder</button>
            <button class="btn btn-ghost btn-sm" data-ask>${icon('bot')} Ask Q-Bot</button>
          </div>
        </div>
        <div class="stack" data-steps>${a.steps.map((s, i) => `<div class="alg-step" data-algstep="${i}"><b><span class="n">${i + 1}</span>${esc(s.title)}</b><p>${esc(s.text)}</p></div>`).join('')}</div>
      </div>
      <div style="min-width:0">
        <div data-circuit></div>
        <div class="results" data-results></div>
      </div>
    </div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  const editor = new CircuitEditor($('[data-circuit]'), { numQubits: a.num_qubits, operations: a.operations, readOnly: true });
  const results = new ResultsPanel($('[data-results]'), {
    editor, showCode: true,
    onAsk: () => { store.set('circuit', editor.circuit); openDrawer(`Explain how the ${a.title} circuit works and why it gives this result.`); },
  });
  const res = await api.simulate(editor.circuit, { shots: 1024 });
  results.show(res);
  store.lastResult = res;

  const sorted = sortOps(editor.ops);
  root.querySelectorAll("[data-algstep]").forEach((el) => el.addEventListener('click', () => {
    root.querySelectorAll("[data-algstep]").forEach((x) => x.classList.toggle('active', x === el));
    const st = a.steps[+el.dataset.algstep];
    const maxCol = Math.max(...st.cols);
    const k = sorted.filter((o) => o.col <= maxCol).length; // slider index after these ops
    const slider = root.querySelector('[data-results] [data-step]');
    if (slider) { slider.value = Math.min(k, +slider.max); setRangeFill(slider); slider.dispatchEvent(new Event('input')); }
  }));
  $('[data-open]').addEventListener('click', () => loadIntoBuilder(a.num_qubits, a.operations, a.title));
  $('[data-ask]').addEventListener('click', () => { store.set('circuit', editor.circuit); openDrawer(`Walk me through the ${a.title} algorithm step by step.`); });

  return () => { editor.destroy(); results.destroy(); };
}
