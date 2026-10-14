// 3D Lab: a single qubit on a big interactive Bloch sphere, with animated gate rotations.
import { BlochSphere } from '../three/bloch.js';
import { store } from '../store.js';
import { esc, icon, fmtAngle, setRangeFill, toast, gateColor, renderTex } from '../ui.js';
import { applyGate, blochOf, rotationOf, anglesOf, fromAngles, ketString, amplitudes, stateName, ZERO, fmtComplexPair } from '../quantum.js';
import { histogram } from '../charts.js';
import { openDrawer, loadIntoBuilder } from '../main.js';

const GATES = ['h', 'x', 'y', 'z', 's', 'sdg', 't', 'tdg', 'sx'];
const PRESETS = [['|0⟩', 0, 0], ['|1⟩', Math.PI, 0], ['|+⟩', Math.PI / 2, 0], ['|−⟩', Math.PI / 2, Math.PI], ['|+i⟩', Math.PI / 2, Math.PI / 2], ['|−i⟩', Math.PI / 2, -Math.PI / 2]];

export async function render(root) {
  root.innerHTML = `
  <div class="lab-layout">
    <div class="stack">
      <div class="card">
        <div class="card-head"><h3><i data-icon="zap"></i>Gates</h3><span class="faint tiny">click to apply</span></div>
        <div class="gate-grid">${GATES.map((g) => {
          const s = store.gates[g] || { label: g.toUpperCase(), category: 'pauli' };
          const sub = { h: 'superpose', x: 'bit flip', y: 'bit+phase', z: 'phase flip', s: '¼ turn Z', sdg: '−¼ turn', t: '⅛ turn Z', tdg: '−⅛ turn', sx: '½ X' }[g];
          return `<button class="gate-btn" data-gate="${g}" style="--gc:${gateColor(s)}" title="${esc(s.description || '')}">${esc(s.label)}<small>${sub}</small></button>`;
        }).join('')}</div>
      </div>
      <div class="card">
        <div class="card-head"><h3><i data-icon="reset"></i>Rotations</h3></div>
        ${['rx', 'ry', 'rz'].map((g) => `<div class="rot-row"><b>${g.toUpperCase()}</b>
          <input type="range" min="-6.2832" max="6.2832" step="0.1309" value="1.5708" data-rot="${g}" aria-label="${g} angle">
          <span class="val" data-rotval="${g}">π/2</span>
          <button class="icon-btn" data-apply-rot="${g}" title="Apply ${g.toUpperCase()}">${icon('play')}</button></div>`).join('')}
      </div>
      <div class="card">
        <div class="card-head"><h3><i data-icon="target"></i>Jump to a state</h3></div>
        <div class="preset-grid">${PRESETS.map(([l], i) => `<button class="btn btn-ghost btn-sm mono" data-preset="${i}">${l}</button>`).join('')}</div>
        <hr>
        <div class="rot-row"><b>θ</b><input type="range" min="0" max="3.1416" step="0.01" value="0" data-theta aria-label="theta"><span class="val" data-thetaval>0</span><span></span></div>
        <div class="rot-row"><b>φ</b><input type="range" min="-3.1416" max="3.1416" step="0.01" value="0" data-phi aria-label="phi"><span class="val" data-phival>0</span><span></span></div>
        <p class="faint tiny" style="margin:0">Drag θ (latitude) and φ (longitude) to place the state anywhere on the sphere.</p>
      </div>
    </div>

    <div class="card lab-stage" data-stage>
      <div class="stage-overlay">
        <span class="chip" data-rotinfo>|ψ⟩ = |0⟩ · the north pole</span>
        <div class="row" style="gap:6px">
          <button class="btn btn-ghost btn-sm" data-undo>${icon('undo')} Undo</button>
          <button class="btn btn-ghost btn-sm" data-reset>${icon('reset')} Reset</button>
        </div>
      </div>
      <div class="stage-bottom">
        <button class="btn btn-violet" data-measure>${icon('eye')} Measure</button>
        <button class="btn btn-ghost" data-measure100>${icon('dice')} Measure ×200</button>
        <button class="btn btn-ghost" data-builder>${icon('circuit')} Open in builder</button>
      </div>
    </div>

    <div class="stack lab-info">
      <div class="card">
        <div class="card-head"><h3>State</h3><span class="chip violet" data-name></span></div>
        <div class="state-big" data-ket>|0⟩</div>
        <div class="formula" data-formula style="margin:12px 0 4px;padding:10px;font-size:.95rem"></div>
        <div class="kv" style="margin-top:10px">
          <div><small>θ</small><b data-th>0</b></div><div><small>φ</small><b data-ph>0</b></div><div><small>purity</small><b>1.00</b></div>
          <div><small>x</small><b data-x>0</b></div><div><small>y</small><b data-y>0</b></div><div><small>z</small><b data-z>1</b></div>
        </div>
        <div style="margin-top:12px">
          <div class="prob-bar"><span>P(0)</span><div class="track"><span data-p0 style="background:linear-gradient(90deg,#4f8cff,#7dd3fc)"></span></div><span data-p0v></span></div>
          <div class="prob-bar"><span>P(1)</span><div class="track"><span data-p1 style="background:linear-gradient(90deg,#9b7bff,#f472b6)"></span></div><span data-p1v></span></div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h3>History</h3><span class="faint tiny" data-count>0 gates</span></div>
        <div class="history" data-history><span class="faint small">Apply a gate to begin.</span></div>
        <div data-explain class="muted small" style="margin-top:12px"></div>
        <button class="btn btn-ghost btn-sm" style="margin-top:10px" data-ask>${icon('bot')} Ask Q-Bot about this state</button>
      </div>
      <div class="card" data-mcard hidden>
        <div class="card-head"><h3>Measurements</h3><span class="faint tiny" data-mtotal></span></div>
        <div data-hist></div>
      </div>
      <div class="card stack" style="gap:10px">
        <label class="toggle"><input type="checkbox" data-opt="trail" checked> Show trail</label>
        <label class="toggle"><input type="checkbox" data-opt="proj" checked> Show projections</label>
        <label class="toggle"><input type="checkbox" data-opt="spin"> Auto-rotate camera</label>
      </div>
    </div>
  </div>`;

  const $ = (s) => root.querySelector(s);
  const sphere = new BlochSphere($('[data-stage]'));
  let state = ZERO;
  let history = []; // {name, params}
  let snapshots = [ZERO];
  let tallies = { 0: 0, 1: 0 };
  let busy = false;

  renderTex($('[data-formula]'), String.raw`|\psi\rangle = \cos\tfrac{\theta}{2}|0\rangle + e^{i\varphi}\sin\tfrac{\theta}{2}|1\rangle`);

  function syncStore() {
    store.labCircuit = { num_qubits: 1, operations: history.map((h, i) => ({ name: h.name, qubits: [0], params: h.params || [], col: i })) };
  }

  function updateInfo() {
    const [x, y, z] = blochOf(state);
    const { theta, phi } = anglesOf(state);
    $('[data-ket]').textContent = ketString(state);
    $('[data-name]').textContent = stateName(state) || 'superposition';
    $('[data-th]').textContent = fmtAngle(+theta.toFixed(6));
    $('[data-ph]').textContent = fmtAngle(+phi.toFixed(6));
    $('[data-x]').textContent = x.toFixed(3);
    $('[data-y]').textContent = y.toFixed(3);
    $('[data-z]').textContent = z.toFixed(3);
    const [a, b] = amplitudes(state);
    const p0 = a[0] ** 2 + a[1] ** 2;
    $('[data-p0]').style.width = `${p0 * 100}%`;
    $('[data-p1]').style.width = `${(1 - p0) * 100}%`;
    $('[data-p0v]').textContent = `${(p0 * 100).toFixed(1)}%`;
    $('[data-p1v]').textContent = `${((1 - p0) * 100).toFixed(1)}%`;
    const th = $('[data-theta]'), ph = $('[data-phi]');
    th.value = theta; ph.value = phi; setRangeFill(th); setRangeFill(ph);
    $('[data-thetaval]').textContent = fmtAngle(+theta.toFixed(4));
    $('[data-phival]').textContent = fmtAngle(+phi.toFixed(4));
    $('[data-count]').textContent = `${history.length} gate${history.length === 1 ? '' : 's'}`;
    $('[data-history]').innerHTML = history.length
      ? history.map((h) => { const s = store.gates[h.name]; return `<span class="gate-badge" style="background:${gateColor(s)}" title="${esc(s?.description || '')}">${esc(s?.label || h.name)}${h.params?.length ? `<small style="font-size:.6rem;margin-left:3px">${fmtAngle(h.params[0])}</small>` : ''}</span>`; }).join('')
      : '<span class="faint small">Apply a gate to begin.</span>';
    $('[data-rotinfo]').textContent = `|ψ⟩ = ${stateName(state) || `α|0⟩ + β|1⟩ with α=${fmtComplexPair(a)}, β=${fmtComplexPair(b)}`}`;
    syncStore();
  }

  async function apply(name, params = []) {
    if (busy) return;
    busy = true;
    const rot = rotationOf(name, params);
    const spec = store.gates[name];
    $('[data-explain]').innerHTML = `<b>${esc(spec?.label || name)}</b>: ${esc(spec?.description || '')}<br><span class="faint">Rotation of ${fmtAngle(rot[1])} about axis (${rot[0].map((v) => +v.toFixed(3)).join(', ')}).</span>`;
    state = applyGate(state, name, params);
    history.push({ name, params });
    snapshots.push(state);
    tallies = { 0: 0, 1: 0 };
    $('[data-mcard]').hidden = true;
    updateInfo();
    await sphere.rotate(rot[0], rot[1], 900);
    sphere.place(blochOf(state));
    busy = false;
  }

  root.querySelectorAll('[data-gate]').forEach((b) => b.addEventListener('click', () => apply(b.dataset.gate)));
  root.querySelectorAll('[data-rot]').forEach((r) => {
    setRangeFill(r);
    r.addEventListener('input', () => { setRangeFill(r); root.querySelector(`[data-rotval="${r.dataset.rot}"]`).textContent = fmtAngle(+r.value); });
  });
  root.querySelectorAll('[data-apply-rot]').forEach((b) => b.addEventListener('click', () => {
    const g = b.dataset.applyRot;
    apply(g, [+root.querySelector(`[data-rot="${g}"]`).value]);
  }));

  async function jumpTo(theta, phi) {
    // express the jump as RY then RZ from |0⟩ so it stays a valid circuit
    state = fromAngles(theta, phi);
    history = [{ name: 'ry', params: [+theta.toFixed(6)] }, ...(Math.abs(phi) > 1e-9 ? [{ name: 'rz', params: [+phi.toFixed(6)] }] : [])];
    snapshots = [ZERO, state];
    sphere.setVector(...blochOf(state), true, 500);
    $('[data-explain]').innerHTML = `<span class="faint">Prepared with RY(θ) then RZ(φ) — the general recipe for any single-qubit state (up to global phase).</span>`;
    updateInfo();
  }
  root.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => { const [, t, p] = PRESETS[+b.dataset.preset]; jumpTo(t, p); }));
  const th = $('[data-theta]'), ph = $('[data-phi]');
  const free = () => {
    setRangeFill(th); setRangeFill(ph);
    state = fromAngles(+th.value, +ph.value);
    history = [{ name: 'ry', params: [+(+th.value).toFixed(4)] }, { name: 'rz', params: [+(+ph.value).toFixed(4)] }];
    sphere.place(blochOf(state));
    updateInfo();
  };
  th.addEventListener('input', free);
  ph.addEventListener('input', free);

  $('[data-reset]').addEventListener('click', () => {
    state = ZERO; history = []; snapshots = [ZERO];
    sphere.clearTrail();
    sphere.setVector(0, 0, 1, true, 500);
    $('[data-explain]').innerHTML = '';
    $('[data-mcard]').hidden = true;
    updateInfo();
  });
  $('[data-undo]').addEventListener('click', () => {
    if (!history.length) return;
    history.pop();
    snapshots.pop();
    state = snapshots[snapshots.length - 1] || ZERO;
    sphere.setVector(...blochOf(state), true, 500);
    updateInfo();
  });

  function sample() {
    const [a] = amplitudes(state);
    const p0 = a[0] ** 2 + a[1] ** 2;
    return Math.random() < p0 ? 0 : 1;
  }
  $('[data-measure]').addEventListener('click', async () => {
    if (busy) return;
    const out = sample();
    sphere.pulse();
    $('[data-stage]').classList.remove('measure-flash');
    void $('[data-stage]').offsetWidth;
    $('[data-stage]').classList.add('measure-flash');
    toast(`Measured <b>${out}</b> — the state collapsed to |${out}⟩.`, 'info', 2200);
    state = out ? [[0, 0], [1, 0]] : ZERO;
    history.push({ name: 'measure', params: [] });
    snapshots.push(state);
    await sphere.setVector(0, 0, out ? -1 : 1, true, 450);
    $('[data-explain]').innerHTML = `<b>Measurement</b> gave <b>${out}</b>. The superposition is gone: re-measuring will now always give ${out}.`;
    updateInfo();
  });
  $('[data-measure100]').addEventListener('click', () => {
    for (let i = 0; i < 200; i++) tallies[sample()]++;
    const total = tallies[0] + tallies[1];
    $('[data-mcard]').hidden = false;
    $('[data-mtotal]').textContent = `${total} shots (state not collapsed)`;
    const [a] = amplitudes(state);
    const p0 = a[0] ** 2 + a[1] ** 2;
    histogram($('[data-hist]'), [{ label: '0', value: tallies[0] / total, exact: p0, count: tallies[0] }, { label: '1', value: tallies[1] / total, exact: 1 - p0, count: tallies[1] }], { height: 190 });
  });
  $('[data-builder]').addEventListener('click', () => {
    const ops = history.map((h, i) => ({ name: h.name, qubits: [0], params: h.params || [], col: i }));
    loadIntoBuilder(1, ops, 'your 3D Lab experiment');
  });
  $('[data-ask]').addEventListener('click', () => openDrawer(`I'm in the 3D Lab. My qubit is in the state ${ketString(state)}. Explain where it is on the Bloch sphere and what the gates I applied did.`));
  root.querySelectorAll('[data-opt]').forEach((t) => t.addEventListener('change', () => {
    if (t.dataset.opt === 'trail') sphere.setTrailVisible(t.checked);
    if (t.dataset.opt === 'proj') sphere.setProjectionsVisible(t.checked);
    if (t.dataset.opt === 'spin') sphere.setAutoRotate(t.checked);
  }));

  updateInfo();

  // ops handed over from a lesson's "Try it" box
  const pending = sessionStorage.getItem('q3d-lab-ops');
  if (pending) {
    sessionStorage.removeItem('q3d-lab-ops');
    const ops = JSON.parse(pending);
    (async () => {
      await new Promise((r) => setTimeout(r, 500));
      for (const op of ops) {
        if (!root.isConnected) return;
        if (op.name === 'measure') continue;
        await apply(op.name, op.params || []);
        await new Promise((r) => setTimeout(r, 250));
      }
    })();
  }

  return () => { sphere.dispose(); store.labCircuit = null; };
}
