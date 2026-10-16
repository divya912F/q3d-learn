// About the project: idea, technical approach, feasibility, impact and references (from the SIH proposal).
import { icon, hydrateIcons, esc } from '../ui.js';
import { store } from '../store.js';
import { courseArt } from '../art.js';

const FLOW = [
  ['Topic', 'Choose a concept', 'book'], ['Lesson', 'Visual explanations', 'play'], ['3D Visualization', 'Interactive Bloch sphere', 'sphere'],
  ['Circuit Builder', 'Drag & drop or code', 'circuit'], ['Simulation', 'Statevector / Qiskit Aer', 'zap'], ['Result', 'Counts, states, phases', 'chart'],
  ['AI Explanation', 'Context-aware tutor', 'bot'], ['Challenge', 'Quizzes & puzzles', 'trophy'], ['Progress', 'Personalised path', 'layers'],
];

const RISKS = [
  ['Scientific accuracy (visualization & results)', 'Every visual is driven by real computation in Python (statevector simulator / Qiskit Aer, NumPy trainers, statistics engines), covered by an automated test-suite.'],
  ['AI hallucination (wrong explanations)', 'Context-aware AI: every prompt carries the current circuit and re-computed simulation facts, plus curated reference notes; offline fallback is deterministic.'],
  ['3D & simulation synchronization', 'Visualizations are driven by actual quantum-state data (reduced density matrices per step), never by hand-made animations.'],
  ['Invalid or inconsistent circuits', 'Server-side circuit validation (qubit ranges, parameters, duplicates, mid-circuit measurement) + backend execution checks.'],
  ['Scalability (future growth)', 'Modular FastAPI routers, stateless API, SQLite → PostgreSQL via one env var, Docker-ready.'],
];

const REFS = [
  ['SIH26140 – AI-Based Interactive Quantum Algorithm Learning Platform', 'Egreen Quanta · Smart Education · Software', 'https://sih2026.vuce.in/ps/SIH26140', 'target'],
  ['IBM Quantum Learning — Bits, Gates and Circuits', 'Utility-scale quantum computing course', 'https://quantum.cloud.ibm.com/learning/en/courses/utility-scale-quantum-computing/bits-gates-and-circuits', 'book'],
  ['IBM Quantum Learning — Bloch Sphere', 'General formulation of quantum information · density matrices', 'https://quantum.cloud.ibm.com/learning/en/courses/general-formulation-of-quantum-information/density-matrices/bloch-sphere', 'sphere'],
  ['Qiskit Aer Documentation', 'Quantum circuit simulation and measurement counts', 'https://qiskit.github.io/qiskit-aer/', 'zap'],
  ['Qerimi et al. (2025)', 'Comparing Visual Qubit Representations in Quantum Education: The Bloch Sphere Enhances Task Efficiency', 'https://arxiv.org/abs/2507.21721', 'file'],
];

export async function render(root) {
  const sys = store.system;
  document.documentElement.style.setProperty('--course', 'var(--primary)');
  root.innerHTML = `
  <div class="card about-hero paper-lines" style="padding-left:66px">
    <span class="eyebrow">Team SRIJAN · Smart India Hackathon 2026</span>
    <h1 style="font-size:clamp(2rem,4vw,3rem);margin:14px 0 8px">Q-3D Learn</h1>
    <p class="muted" style="font-size:1.1rem;max-width:70ch">An AI-powered study platform where students learn <b>Quantum Computing</b>, <b>Machine Learning</b>, <b>Data Science</b> and <b>Artificial Intelligence</b> by <span class="hl">visualising</span> concepts in 2D and 3D, <span class="hl">building</span> circuits, models and pipelines, <span class="hl">running real computations</span>, <span class="hl">asking an AI tutor</span> and <span class="hl">experimenting</span>.</p>
    <div class="row" style="margin-top:10px"><span class="chip">✅ 3D & interactive visualisation</span><span class="chip">✅ Real simulation & computation</span><span class="chip">✅ AI-powered, grounded tutoring</span><span class="chip">✅ 4 courses, one toolkit</span><span class="chip">✅ Spaced-repetition review</span><span class="chip">✅ Living sky & focus timer</span><span class="chip">✅ Works offline (PWA)</span></div>
    <p class="hand" style="margin:16px 0 0;font-size:1.6rem;color:var(--primary)">💡 “Not just a simulator — a complete learning experience!”</p>
  </div>

  <div class="section-title"><h2>Courses</h2></div>
  <div class="course-grid">${store.courses.map((c) => `<a class="card course-card" href="#/c/${c.id}" style="--cc:var(--c-${c.id})"><div class="cover"><span class="label">${esc(c.title)}</span>${courseArt(c.id)}</div>
    <div class="body"><p>${esc(c.description)}</p><div class="meta"><span>${c.lessons} lessons</span><span>${c.labs.length} labs: ${c.labs.map((l) => esc(l.title)).join(', ')}</span><span>${c.challenges} challenges</span></div></div></a>`).join('')}</div>

  <div class="section-title"><h2>1 · Idea</h2></div>
  <div class="card"><div class="journey" style="grid-template-columns:repeat(7,1fr)">${['📖 Topic', '🌐 3D Visualize', '🔧 Build Circuit', '▶️ Simulate', '🤖 Ask AI', '🧪 Experiment', '🏆 Understand'].map((s) => { const [e, ...t] = s.split(' '); return `<div class="journey-step"><div class="dot">${e}</div><b>${t.join(' ')}</b></div>`; }).join('')}</div></div>

  <div class="section-title"><h2>2 · Technical approach</h2></div>
  <div class="grid" style="grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)" data-ta>
    <div class="card"><h3>${icon('layers')} System architecture</h3>
      <div class="arch">
        ${layer('Student / Learner', 'Web browser — laptop, tablet, mobile', 'var(--primary)', ['Personalised learning', 'Adaptive recommendations'])}
        <div class="arch-arrow">↓</div>
        ${layer('Q-3D Learn Frontend', 'ES modules + Three.js (no build step)', 'var(--violet)', ['Interactive UI', '3D visualizations', 'Code editor', 'Real-time feedback'])}
        <div class="arch-arrow">↓</div>
        ${layer('Course modules', 'Quantum · ML · Data Science · AI', 'var(--cyan)', ['Lessons & quizzes', 'Visual labs', 'Challenges', 'AI tutor (context-aware)'])}
        <div class="arch-arrow">↓</div>
        ${layer('Backend API (FastAPI)', 'REST · modular routers · validation', 'var(--green)', ['/api/courses', '/api/simulate', '/api/ml · /api/ds · /api/ai', '/api/tutor', '/api/progress'])}
        <div class="arch-arrow">↓</div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
          ${layer('Computation layer', 'Quantum statevector + Qiskit Aer · NumPy ML trainers · statistics · search/RL/LM engines', 'var(--pink)', [])}
          ${layer('AI / LLM layer', 'OpenAI · Google Gemini · offline', 'var(--amber)', [])}
        </div>
        <div class="arch-arrow">↓</div>
        ${layer('Database', 'SQLite (default) · PostgreSQL', 'var(--primary)', ['User profiles', 'Per-course progress', 'Experiments & results'])}
      </div></div>
    <div class="stack">
      <div class="card"><h3>${icon('code')} Technology stack</h3>
        <div class="grid tech-grid" style="gap:10px">
          ${tech('Frontend', 'HTML5 · CSS · JavaScript (ES modules) · Three.js · Monaco Editor · KaTeX · Web Speech API')}
          ${tech('Backend', 'Python 3.10+ · FastAPI · Pydantic · Uvicorn')}
          ${tech('Engines', `Quantum statevector · Qiskit Aer · NumPy ML (GD, MLP, trees, k-means) · statistics · search, minimax, Q-learning, n-gram LM${sys ? ` <span class="chip ${sys.qiskit.available ? 'green' : 'gray'}" style="margin-top:6px">${sys.qiskit.available ? 'Aer active' : 'Aer optional'}</span>` : ''}`)}
          ${tech('AI / LLM', `OpenAI · Google Gemini · OpenAI-compatible (Ollama) · offline tutor${sys ? ` <span class="chip gray" style="margin-top:6px">now: ${esc(sys.ai_provider)}</span>` : ''}`)}
          ${tech('Database', 'SQLAlchemy 2 · SQLite · PostgreSQL')}
          ${tech('Tools', 'GitHub · GitHub Actions CI · Docker · docker-compose · pytest')}
        </div></div>
      <div class="card"><h3>${icon('arrowRight')} Implementation flow</h3>
        <div class="stack" style="gap:6px">${FLOW.map(([t, d, ic], i) => `<div class="row" style="gap:10px;flex-wrap:nowrap"><span class="chip" style="min-width:34px;justify-content:center">${String(i + 1).padStart(2, '0')}</span><i data-icon="${ic}" style="width:18px;height:18px;display:inline-grid;color:var(--primary)"></i><b style="min-width:130px">${t}</b><span class="muted small">${d}</span></div>`).join('')}</div></div>
    </div>
  </div>

  <div class="section-title"><h2>3 · Feasibility & viability</h2></div>
  <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,2fr)" data-fv>
    <div class="card"><h3>${icon('checkCircle')} Why it is feasible</h3>
      <ul class="muted" style="padding-left:18px;margin:0">
        <li>Software-first — no physical quantum hardware needed for the MVP</li>
        <li>Real simulation (statevector engine; Qiskit Aer when installed)</li>
        <li>3D visualization runs in any modern browser (WebGL)</li>
        <li>Modular, scalable architecture</li>
        <li>Mature, open-source technologies; zero licence cost</li>
      </ul>
      <hr><div class="kv" style="grid-template-columns:1fr 1fr">
        <div><small>MVP</small><b>Built ✓</b></div><div><small>Cost</small><b>Open source</b></div>
        <div><small>Hardware</small><b>None</b></div><div><small>Scale</small><b>Cloud-ready</b></div></div></div>
    <div class="card"><h3>${icon('alert')} Challenges & solutions</h3>
      <table class="table risk-table"><thead><tr><th>Challenge / risk</th><th>Solution strategy (as implemented)</th></tr></thead>
      <tbody>${RISKS.map(([a, b]) => `<tr><td>${a}</td><td class="muted">${b}</td></tr>`).join('')}</tbody></table></div>
  </div>

  <div class="section-title"><h2>4 · Impact & benefits</h2></div>
  <div class="grid impact-grid">
    ${impact('For students', 'cap', 'var(--primary)', ['Visual understanding of abstract concepts', 'Hands-on experimentation', 'Practical circuit learning', 'AI-guided explanations & debugging', 'Personalised learning paths'], 'See it. Build it. Understand it.')}
    ${impact('For instructors', 'users', 'var(--violet)', ['Interactive teaching tools', 'Student progress tracking', 'Weak-topic identification', 'Assessment & analytics', 'Classes & assignments'], 'Teach better. Track smarter.')}
    ${impact('For institutions', 'school', 'var(--green)', ['Scalable quantum, AI & data education', 'Reduced dependence on hardware', 'Centralised learning & assessment', 'Easy integration (REST API, Docker)'], 'Build a future-ready campus.')}
    ${impact('Broader impact', 'globe', 'var(--amber)', ['Lower barrier to future-tech education', 'Stronger quantum, ML & data skills', 'A future-ready learner ecosystem', 'National quantum HR development'], 'A brighter, more future-ready nation.')}
  </div>

  <div class="section-title"><h2>5 · Research & references</h2></div>
  <div class="stack">${REFS.map(([t, d, url, ic]) => `<div class="ref"><div class="ic"><i data-icon="${ic}"></i></div><div class="grow"><b>${t}</b><div class="muted small">${d}</div><a href="${url}" target="_blank" rel="noopener">${url}</a></div></div>`).join('')}
    <div class="callout insight"><i data-icon="sparkle"></i><div><b>Existing tools & gap analysis.</b> Circuit composers already exist, so our differentiation is the <b>integration</b> of context-aware AI, 3D visualization, experiment-driven learning and personalised learning in one open platform.</div></div>
  </div>
  <p class="quote">“From abstract theory to an interactive lab.”</p>`;
  hydrateIcons(root);
  if (innerWidth < 1080) root.querySelectorAll('[data-ta],[data-fv]').forEach((g) => { g.style.gridTemplateColumns = '1fr'; });
}

function layer(title, sub, color, chips) {
  return `<div class="arch-layer" style="border-left:3px solid ${color}"><div><b>${title}</b><small>${sub}</small></div><div class="row" style="gap:6px">${chips.map((c) => `<span class="chip gray">${c}</span>`).join('')}</div></div>`;
}
function tech(t, d) { return `<div class="tech"><b>${t}</b><span class="muted small">${d}</span></div>`; }
function impact(t, ic, color, items, tag) {
  return `<div class="card impact"><div class="row" style="margin-bottom:10px"><span class="accent" style="width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:color-mix(in srgb, ${color} 18%, transparent);color:${color}">${icon(ic)}</span><h3 style="margin:0">${t}</h3></div>
    <ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul><div class="tag">${tag}</div></div>`;
}
