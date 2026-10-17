// Q-Bot chat (used by the AI Tutor page and the slide-out drawer). Text + voice.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, markdown, toast, initials, hydrateIcons } from '../ui.js';

const WELCOME = "Hi! I'm **Q-Bot**, your study buddy across all eight courses — Quantum, Machine Learning, Data Science, AI, Data Structures & Algorithms, Cybersecurity, Blockchain and Deep Learning. Ask me about any concept — or about the lab you're using: I can see your circuit, model or experiment and its *real* results, so my explanations stay grounded.";
const STARTERS_BY_COURSE = {
  quantum: ['What happens when I apply H to |0⟩?', 'What is entanglement?', 'Explain my circuit step by step'],
  ml: ['What does the learning rate do?', 'Explain my latest lab result', 'What is overfitting?'],
  ds: ['When should I use the median?', 'Is correlation causation?', 'Explain my latest lab result'],
  ai: ['Why is A* faster than BFS?', 'What does epsilon do in Q-learning?', 'Explain my latest lab result'],
  dsa: ['What is Big-O notation?', 'When does binary search work?', 'What is dynamic programming?'],
  cyber: ['What is phishing?', 'How does RSA work?', 'Why salt a password hash?'],
  chain: ['What is proof of work?', 'Explain re-entrancy', 'Proof of work vs proof of stake?'],
  dl: ['What is a transformer?', 'How does backpropagation work?', 'What is a convolution?'],
};
const STARTERS = ['What is a qubit?', 'What is dynamic programming?', 'How does A* search work?', 'What is a transformer?'];

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

function plain(md) {
  return md.replace(/[*_`#>]/g, '').replace(/\|([01+\-−i]+)⟩/g, ' ket $1 ').replace(/\n+/g, '. ');
}

export function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(plain(text).slice(0, 1200));
  u.rate = 1.03;
  window.speechSynthesis.speak(u);
}

export class Chat {
  constructor(root, { compact = false } = {}) {
    this.root = root;
    this.compact = compact;
    this.busy = false;
    this.suggestions = STARTERS_BY_COURSE[store.currentCourse] || STARTERS;
    root.innerHTML = `<div class="chat">
      <div class="chat-log" data-log aria-live="polite"></div>
      <div class="chat-suggest" data-suggest></div>
      <div class="chat-input">
        ${SR ? `<button class="icon-btn mic-btn" data-mic title="Speak your question">${icon('mic')}</button>` : ''}
        <textarea class="input" rows="1" placeholder="Ask about qubits, gates, your circuit…" data-input></textarea>
        <button class="icon-btn" data-voice title="Read answers aloud">${icon(store.voice ? 'volume' : 'mute')}</button>
        <button class="btn btn-primary" data-send aria-label="Send">${icon('send')}</button>
      </div></div>`;
    this.log = root.querySelector('[data-log]');
    this.input = root.querySelector('[data-input]');
    this.bind();
    this.renderLog();
    this.renderSuggest();
    this.unsub = store.on('chat', () => this.renderLog());
  }

  bind() {
    const send = () => { const q = this.input.value.trim(); if (q) { this.input.value = ''; this.autosize(); this.ask(q); } };
    this.root.querySelector('[data-send]').addEventListener('click', send);
    this.input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    this.input.addEventListener('input', () => this.autosize());
    this.root.querySelector('[data-voice]').addEventListener('click', (e) => {
      store.set('voice', !store.voice);
      e.currentTarget.innerHTML = icon(store.voice ? 'volume' : 'mute');
      if (!store.voice) window.speechSynthesis?.cancel();
      toast(store.voice ? 'Q-Bot will read answers aloud' : 'Voice output off', 'info', 1500);
    });
    const mic = this.root.querySelector('[data-mic]');
    if (mic) {
      mic.addEventListener('click', () => {
        if (this.rec) { this.rec.stop(); return; }
        const rec = new SR();
        rec.lang = navigator.language || 'en-US';
        rec.interimResults = true;
        rec.onresult = (e) => {
          const text = [...e.results].map((r) => r[0].transcript).join(' ');
          this.input.value = text;
          if (e.results[e.results.length - 1].isFinal) { rec.stop(); this.ask(text); this.input.value = ''; }
        };
        rec.onerror = (e) => toast(`Voice input error: ${e.error}`, 'error');
        rec.onend = () => { mic.classList.remove('listening'); this.rec = null; };
        rec.start();
        this.rec = rec;
        mic.classList.add('listening');
      });
    }
  }

  autosize() {
    this.input.style.height = 'auto';
    this.input.style.height = `${Math.min(140, this.input.scrollHeight)}px`;
  }

  renderLog() {
    const msgs = store.chat.length ? store.chat : [{ role: 'assistant', content: WELCOME }];
    const me = initials(store.user?.name || 'You');
    this.log.innerHTML = msgs.map((m, i) => m.role === 'user'
      ? `<div class="msg user"><div class="who">${esc(me)}</div><div class="bubble">${esc(m.content)}</div></div>`
      : `<div class="msg bot"><div class="who"><i data-icon="bot"></i></div><div><div class="bubble">${markdown(m.content)}</div>
          <div class="msg-meta">${m.provider ? `<span class="chip gray">${esc(m.provider)}</span>` : ''}
          <button data-speak="${i}" title="Read aloud">${icon('volume')} Listen</button></div>
          ${m.facts?.length ? `<details class="facts"><summary>Grounded on ${m.facts.length} simulation facts</summary><ul>${m.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></details>` : ''}
          ${m.notice ? `<div class="faint tiny">${esc(m.notice)}</div>` : ''}</div></div>`).join('')
      + (this.busy ? '<div class="msg bot"><div class="who"><i data-icon="bot"></i></div><div class="bubble typing"><span></span><span></span><span></span></div></div>' : '');
    hydrateIcons(this.log);
    this.log.querySelectorAll('[data-speak]').forEach((b) => b.addEventListener('click', () => speak(msgs[+b.dataset.speak].content)));
    this.log.scrollTop = this.log.scrollHeight;
  }

  renderSuggest() {
    const box = this.root.querySelector('[data-suggest]');
    box.innerHTML = this.suggestions.map((s) => `<button>${esc(s)}</button>`).join('');
    box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => this.ask(b.textContent)));
  }

  async ask(question) {
    if (this.busy) return;
    const history = store.chat.slice(-8).map(({ role, content }) => ({ role, content }));
    store.set('chat', [...store.chat, { role: 'user', content: question }]);
    this.busy = true;
    this.renderLog();
    // Quantum: in the 3D Lab the tutor discusses the lab qubit; elsewhere, the builder circuit.
    const course = store.currentCourse;
    const src = store.labCircuit?.operations?.length ? store.labCircuit : store.circuit;
    const circuit = (course === 'quantum' || !course) && src?.operations?.length ? src : null;
    try {
      const res = await api.ask({
        question, circuit, history,
        lesson_id: store.context.lesson_id, challenge_id: store.context.challenge_id,
        user_id: store.user?.id, course, lab: store.labContext || undefined,
      });
      this.busy = false;
      store.set('chat', [...store.chat, { role: 'assistant', content: res.answer, provider: res.provider, facts: res.facts, notice: res.notice }]);
      if (res.suggestions?.length) { this.suggestions = res.suggestions; this.renderSuggest(); }
      if (store.voice) speak(res.answer);
    } catch (e) {
      this.busy = false;
      store.set('chat', [...store.chat, { role: 'assistant', content: `Sorry — I couldn't reach the server (${e.message}).` }]);
    }
  }

  destroy() { this.unsub?.(); this.rec?.stop(); }
}
