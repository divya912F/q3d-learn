// AI Tutor page: full-size chat plus the context Q-Bot is grounded on.
import { Chat } from '../components/chat.js';
import { store } from '../store.js';
import { esc, icon, hydrateIcons, toast } from '../ui.js';

const TOPICS = ['Superposition', 'Bloch sphere', 'Hadamard gate', 'Measurement', 'Entanglement', 'CNOT', 'Interference', 'Phase', 'Grover search', 'Deutsch–Jozsa', 'Teleportation', 'No-cloning'];

export async function render(root) {
  const sys = store.system;
  const c = store.circuit;
  const desc = c.operations.length
    ? c.operations.map((o) => `${store.gates[o.name]?.label || o.name}${o.qubits.length ? ' q' + o.qubits.join(',q') : ''}`).join(' → ')
    : 'Empty — build something in the Circuit Builder and Q-Bot will be able to explain it.';
  root.innerHTML = `<div class="tutor-layout">
    <div class="card" style="padding:0;display:flex;flex-direction:column;min-height:0" data-chat></div>
    <div class="stack" style="overflow-y:auto">
      <div class="card">
        <div class="card-head"><h3>${icon('bot')} Q-Bot</h3><span class="chip ${sys?.ai_provider === 'offline' ? 'gray' : 'green'}">${esc(sys?.ai_provider || 'offline')}</span></div>
        <p class="muted small">${sys?.ai_provider && sys.ai_provider !== 'offline'
          ? `Answers come from <b>${esc(sys.ai_provider)}</b>, grounded on exact simulation facts and validated notes to prevent hallucinations.`
          : 'Running the built-in <b>offline tutor</b>: concept explanations from a validated knowledge base, plus live analysis of your circuit. Add <code>OPENAI_API_KEY</code> or <code>GEMINI_API_KEY</code> to <code>.env</code> for free-form LLM answers.'}</p>
        <p class="faint tiny" style="margin:0">${icon('mic')} Tap the mic to ask by voice, and the speaker to hear answers.</p>
      </div>
      <div class="card">
        <div class="card-head"><h3>Context</h3><a href="#/builder" class="btn btn-ghost btn-sm">Edit</a></div>
        <div class="faint tiny" style="margin-bottom:6px">CURRENT CIRCUIT · ${c.num_qubits} QUBIT${c.num_qubits > 1 ? 'S' : ''}</div>
        <div class="ctx-circuit">${esc(desc)}</div>
        <p class="faint tiny" style="margin:8px 0 0">Q-Bot re-simulates this circuit before answering, so numbers it quotes are exact.</p>
      </div>
      <div class="card">
        <div class="card-head"><h3>Quick topics</h3></div>
        <div class="row" style="gap:6px" data-topics>${TOPICS.map((t) => `<button class="chip" style="cursor:pointer">${esc(t)}</button>`).join('')}</div>
      </div>
      <button class="btn btn-ghost" data-clear>${icon('trash')} Clear conversation</button>
    </div>
  </div>`;
  hydrateIcons(root);
  const chat = new Chat(root.querySelector('[data-chat]'));
  root.querySelectorAll('[data-topics] button').forEach((b) => b.addEventListener('click', () => chat.ask(`What is ${b.textContent}? Explain simply.`)));
  root.querySelector('[data-clear]').addEventListener('click', () => { store.set('chat', []); toast('Conversation cleared'); });
  return () => chat.destroy();
}
