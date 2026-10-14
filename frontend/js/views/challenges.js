// Challenges: prepare a target state, get fidelity-based feedback, earn XP.
import { api } from '../api.js';
import { store } from '../store.js';
import { CircuitEditor, renderPalette } from '../circuit/editor.js';
import { histogram, gauge } from '../charts.js';
import { esc, icon, toast, confetti, debounce, hydrateIcons } from '../ui.js';
import { navigate, openDrawer } from '../main.js';

const DIFF = { Easy: 'green', Medium: 'amber', Hard: 'pink' };

export async function render(root, { params }) {
  const list = await api.challenges();
  let solved = new Set();
  if (store.user) {
    try { solved = new Set((await api.progress(store.user.id)).challenges_solved); } catch { /* guest */ }
  }
  if (!params[0]) return renderList(root, list, solved);
  const ch = list.find((c) => c.id === params[0]);
  if (!ch) { navigate('/challenges'); return undefined; }
  return renderChallenge(root, ch, solved.has(ch.id), list);
}

function renderList(root, list, solved) {
  const pts = list.filter((c) => solved.has(c.id)).reduce((a, c) => a + c.points, 0);
  root.innerHTML = `
    <div class="row-between" style="margin-bottom:18px">
      <div><h2 style="margin:0">Quantum Challenges</h2><p class="muted" style="margin:4px 0 0">Build a circuit that prepares the target state. Fidelity ≥ 99% wins.</p></div>
      <div class="card card-tight row" style="gap:18px"><div><div class="faint tiny">SOLVED</div><b style="font-size:1.3rem">${solved.size}/${list.length}</b></div><div><div class="faint tiny">XP EARNED</div><b style="font-size:1.3rem;color:var(--amber)">${pts}</b></div></div>
    </div>
    <div class="grid ch-grid">${list.map((c) => `
      <div class="card ch-card${solved.has(c.id) ? ' solved' : ''}" data-id="${c.id}" tabindex="0">
        ${solved.has(c.id) ? `<span class="solved-badge">${icon('checkCircle')}</span>` : ''}
        <div class="row" style="gap:6px;margin-bottom:10px"><span class="chip ${DIFF[c.difficulty]}">${c.difficulty}</span><span class="chip gray">${c.num_qubits} qubit${c.num_qubits > 1 ? 's' : ''}</span><span class="chip amber">${c.points} XP</span></div>
        <h3>${esc(c.title)}</h3>
        <p class="muted small" style="margin-bottom:10px">${esc(c.description)}</p>
        <div class="ket" style="font-size:1.05rem">Target: ${esc(c.target_label)}</div>
        ${c.allowed_gates ? `<div class="faint tiny" style="margin-top:6px">Allowed: ${c.allowed_gates.map((g) => g.toUpperCase()).join(', ')}</div>` : ''}
      </div>`).join('')}</div>`;
  root.querySelectorAll('[data-id]').forEach((c) => {
    const go = () => navigate(`/challenges/${c.dataset.id}`);
    c.addEventListener('click', go);
    c.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  });
  return undefined;
}

function renderChallenge(root, ch, wasSolved, list) {
  store.context.challenge_id = ch.id;
  const idx = list.findIndex((c) => c.id === ch.id);
  const next = list[idx + 1];
  root.innerHTML = `
    <div class="row" style="margin-bottom:14px"><a href="#/challenges" class="btn btn-ghost btn-sm">← All challenges</a>
      ${next ? `<a href="#/challenges/${next.id}" class="btn btn-ghost btn-sm">Next: ${esc(next.title)} →</a>` : ''}</div>
    <div class="alg-layout">
      <div class="stack">
        <div class="card">
          <div class="row" style="gap:6px;margin-bottom:10px"><span class="chip ${DIFF[ch.difficulty]}">${ch.difficulty}</span><span class="chip amber">${ch.points} XP</span>${wasSolved ? '<span class="chip green">✓ solved before</span>' : ''}</div>
          <h2>${esc(ch.title)}</h2>
          <p class="muted">${esc(ch.description)}</p>
          <div class="target-box"><div class="faint tiny">TARGET STATE</div><div class="ket">${esc(ch.target_label)}</div></div>
          <div class="row" style="margin-top:10px;gap:8px">
            ${ch.allowed_gates ? `<span class="chip violet">Only ${ch.allowed_gates.map((g) => g.toUpperCase()).join(' + ')}</span>` : ''}
            ${ch.max_gates ? `<span class="chip violet">≤ ${ch.max_gates} gate${ch.max_gates > 1 ? 's' : ''}</span>` : ''}
          </div>
          <div class="row" style="margin-top:16px">
            <button class="btn btn-success" data-check>${icon('check')} Check solution</button>
            <button class="btn btn-ghost btn-sm" data-hint>${icon('bulb')} Hint</button>
            <button class="btn btn-ghost btn-sm" data-ask>${icon('bot')} Ask Q-Bot</button>
          </div>
          <div data-hinttext class="callout tip" hidden><i data-icon="bulb"></i><div>${esc(ch.hint)}</div></div>
        </div>
        <div class="card" data-verdict hidden></div>
      </div>
      <div style="min-width:0">
        <div class="builder-layout">
          <div data-palette></div>
          <div style="min-width:0">
            <div data-circuit></div>
            <div class="card" style="margin-top:14px">
              <div class="card-head"><h3>Your state (live)</h3><span class="chip gray" data-statename>|${'0'.repeat(ch.num_qubits)}⟩</span></div>
              <div class="state-big ket" data-ket>|${'0'.repeat(ch.num_qubits)}⟩</div>
              <div data-hist style="margin-top:10px"></div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);

  const preview = debounce(async (c) => {
    try {
      const r = await api.labState({ num_qubits: c.num_qubits, operations: c.operations.filter((o) => o.name !== 'measure') });
      $('[data-ket]').textContent = r.analysis.ket;
      $('[data-statename]').textContent = r.analysis.name;
      histogram($('[data-hist]'), Object.entries(r.probabilities).sort().map(([k, v]) => ({ label: k, value: v })), { height: 200 });
    } catch (e) { $('[data-ket]').textContent = e.message; }
  }, 250);

  const editor = new CircuitEditor($('[data-circuit]'), {
    numQubits: ch.num_qubits, operations: [], allowed: ch.allowed_gates, minQubits: ch.num_qubits, maxQubits: ch.num_qubits,
    onChange: (c) => { store.set('circuit', c); preview(c); },
  });
  renderPalette($('[data-palette]'), editor, { allowed: ch.allowed_gates });
  preview(editor.circuit);

  $('[data-hint]').addEventListener('click', () => { $('[data-hinttext]').hidden = false; });
  $('[data-ask]').addEventListener('click', () => { store.set('circuit', editor.circuit); openDrawer(`I'm stuck on the challenge "${ch.title}". Can you give me a hint based on my current circuit?`); });
  $('[data-check]').addEventListener('click', async () => {
    try {
      const res = await api.checkChallenge(ch.id, editor.circuit, store.user?.id);
      const v = $('[data-verdict]');
      v.hidden = false;
      v.innerHTML = `<div class="center">${gauge(res.fidelity)}</div>
        <h3 class="center" style="margin-top:6px;color:${res.solved ? 'var(--green)' : 'var(--amber)'}">${res.solved ? `Solved! +${res.points} XP` : 'Not quite yet'}</h3>
        <ul class="muted small" style="padding-left:18px;margin:0">${res.feedback.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
        ${res.solved && next ? `<a class="btn btn-primary btn-sm" style="margin-top:12px" href="#/challenges/${next.id}">Next challenge →</a>` : ''}
        ${!store.user && res.solved ? '<p class="faint tiny" style="margin-top:8px">Create a profile to keep your XP.</p>' : ''}`;
      if (res.solved) { confetti(); toast(`Challenge solved: ${esc(ch.title)}!`, 'success'); }
    } catch (e) { toast(e.message, 'error'); }
  });

  return () => editor.destroy();
}
