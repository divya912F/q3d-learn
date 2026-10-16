// AI Tutor page: full-size chat, course focus and the context Q-Bot is grounded on.
import { Chat } from '../components/chat.js';
import { store } from '../store.js';
import { esc, icon, hydrateIcons, toast } from '../ui.js';

const TOPICS = {
  quantum: ['Superposition', 'Bloch sphere', 'Hadamard gate', 'Entanglement', 'Grover search', 'Teleportation'],
  ml: ['Gradient descent', 'Overfitting', 'Neural networks', 'Decision trees', 'k-means', 'Precision and recall'],
  ds: ['Median vs mean', 'Standard deviation', 'Correlation', 'Missing values', 'Outliers', 'Central limit theorem'],
  ai: ['A* search', 'BFS', 'Minimax', 'Q-learning', 'Temperature', 'Responsible AI'],
};

export async function render(root) {
  const sys = store.system;
  let course = store.currentCourse || store.course || 'quantum';
  root.innerHTML = `<div class="tutor-layout">
    <div class="card" style="padding:0;display:flex;flex-direction:column;min-height:0" data-chat></div>
    <div class="stack" style="overflow-y:auto">
      <div class="card sticky"><div class="card-head"><h3>${icon('bot')} Q-Bot</h3><span class="chip ${sys?.ai_provider === 'offline' ? 'gray' : 'green'}">${esc(sys?.ai_provider || 'offline')}</span></div>
        <p class="small" style="margin:0">${sys?.ai_provider && sys.ai_provider !== 'offline'
          ? `Answers come from <b>${esc(sys.ai_provider)}</b>, grounded on facts computed by the platform plus validated notes — to keep hallucinations out.`
          : 'Running the built-in <b>offline study buddy</b>: validated explanations for all eight courses plus live analysis of your circuits and lab results. Add <code>OPENAI_API_KEY</code> or <code>GEMINI_API_KEY</code> to <code>.env</code> for free-form answers.'}</p></div>
      <div class="card"><div class="card-head"><h3>Studying</h3></div>
        <div class="seg" data-course>${store.courses.map((c) => `<button data-c="${c.id}" class="${c.id === course ? 'active' : ''}">${esc(c.short)}</button>`).join('')}</div>
        <div class="faint tiny" style="margin:10px 0 6px">CONTEXT Q-BOT CAN SEE</div><div class="ctx-circuit" data-ctx></div></div>
      <div class="card"><div class="card-head"><h3>Quick topics</h3></div><div class="row" style="gap:6px" data-topics></div></div>
      <p class="faint tiny" style="margin:0">${icon('mic')} Tap the mic to ask by voice, and the speaker to hear answers.</p>
      <button class="btn btn-ghost" data-clear>${icon('trash')} Clear conversation</button>
    </div>
  </div>`;
  hydrateIcons(root);
  const chat = new Chat(root.querySelector('[data-chat]'));

  function setCourse(c) {
    course = c;
    store.currentCourse = c;
    document.documentElement.style.setProperty('--course', `var(--c-${c})`);
    store.labContext = store.lastLab?.course === c ? store.lastLab : null;
    root.querySelectorAll('[data-c]').forEach((b) => b.classList.toggle('active', b.dataset.c === c));
    const ctx = root.querySelector('[data-ctx]');
    if (c === 'quantum') {
      const q = store.circuit;
      ctx.textContent = q.operations.length ? `Circuit (${q.num_qubits} qubits): ` + q.operations.map((o) => `${store.gates[o.name]?.label || o.name}${o.qubits.length ? ' q' + o.qubits.join(',q') : ''}`).join(' → ') : 'Empty circuit — build one in the Circuit Builder.';
    } else ctx.textContent = store.labContext ? `${store.labContext.title}:\n• ${store.labContext.facts.join('\n• ')}` : 'No lab result yet — run one of this course’s labs and Q-Bot will be able to explain it.';
    ctx.style.whiteSpace = 'pre-wrap';
    root.querySelector('[data-topics]').innerHTML = TOPICS[c].map((t) => `<button class="chip" style="cursor:pointer;border:0">${esc(t)}</button>`).join('');
    root.querySelectorAll('[data-topics] button').forEach((b) => b.addEventListener('click', () => chat.ask(`What is ${b.textContent}? Explain simply with an example.`)));
  }
  root.querySelector('[data-course]').addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) setCourse(b.dataset.c); });
  root.querySelector('[data-clear]').addEventListener('click', () => { store.set('chat', []); toast('Conversation cleared'); });
  setCourse(course);
  return () => chat.destroy();
}
