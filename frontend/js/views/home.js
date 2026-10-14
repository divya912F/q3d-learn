import { BlochSphere } from '../three/bloch.js';
import { esc, gateColor } from '../ui.js';
import { store } from '../store.js';
import { applyGate, blochOf, ketString, ZERO } from '../quantum.js';

const FEATURES = [
  ['learn', 'book', 'Learn', 'Concepts', 'Bite-size lessons with formulas, insights and quizzes.', 'var(--g-superposition)'],
  ['builder', 'circuit', 'Build', 'Circuits', 'Drag-and-drop gates or write OpenQASM in the code editor.', 'var(--violet)'],
  ['lab', 'chart', 'Simulate', '& Analyze', 'Real statevector + Qiskit Aer simulation with 3D state views.', 'var(--green)'],
  ['tutor', 'bot', 'Ask AI', '(Text + Voice)', 'A context-aware tutor that sees your circuit and its results.', 'var(--pink)'],
  ['challenges', 'bulb', 'Experiment', '& Understand', 'Challenges, algorithms and what-if experiments.', 'var(--amber)'],
];

const JOURNEY = [
  ['😕', 'Confused', 'Abstract theory'], ['💡', 'Visualize', '3D intuition'], ['🔧', 'Build', 'Your circuits'],
  ['▶️', 'Simulate', 'Real results'], ['🤖', 'Ask', 'AI guidance'], ['🧪', 'Experiment', 'What-if'], ['🏆', 'Master', 'Concepts & skills'],
];

const DEMO_SEQ = ['h', 't', 's', 'x', 'h', 'y', 'sx', 'z', 'h'];

export async function render(root) {
  root.innerHTML = `
  <section class="hero">
    <div>
      <span class="eyebrow">SIH26140 · Smart Education · Team SRIJAN</span>
      <h1><span class="grad">Q-3D Learn</span><br>see quantum computing.</h1>
      <p class="sub">An AI-powered interactive lab that makes quantum computing <b>visual</b>, <b>interactive</b> and <b>accessible</b> to every learner.</p>
      <div class="row">
        <a class="btn btn-primary btn-lg" href="#/learn"><i data-icon="book"></i>Start learning</a>
        <a class="btn btn-ghost btn-lg" href="#/builder"><i data-icon="circuit"></i>Open Circuit Builder</a>
      </div>
      <div class="row" style="margin-top:22px;gap:20px">
        <span class="muted small"><b style="color:var(--text)">8</b> lessons</span>
        <span class="muted small"><b style="color:var(--text)">9</b> challenges</span>
        <span class="muted small"><b style="color:var(--text)">8</b> algorithms</span>
        <span class="muted small"><b style="color:var(--text)">${Object.keys(store.gates).length || 23}</b> gates</span>
      </div>
    </div>
    <div class="hero-stage" data-stage>
      <div class="float-card" style="top:18px;left:18px"><div class="faint tiny">STATE</div><div class="ket" data-ket>|0⟩</div></div>
      <div class="float-card" style="top:18px;right:18px;text-align:right"><div class="faint tiny">LAST GATE</div><div data-gate style="margin-top:4px">—</div></div>
      <div class="float-card" style="bottom:18px;left:18px"><div class="faint tiny">P(0) / P(1)</div><div class="mono" data-p>1.00 / 0.00</div></div>
      <div class="float-card faint" style="bottom:18px;right:18px;font-size:.75rem">drag to orbit · scroll to zoom</div>
    </div>
  </section>

  <div class="grid features">
    ${FEATURES.map(([route, ic, t, sub, desc, c]) => `
      <a class="card feature" href="#/${route}">
        <div class="ic" style="background:color-mix(in srgb, ${c} 18%, transparent);color:${c}"><i data-icon="${ic}"></i></div>
        <h3>${t} <span class="faint" style="font-weight:500;font-size:.85rem">${sub}</span></h3><p>${desc}</p>
      </a>`).join('')}
  </div>

  <div class="section-title"><h2>The learning journey</h2><span class="muted small">From abstract theory to an interactive quantum lab</span></div>
  <div class="card"><div class="journey">${JOURNEY.map(([e, t, s]) => `<div class="journey-step"><div class="dot">${e}</div><b>${t}</b><span>${s}</span></div>`).join('')}</div></div>

  <div class="section-title"><h2>Problem statement</h2></div>
  <div class="ps-strip">
    <div class="card"><div class="ic" style="background:rgba(79,140,255,.15);color:var(--primary)"><i data-icon="target"></i></div><div><small>Problem statement</small><b>AI-Based Interactive Quantum Algorithm Learning Platform</b></div></div>
    <div class="card"><div class="ic" style="background:rgba(155,123,255,.15);color:var(--violet)"><i data-icon="cap"></i></div><div><small>Theme</small><b>Smart Education</b></div></div>
    <div class="card"><div class="ic" style="background:rgba(52,211,153,.15);color:var(--green)"><i data-icon="users"></i></div><div><small>Team</small><b>SRIJAN</b></div></div>
  </div>
  <p class="quote">“From abstract theory to an <b>interactive quantum lab</b>.”</p>
  <p class="center"><a href="#/about" class="btn btn-ghost">Read about the project <i data-icon="arrowRight"></i></a></p>`;

  const stage = root.querySelector('[data-stage]');
  const sphere = new BlochSphere(stage, { autoRotate: true, interactive: true });
  sphere.controls.autoRotateSpeed = 0.5;
  let state = ZERO;
  let i = 0;
  let alive = true;
  const loop = async () => {
    await new Promise((r) => setTimeout(r, 1400));
    while (alive) {
      const name = DEMO_SEQ[i++ % DEMO_SEQ.length];
      const g = store.gates[name];
      const gEl = root.querySelector('[data-gate]');
      if (gEl) gEl.innerHTML = `<span class="gate-badge" style="background:${gateColor(g)}">${esc(g?.label || name.toUpperCase())}</span>`;
      if (g?.bloch_axis) await sphere.rotate(g.bloch_axis, rotAngle(name), 1100);
      state = applyGate(state, name);
      const b = blochOf(state);
      sphere.place(b, false);
      const ket = root.querySelector('[data-ket]');
      if (!ket) break;
      ket.textContent = ketString(state);
      const p0 = state[0][0] ** 2 + state[0][1] ** 2;
      root.querySelector('[data-p]').textContent = `${p0.toFixed(2)} / ${(1 - p0).toFixed(2)}`;
      await new Promise((r) => setTimeout(r, 1300));
    }
  };
  loop();
  return () => { alive = false; sphere.dispose(); };
}

function rotAngle(name) {
  return { h: Math.PI, x: Math.PI, y: Math.PI, z: Math.PI, s: Math.PI / 2, t: Math.PI / 4, sx: Math.PI / 2 }[name] ?? 0;
}
