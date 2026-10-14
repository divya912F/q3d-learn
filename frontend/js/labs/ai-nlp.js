// AI lab: n-gram next-word predictor — how language models choose words, with a temperature dial.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, debounce, hydrateIcons } from '../ui.js';
import { hbars } from '../charts.js';
import { controls, setLabContext, metric } from './kit.js';

export const meta = {
  howto: [
    'The model counts which words follow which in the training text (edit it if you like).',
    'Type a prompt and look at the probability of every possible next word.',
    'Generate: each new word is sampled from that distribution, one token at a time — just like an LLM.',
    'Click any generated word to see the choices the model had at that step.',
    'Turn the temperature down (predictable) or up (creative / random).',
  ],
};

export async function mount(root, { preset = {} } = {}) {
  const st = { prompt: 'the students', n: 2, temperature: 0.8, length: 15, seed: 0, text: null, ...preset };
  let res = null;
  let active = null;
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <button class="btn btn-course btn-lg" data-gen>${icon('sparkle')} Generate</button>
      <details class="card card-tight"><summary class="small" style="cursor:pointer"><b>Training text</b> <span class="faint">(edit me)</span></summary>
        <textarea class="input mono" rows="10" style="margin-top:8px;font-size:.78rem" data-text></textarea>
        <button class="btn btn-ghost btn-sm" style="margin-top:6px" data-reset>Reset to default corpus</button></details></div>
    <div class="stack" style="min-width:0">
      <div class="card paper-lines" style="padding-left:62px">
        <div class="card-head"><h3>${icon('chat')} Generated text</h3><span class="faint small">click a word to inspect it</span></div>
        <div class="tokens" data-tokens></div>
      </div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
        <div class="card"><div class="card-head"><h3 data-steptitle>Next-word probabilities</h3></div><div data-probs></div><p class="faint tiny" data-stepnote style="margin:8px 0 0"></p></div>
        <div class="card"><div class="card-head"><h3>Model stats</h3></div><div class="metrics" data-metrics></div>
          <div class="small muted" style="margin-top:12px">Most common words</div><div class="tokens" data-top style="margin-top:6px"></div></div>
      </div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  controls($('[data-ctl]'), [
    { type: 'text', key: 'prompt', label: 'Prompt' },
    { type: 'seg', key: 'n', label: 'Context (n-gram)', numeric: true, options: [[1, 'unigram'], [2, 'bigram'], [3, 'trigram']] },
    { type: 'slider', key: 'temperature', label: 'Temperature', min: 0, max: 2, step: 0.05, fmt: (v) => (v <= 0.01 ? '0 (greedy)' : v.toFixed(2)) },
    { type: 'slider', key: 'length', label: 'Words to generate', min: 1, max: 40, step: 1 },
  ], st, (k, v, live) => { if (!live) gen(); });

  async function gen() {
    try {
      res = await api.lab('ai/lm', { prompt: st.prompt, n: st.n, temperature: st.temperature, length: st.length, seed: st.seed, text: st.text || undefined }, store.user?.id);
      active = null;
      render();
    } catch (e) { toast(e.message, 'error'); }
  }

  function render() {
    const prompt = st.prompt.toLowerCase().match(/[a-z0-9']+|[.!?]/g) || [];
    $('[data-tokens]').innerHTML = prompt.map((t) => `<span class="token prompt">${esc(t)}</span>`).join('')
      + res.generated.map((t, i) => `<span class="token gen ${active === i ? 'active' : ''}" data-i="${i}">${esc(t)}</span>`).join('')
      + (res.generated.length ? '' : '<span class="faint">The model has never seen these words — try another prompt.</span>');
    if (active == null) {
      $('[data-steptitle]').textContent = `After “${st.prompt}” the model predicts…`;
      hbars($('[data-probs]'), res.next.map(([w, p]) => ({ label: w, value: p })), { fmt: (v) => `${(v * 100).toFixed(1)}%`, max: 1 });
      $('[data-stepnote]').textContent = 'These are raw probabilities (temperature 1).';
    } else {
      const s = res.steps[active];
      $('[data-steptitle]').textContent = `Step ${active + 1}: after “${s.context.join(' ') || '(nothing)'}”`;
      $('[data-probs]').innerHTML = '';
      hbars($('[data-probs]'), s.top.map(([w, p]) => ({ label: (w === s.chosen ? '✓ ' : '') + w, value: p, color: w === s.chosen ? 'var(--amber)' : undefined })), { fmt: (v) => `${(v * 100).toFixed(1)}%`, max: 1 });
      $('[data-stepnote]').textContent = `Probabilities after applying temperature ${st.temperature}. ${s.backoff < st.n - 1 ? 'The full context was never seen, so the model backed off to a shorter context.' : ''} The model picked “${s.chosen}”.`;
    }
    $('[data-metrics]').innerHTML = metric('Training tokens', res.tokens) + metric('Vocabulary', res.vocab_size) + metric('Context', `${res.n - 1} word${res.n === 2 ? '' : 's'}`);
    $('[data-top]').innerHTML = res.top_words.map(([w, c]) => `<span class="token">${esc(w)} <span class="faint">${c}</span></span>`).join('');
    setLabContext('nlp', 'Next-word predictor', [
      `${res.n}-gram model trained on ${res.tokens} tokens (vocabulary ${res.vocab_size})`,
      `Prompt “${st.prompt}”; most likely next words: ${res.next.slice(0, 5).map(([w, p]) => `${w} ${(p * 100).toFixed(0)}%`).join(', ')}`,
      `Temperature ${st.temperature}; generated: “${res.generated.join(' ')}”`,
    ]);
  }

  $('[data-tokens]').addEventListener('click', (e) => { const t = e.target.closest('[data-i]'); if (!t) return; active = active === +t.dataset.i ? null : +t.dataset.i; render(); });
  $('[data-gen]').addEventListener('click', () => { st.seed += 1; gen(); });
  const ta = $('[data-text]');
  ta.placeholder = 'Leave empty to use the built-in study-themed corpus, or paste any English text…';
  ta.addEventListener('input', debounce(() => { st.text = ta.value.trim() || null; gen(); }, 600));
  $('[data-reset]').addEventListener('click', () => { ta.value = ''; st.text = null; gen(); });
  await gen();
  return { getConfig: () => ({ ...st }), destroy: () => {} };
}
