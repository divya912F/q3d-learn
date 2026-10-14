// Simulation results panel: histogram, state vector, amplitude circles, per-qubit Bloch spheres,
// Q-sphere, step-through slider and code export.
import { api } from '../api.js';
import { histogram, amplitudeCircles } from '../charts.js';
import { BlochSphere } from '../three/bloch.js';
import { QSphere } from '../three/qsphere.js';
import { esc, icon, fmtComplex, phaseColor, setRangeFill, toast, hydrateIcons } from '../ui.js';
import { store } from '../store.js';
import { loadCodeEditor } from './code.js';

const TABS = [
  ['hist', 'Measurement'],
  ['sv', 'State vector'],
  ['amp', 'Amplitudes'],
  ['bloch', 'Bloch spheres'],
  ['qsphere', 'Q-Sphere'],
  ['code', 'Code'],
];

export class ResultsPanel {
  constructor(root, { editor = null, onAsk = null, showCode = true, onApplyCode = null } = {}) {
    this.root = root;
    this.editor = editor;
    this.onAsk = onAsk;
    this.onApplyCode = onApplyCode;
    this.tabs = TABS.filter(([k]) => showCode || k !== 'code');
    this.tab = 'hist';
    this.spheres = [];
    this.qsphere = null;
    this.result = null;
    this.step = null;
    this.renderEmpty();
  }

  renderEmpty() {
    this.root.innerHTML = `<div class="card empty"><i data-icon="play"></i><div>Run the circuit to see measurement results, the state vector and 3D Bloch spheres.</div></div>`;
    hydrateIcons(this.root);
  }

  show(result) {
    this.disposeScenes();
    this.result = result;
    const steps = result.steps || [];
    this.step = steps.length ? steps.length - 1 : null;
    const a = result.analysis;
    const kindChip = { entangled: 'pink', superposition: 'violet', basis: 'green' }[a.kind] || 'gray';
    this.root.innerHTML = `
      <div class="card">
        <div class="row-between">
          <div>
            <div class="row" style="gap:10px"><h3 style="margin:0">${esc(a.name)}</h3><span class="chip ${kindChip}">${esc(a.kind)}</span></div>
            <div class="muted small" style="margin-top:4px">${esc(a.description)}</div>
          </div>
          ${this.onAsk ? `<button class="btn btn-violet btn-sm" data-ask>${icon('bot')} Explain with AI</button>` : ''}
        </div>
        <div class="state-big ket" style="margin-top:12px" data-ket>${esc(a.ket)}</div>
        <div class="summary-chips">
          <span class="chip">${result.num_qubits} qubit${result.num_qubits > 1 ? 's' : ''}</span>
          <span class="chip gray">depth ${result.depth}</span>
          <span class="chip gray">${result.gate_count} ops</span>
          <span class="chip gray">${result.shots} shots</span>
          <span class="chip ${result.backend_used === 'qiskit-aer' ? 'green' : 'gray'}" title="${esc(result.engine)}">${result.backend_used === 'qiskit-aer' ? 'Qiskit Aer' : 'Q3D engine'}</span>
          <span class="chip gray">${result.execution_time_ms} ms</span>
          ${result.entanglement.entangled ? `<span class="chip pink">entangled: ${result.entanglement.qubits.map((q) => `q${q}`).join(' ')}</span>` : ''}
          ${result.mode === 'trajectory' ? '<span class="chip amber">mid-circuit measurement</span>' : ''}
        </div>
        ${result.warnings?.length ? `<ul class="warn-list">${result.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
        ${steps.length > 1 ? `
          <div class="step-bar">
            <button class="icon-btn" data-prev title="Previous step">${icon('undo')}</button>
            <input type="range" min="0" max="${steps.length - 1}" value="${steps.length - 1}" data-step aria-label="Step through the circuit">
            <button class="icon-btn" data-next title="Next step">${icon('redo')}</button>
            <button class="icon-btn" data-playsteps title="Animate all steps">${icon('play')}</button>
            <span class="lbl" data-steplabel></span>
          </div>` : ''}
      </div>
      <div class="card" style="margin-top:16px">
        <div class="tabs" role="tablist">${this.tabs.map(([k, l]) => `<button class="tab${k === this.tab ? ' active' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
        <div data-tabbody style="margin-top:16px"></div>
      </div>`;
    this.root.querySelector('[data-ask]')?.addEventListener('click', () => this.onAsk?.(result));
    this.root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
      this.tab = b.dataset.tab;
      this.root.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('active', x === b));
      this.renderTab();
    }));
    const slider = this.root.querySelector('[data-step]');
    if (slider) {
      setRangeFill(slider);
      slider.addEventListener('input', () => { setRangeFill(slider); this.goStep(+slider.value); });
      this.root.querySelector('[data-prev]').addEventListener('click', () => { slider.value = Math.max(0, +slider.value - 1); slider.dispatchEvent(new Event('input')); });
      this.root.querySelector('[data-next]').addEventListener('click', () => { slider.value = Math.min(+slider.max, +slider.value + 1); slider.dispatchEvent(new Event('input')); });
      this.root.querySelector('[data-playsteps]').addEventListener('click', () => this.playSteps());
    }
    this.updateStepLabel();
    this.renderTab();
  }

  async playSteps() {
    const slider = this.root.querySelector('[data-step]');
    if (!slider || this.playing) return;
    this.playing = true;
    for (let k = 0; k <= +slider.max; k++) {
      if (!this.root.isConnected) break;
      slider.value = k;
      setRangeFill(slider);
      this.goStep(k);
      await new Promise((r) => setTimeout(r, this.tab === 'bloch' ? 1100 : 650));
    }
    this.playing = false;
  }

  /** Snapshot for the current step (null = final). */
  snap() {
    const steps = this.result?.steps || [];
    if (!steps.length || this.step == null) return null;
    return steps[this.step];
  }

  isFinal() {
    const steps = this.result?.steps || [];
    return !steps.length || this.step === steps.length - 1;
  }

  goStep(k) {
    const prev = this.step;
    this.step = k;
    this.updateStepLabel();
    const s = this.snap();
    this.editor?.setStep(this.isFinal() ? null : k - 1);
    const ket = this.root.querySelector('[data-ket]');
    if (ket && s) ket.textContent = ketFromAmps(s.amplitudes, this.result.num_qubits);
    if (this.isFinal() && ket) ket.textContent = this.result.analysis.ket;
    if (this.tab === 'bloch') this.updateSpheres(prev != null && k === prev + 1 ? s.rotation : null);
    else this.renderTab();
  }

  updateStepLabel() {
    const lbl = this.root.querySelector('[data-steplabel]');
    if (!lbl) return;
    const s = this.snap();
    if (!s) return;
    const total = this.result.steps.length - 1;
    if (s.index < 0) lbl.textContent = `Step 0/${total} · initial |${'0'.repeat(this.result.num_qubits)}⟩`;
    else {
      const g = store.gates[s.op.name];
      const where = s.op.qubits.length ? s.op.qubits.map((q) => `q${q}`).join(',') : 'all';
      lbl.textContent = `Step ${this.step}/${total} · ${g?.label || s.op.name} on ${where}`;
    }
  }

  renderTab() {
    const body = this.root.querySelector('[data-tabbody]');
    if (!body || !this.result) return;
    if (this.tab !== 'bloch') this.disposeSpheres();
    if (this.tab !== 'qsphere') this.disposeQSphere();
    const r = this.result;
    const n = r.num_qubits;
    const s = this.snap();
    const probs = s && !this.isFinal() ? s.probabilities : r.probabilities;

    if (this.tab === 'hist') {
      const final = this.isFinal();
      let rows;
      if (final) {
        const total = Object.values(r.counts).reduce((a, b) => a + b, 0) || 1;
        const measured = r.measured_qubits;
        // exact marginal probabilities over measured qubits (for the dashed markers)
        const exact = {};
        for (const [bits, p] of Object.entries(r.probabilities)) {
          const key = measured.slice().sort((a, b) => b - a).map((q) => bits[n - 1 - q]).join('');
          exact[key] = (exact[key] || 0) + p;
        }
        const keys = new Set([...Object.keys(r.counts), ...Object.keys(exact)]);
        rows = [...keys].sort().map((k) => ({ label: k, value: (r.counts[k] || 0) / total, count: r.counts[k] || 0, exact: exact[k] ?? 0 }));
        body.innerHTML = `<div class="row-between"><div class="muted small">Counts from <b>${r.shots}</b> shots on ${r.measured_qubits.map((q) => `q${q}`).join(', ')} (bitstring order q${Math.max(...r.measured_qubits)}…q${Math.min(...r.measured_qubits)}). Dashed lines = exact probabilities.</div>
          <div class="legend"><span><i style="background:#6a8dff"></i>sampled</span><span><i style="background:#fbbf24"></i>exact</span></div></div><div data-h></div>`;
      } else {
        rows = Object.entries(probs).sort().map(([k, v]) => ({ label: k, value: v }));
        body.innerHTML = `<div class="muted small">Exact probabilities <b>after step ${this.step}</b> (before measurement).</div><div data-h></div>`;
      }
      histogram(body.querySelector('[data-h]'), rows.length ? rows : [{ label: '0'.repeat(n), value: 0 }]);
    }

    if (this.tab === 'sv') {
      const amps = s ? s.amplitudes : r.statevector.map((x) => [x.re, x.im]);
      const rows = amps.map(([re, im], i) => ({ i, re, im, p: re * re + im * im, ph: Math.atan2(im, re) }));
      const show = rows.length > 64 ? rows.filter((x) => x.p > 1e-9) : rows;
      body.innerHTML = `<div style="overflow-x:auto"><table class="sv-table"><thead><tr><th>Basis</th><th>Amplitude</th><th>Probability</th><th style="width:40%"></th><th>Phase</th></tr></thead><tbody>
        ${show.map((x) => `<tr class="${x.p < 1e-9 ? 'zero' : ''}"><td>|${x.i.toString(2).padStart(n, '0')}⟩</td><td>${fmtComplex(x.re, x.im)}</td><td>${(x.p * 100).toFixed(2)}%</td>
          <td><div class="sv-bar" style="width:${(x.p * 100).toFixed(2)}%;background:${phaseColor(x.ph)}"></div></td>
          <td>${x.p > 1e-9 ? `<span class="phase-swatch" style="background:${phaseColor(x.ph)}"></span>${(x.ph * 180 / Math.PI).toFixed(0)}°` : '—'}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="legend" style="margin-top:12px">Phase colour: <span><i style="background:${phaseColor(0)}"></i>0°</span><span><i style="background:${phaseColor(Math.PI / 2)}"></i>90°</span><span><i style="background:${phaseColor(Math.PI)}"></i>180°</span><span><i style="background:${phaseColor(-Math.PI / 2)}"></i>270°</span></div>`;
    }

    if (this.tab === 'amp') {
      const amps = s ? s.amplitudes : r.statevector.map((x) => [x.re, x.im]);
      body.innerHTML = `<p class="muted small">Each circle is one basis state: filled area = probability, the needle = phase (counter-clockwise from →).</p><div data-a></div>`;
      amplitudeCircles(body.querySelector('[data-a]'), amps.length > 64 ? amps.slice(0, 64) : amps, n);
    }

    if (this.tab === 'bloch') {
      const bl = s ? s.bloch : r.bloch;
      body.innerHTML = `<p class="muted small">Each qubit's reduced state. Arrows shorter than the radius are <b>mixed</b> — a tell-tale sign of entanglement with the other qubits. Drag to orbit.</p>
        <div class="bloch-grid">${bl.map((b) => `<div class="bloch-tile board" data-q="${b.qubit}"><span class="qname">q${b.qubit}</span>${b.r < 0.99 ? '<span class="chip pink">mixed</span>' : ''}<div class="canvas-holder"></div>
          <div class="meta"><span>(${b.x.toFixed(2)}, ${b.y.toFixed(2)}, ${b.z.toFixed(2)})</span><span title="Purity Tr(ρ²)">P=${b.purity.toFixed(2)}</span></div></div>`).join('')}</div>`;
      this.spheres = bl.map((b) => {
        const holder = body.querySelector(`[data-q="${b.qubit}"] .canvas-holder`);
        const sp = new BlochSphere(holder, { compact: true });
        sp.setVector(b.x, b.y, b.z, true, 700);
        return sp;
      });
    }

    if (this.tab === 'qsphere') {
      const amps = s ? s.amplitudes : r.statevector.map((x) => [x.re, x.im]);
      body.innerHTML = `<p class="muted small">Q-Sphere: basis states sit at a latitude set by how many 1s they contain; node size = probability, colour = phase. Great for spotting entanglement and interference patterns.</p><div class="qsphere-holder board"></div>`;
      this.qsphere = new QSphere(body.querySelector('.qsphere-holder'));
      this.qsphere.setAmplitudes(amps, n);
    }

    if (this.tab === 'code') this.renderCode(body);
  }

  updateSpheres(rotation) {
    const s = this.snap();
    const bl = s ? s.bloch : this.result.bloch;
    if (!this.spheres.length) { this.renderTab(); return; }
    bl.forEach((b, i) => {
      const sp = this.spheres[i];
      if (!sp) return;
      if (rotation && rotation.qubit === i && Math.abs(b.r - 1) < 1e-3) sp.rotate(rotation.axis, rotation.angle, 800).then(() => sp.setVector(b.x, b.y, b.z, false));
      else sp.setVector(b.x, b.y, b.z, true, 600);
      const tile = this.root.querySelector(`[data-q="${i}"]`);
      if (tile) {
        tile.querySelector('.meta').innerHTML = `<span>(${b.x.toFixed(2)}, ${b.y.toFixed(2)}, ${b.z.toFixed(2)})</span><span title="Purity Tr(ρ²)">P=${b.purity.toFixed(2)}</span>`;
        const chip = tile.querySelector('.chip');
        if (b.r < 0.99 && !chip) tile.insertAdjacentHTML('afterbegin', '<span class="chip pink">mixed</span>');
        if (b.r >= 0.99 && chip) chip.remove();
      }
    });
  }

  async renderCode(body) {
    body.innerHTML = `<div class="row-between" style="margin-bottom:10px">
        <div class="tabs"><button class="tab active" data-lang="qasm">OpenQASM 2.0</button><button class="tab" data-lang="qiskit">Qiskit (Python)</button></div>
        <div class="row"><button class="btn btn-ghost btn-sm" data-copy>${icon('file')} Copy</button><button class="btn btn-ghost btn-sm" data-dl>${icon('download')} Download</button>
        ${this.onApplyCode ? `<button class="btn btn-primary btn-sm" data-apply>${icon('upload')} Apply code to circuit</button>` : ''}</div></div>
      <div class="code-holder" data-code></div>
      <p class="faint tiny" style="margin-top:8px">Edit the OpenQASM and press “Apply” to rebuild the circuit. The Qiskit script runs as-is with <code>pip install qiskit qiskit-aer</code>.</p>`;
    const circuit = this.editor ? this.editor.circuit : store.circuit;
    let code;
    try { code = await api.exportQasm(circuit); } catch (e) { toast(e.message, 'error'); return; }
    let lang = 'qasm';
    const holder = body.querySelector('[data-code]');
    const editor = await loadCodeEditor(holder, code.qasm, 'qasm');
    body.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
      lang = b.dataset.lang;
      body.querySelectorAll('[data-lang]').forEach((x) => x.classList.toggle('active', x === b));
      editor.setValue(lang === 'qasm' ? code.qasm : code.qiskit, lang === 'qasm' ? 'qasm' : 'python');
      editor.setReadOnly(lang !== 'qasm');
      const apply = body.querySelector('[data-apply]');
      if (apply) apply.disabled = lang !== 'qasm';
    }));
    body.querySelector('[data-copy]').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(editor.getValue()); toast('Copied to clipboard', 'success', 1500); } catch { toast('Copy failed', 'error'); }
    });
    body.querySelector('[data-dl]').addEventListener('click', () => {
      const blob = new Blob([editor.getValue()], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = lang === 'qasm' ? 'circuit.qasm' : 'circuit.py';
      a.click();
      URL.revokeObjectURL(a.href);
    });
    body.querySelector('[data-apply]')?.addEventListener('click', async () => {
      try {
        const c = await api.importQasm(editor.getValue());
        this.onApplyCode?.(c);
        toast('Circuit rebuilt from OpenQASM', 'success');
      } catch (e) { toast(e.message, 'error', 6000); }
    });
  }

  disposeSpheres() { this.spheres.forEach((s) => s.dispose()); this.spheres = []; }
  disposeQSphere() { this.qsphere?.dispose(); this.qsphere = null; }
  disposeScenes() { this.disposeSpheres(); this.disposeQSphere(); }
  destroy() { this.disposeScenes(); }
}

export function ketFromAmps(amps, n, maxTerms = 8) {
  const terms = [];
  amps.forEach(([re, im], i) => { if (re * re + im * im > 1e-9) terms.push([i, re, im]); });
  let s = '';
  terms.slice(0, maxTerms).forEach(([i, re, im], k) => {
    let sign = '+', coef;
    if (Math.abs(im) < 1e-3) { sign = re < 0 ? '−' : '+'; coef = Math.abs(re).toFixed(3); }
    else if (Math.abs(re) < 1e-3) { sign = im < 0 ? '−' : '+'; coef = `${Math.abs(im).toFixed(3)}i`; }
    else coef = `(${fmtComplex(re, im)})`;
    const ket = `${coef}|${i.toString(2).padStart(n, '0')}⟩`;
    s += k === 0 ? (sign === '−' ? `−${ket}` : ket) : ` ${sign} ${ket}`;
  });
  if (terms.length > maxTerms) s += ` + … (${terms.length - maxTerms} more)`;
  return s || '0';
}
