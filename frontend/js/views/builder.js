// Circuit Builder: palette + drag-and-drop editor + simulation results.
import { api } from '../api.js';
import { store } from '../store.js';
import { CircuitEditor, renderPalette } from '../circuit/editor.js';
import { ResultsPanel } from '../circuit/results.js';
import { esc, icon, toast, debounce } from '../ui.js';
import { openDrawer, openProfile } from '../main.js';

export function encodeCircuit(c) {
  const compact = { n: c.num_qubits, o: c.operations.map((o) => [o.name, o.qubits, o.params?.length ? o.params.map((p) => +p.toFixed(6)) : 0, o.col]) };
  return btoa(unescape(encodeURIComponent(JSON.stringify(compact)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeCircuit(s) {
  const json = decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
  const c = JSON.parse(json);
  return { num_qubits: c.n, operations: c.o.map(([name, qubits, params, col]) => ({ name, qubits, params: params || [], col })) };
}

export async function render(root, { query }) {
  if (query.get('c')) {
    try { store.set('circuit', decodeCircuit(query.get('c'))); toast('Loaded shared circuit', 'success'); } catch { toast('Invalid share link', 'error'); }
    history.replaceState(null, '', '#/c/quantum/lab/builder');
  }
  const algs = await api.algorithms().catch(() => []);
  root.innerHTML = `
    <div class="builder-toolbar">
      <div class="qcount" title="Number of qubits"><button data-qminus aria-label="Remove qubit">−</button><span data-qn></span><button data-qplus aria-label="Add qubit">+</button></div>
      <button class="icon-btn" data-undo title="Undo (Ctrl+Z)">${icon('undo')}</button>
      <button class="icon-btn" data-redo title="Redo (Ctrl+Y)">${icon('redo')}</button>
      <button class="icon-btn" data-clear title="Clear circuit">${icon('trash')}</button>
      <span class="sep"></span>
      <select class="input" data-example style="width:auto"><option value="">Load example…</option>${algs.map((a) => `<option value="${a.id}">${esc(a.title)}</option>`).join('')}</select>
      <select class="input" data-saved style="width:auto"><option value="">My circuits…</option></select>
      <button class="btn btn-ghost btn-sm" data-save>${icon('save')} Save</button>
      <button class="btn btn-ghost btn-sm" data-share>${icon('share')} Share</button>
      <span class="grow"></span>
      <label class="toggle" title="Re-run automatically after each edit"><input type="checkbox" data-auto checked> Auto-run</label>
      <select class="input" data-shots style="width:auto" title="Shots">${[100, 512, 1024, 4096, 8192].map((s) => `<option ${s === 1024 ? 'selected' : ''} value="${s}">${s} shots</option>`).join('')}</select>
      <select class="input" data-backend style="width:auto" title="Simulator backend">
        <option value="auto">Auto backend</option><option value="q3d">Q3D statevector</option><option value="qiskit">Qiskit Aer</option></select>
      <button class="btn btn-primary" data-run>${icon('play')} Run</button>
    </div>
    <div class="builder-layout">
      <div data-palette></div>
      <div style="min-width:0">
        <div data-circuit></div>
        <div class="results" data-results></div>
      </div>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const results = new ResultsPanel($('[data-results]'), {
    onAsk: () => openDrawer('Explain my circuit and its simulation results step by step.'),
    onApplyCode: (c) => editor.load(c.num_qubits, c.operations),
  });
  let running = false;

  const run = async () => {
    if (running) return;
    const circuit = editor.circuit;
    running = true;
    $('[data-run]').disabled = true;
    try {
      const res = await api.simulate(circuit, {
        shots: +$('[data-shots]').value, backend: $('[data-backend]').value, user_id: store.user?.id,
      });
      store.lastResult = res;
      results.show(res);
    } catch (e) {
      toast(e.message, 'error', 6000);
    } finally {
      running = false;
      $('[data-run]').disabled = false;
    }
  };
  const autoRun = debounce(() => { if ($('[data-auto]').checked) run(); }, 350);

  const editor = new CircuitEditor($('[data-circuit]'), {
    numQubits: store.circuit.num_qubits,
    operations: store.circuit.operations,
    onChange: (c) => {
      store.set('circuit', c);
      $('[data-qn]').textContent = `${c.num_qubits} qubit${c.num_qubits > 1 ? 's' : ''}`;
      autoRun();
    },
  });
  results.editor = editor;
  renderPalette($('[data-palette]'), editor);
  $('[data-qn]').textContent = `${editor.n} qubit${editor.n > 1 ? 's' : ''}`;

  $('[data-qplus]').addEventListener('click', () => editor.setQubits(editor.n + 1));
  $('[data-qminus]').addEventListener('click', () => editor.setQubits(editor.n - 1));
  $('[data-undo]').addEventListener('click', () => editor.undo());
  $('[data-redo]').addEventListener('click', () => editor.redo());
  $('[data-clear]').addEventListener('click', () => editor.clear());
  $('[data-run]').addEventListener('click', run);
  $('[data-example]').addEventListener('change', async (e) => {
    if (!e.target.value) return;
    const a = await api.algorithm(e.target.value);
    editor.load(a.num_qubits, a.operations);
    toast(`${esc(a.title)}: ${esc(a.summary)}`, 'info', 4000);
    e.target.value = '';
  });
  $('[data-share]').addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}#/c/quantum/lab/builder?c=${encodeCircuit(editor.circuit)}`;
    try { await navigator.clipboard.writeText(url); toast('Share link copied to clipboard', 'success'); } catch { prompt('Copy this link:', url); }
  });

  async function refreshSaved() {
    const sel = $('[data-saved]');
    if (!store.user) return;
    try {
      const list = await api.circuits(store.user.id);
      sel.innerHTML = `<option value="">My circuits (${list.length})…</option>` + list.map((c) => `<option value="${c.id}">${esc(c.title)} · ${c.num_qubits}q</option>`).join('');
      sel.onchange = () => {
        const c = list.find((x) => String(x.id) === sel.value);
        if (c) editor.load(c.num_qubits, c.operations);
        sel.value = '';
      };
    } catch { /* ignore */ }
  }
  refreshSaved();
  $('[data-save]').addEventListener('click', async () => {
    if (!store.user) { toast('Create a profile to save circuits.', 'info'); openProfile(); return; }
    const title = prompt('Name this circuit:', 'My circuit');
    if (!title) return;
    try {
      await api.saveCircuit({ ...editor.circuit, user_id: store.user.id, title });
      toast('Circuit saved', 'success');
      refreshSaved();
    } catch (e) { toast(e.message, 'error'); }
  });

  if (editor.ops.length) run();
  else results.renderEmpty();

  return () => { editor.destroy(); results.destroy(); };
}
