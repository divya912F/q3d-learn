// Challenges for every course: circuit puzzles (quantum), embedded-lab tasks and investigation questions.
import { api } from '../api.js';
import { store } from '../store.js';
import { CircuitEditor, renderPalette } from '../circuit/editor.js';
import { histogram, gauge } from '../charts.js';
import { esc, icon, toast, confetti, debounce, hydrateIcons } from '../ui.js';
import { navigate, openDrawer, openLab, refreshProgress } from '../main.js';
import { LAB_MODULES } from './labview.js';

const DIFF = { Easy: 'green', Medium: 'amber', Hard: 'pink' };

export async function render(root, { params, course }) {
  const list = await api.challenges(course);
  let solved = new Set();
  if (store.user) {
    try { solved = new Set((await refreshProgress()).courses[course].challenges_solved); } catch { /* guest */ }
  }
  if (!params[0]) return renderList(root, list, solved, course);
  const ch = list.find((c) => c.id === params[0]);
  if (!ch) { navigate(`/c/${course}/challenges`); return undefined; }
  store.context.challenge_id = ch.id;
  if (ch.kind === 'circuit') return renderCircuit(root, ch, solved.has(ch.id), list, course);
  return renderGeneric(root, ch, solved.has(ch.id), list, course);
}

function renderList(root, list, solved, course) {
  const meta = store.courseMeta(course);
  const pts = list.filter((c) => solved.has(c.id)).reduce((a, c) => a + c.points, 0);
  root.innerHTML = `
    <div class="row-between" style="margin-bottom:18px">
      <div><span class="hand" style="font-size:1.3rem;color:var(--course)">${esc(meta.title)}</span><h2 style="margin:0">Challenges</h2><p class="muted" style="margin:4px 0 0">Auto-graded puzzles. Investigate in the labs, then prove it here.</p></div>
      <div class="card card-tight row" style="gap:18px"><div><div class="faint tiny">SOLVED</div><b style="font-size:1.3rem">${solved.size}/${list.length}</b></div><div><div class="faint tiny">XP EARNED</div><b style="font-size:1.3rem;color:var(--amber)">${pts}</b></div></div>
    </div>
    <div class="grid ch-grid">${list.map((c) => `
      <div class="card ch-card${solved.has(c.id) ? ' solved' : ''}" data-id="${c.id}" tabindex="0">
        <div class="row" style="gap:6px;margin-bottom:10px"><span class="chip ${DIFF[c.difficulty]}">${c.difficulty}</span><span class="chip amber">${c.points} XP</span><span class="chip gray">${c.kind === 'answer' ? 'investigate' : c.kind === 'lab' ? 'lab task' : `${c.num_qubits} qubit${c.num_qubits > 1 ? 's' : ''}`}</span></div>
        <h3>${esc(c.title)}</h3>
        <p class="muted small" style="margin-bottom:10px">${esc(c.description)}</p>
        <div class="small"><b>Goal:</b> ${esc(c.goal || (c.target_label ? `prepare ${c.target_label}` : ''))}</div>
      </div>`).join('')}</div>`;
  root.querySelectorAll('[data-id]').forEach((c) => {
    const go = () => navigate(`/c/${course}/challenges/${c.dataset.id}`);
    c.addEventListener('click', go);
    c.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  });
  return undefined;
}

function header(ch, wasSolved, list, course) {
  const idx = list.findIndex((c) => c.id === ch.id);
  const next = list[idx + 1];
  return {
    next,
    nav: `<div class="row" style="margin-bottom:14px"><a href="#/c/${course}/challenges" class="btn btn-ghost btn-sm">← All challenges</a>
      ${next ? `<a href="#/c/${course}/challenges/${next.id}" class="btn btn-ghost btn-sm">Next: ${esc(next.title)} →</a>` : ''}</div>`,
    card: `<div class="row" style="gap:6px;margin-bottom:10px"><span class="chip ${DIFF[ch.difficulty]}">${ch.difficulty}</span><span class="chip amber">${ch.points} XP</span>${wasSolved ? '<span class="chip green">✓ solved before</span>' : ''}</div>
      <h2>${esc(ch.title)}</h2><p class="muted">${esc(ch.description)}</p>`,
  };
}

function verdictHTML(res, next, course, label = 'score') {
  const val = res.fidelity ?? res.score ?? 0;
  return `<div class="center">${gauge(val, label)}</div>
    <h3 class="center" style="margin-top:6px;color:${res.solved ? 'var(--green)' : 'var(--amber)'}">${res.solved ? `Solved! +${res.points} XP` : 'Not quite yet'}</h3>
    <ul class="muted small" style="padding-left:18px;margin:0">${res.feedback.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
    ${res.solved && next ? `<a class="btn btn-course btn-sm" style="margin-top:12px" href="#/c/${course}/challenges/${next.id}">Next challenge →</a>` : ''}
    ${!store.user && res.solved ? '<p class="faint tiny" style="margin-top:8px">Create a profile to keep your XP.</p>' : ''}`;
}

/* ---------------------------------------------------------- answer & lab challenges */
async function renderGeneric(root, ch, wasSolved, list, course) {
  const h = header(ch, wasSolved, list, course);
  let answer = null;
  let labInst = null;
  root.innerHTML = `${h.nav}
    <div class="${ch.kind === 'lab' ? 'stack' : 'alg-layout'}">
      <div class="stack" style="${ch.kind === 'lab' ? '' : ''}">
        <div class="card"><span class="tape"></span>${h.card}
          <div class="target-box"><div class="faint tiny">GOAL</div><b>${esc(ch.goal)}</b></div>
          <div class="row" style="margin-top:14px">
            ${ch.kind === 'answer' ? '' : `<button class="btn btn-success" data-check>${icon('check')} Check my solution</button>`}
            <button class="btn btn-ghost btn-sm" data-hint>${icon('bulb')} Hint</button>
            <button class="btn btn-ghost btn-sm" data-ask>${icon('bot')} Ask Q-Bot</button>
            ${ch.open_lab ? `<button class="btn btn-ghost btn-sm" data-open>${icon('flask')} Investigate in the lab</button>` : ''}
          </div>
          <div class="callout tip" data-hinttext hidden><i data-icon="bulb"></i><div>${esc(ch.hint)}</div></div>
        </div>
        <div class="card" data-verdict hidden></div>
      </div>
      <div data-work style="min-width:0"></div>
    </div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  $('[data-hint]').addEventListener('click', () => { $('[data-hinttext]').hidden = false; });
  $('[data-ask]').addEventListener('click', () => openDrawer(`I'm working on the challenge "${ch.title}". Can you give me a hint (not the answer)?`));
  $('[data-open]')?.addEventListener('click', () => openLab(course, ch.open_lab.lab, ch.open_lab.preset));

  const check = async (payload) => {
    try {
      const res = await api.checkChallenge(course, ch.id, payload, store.user?.id);
      const v = $('[data-verdict]');
      v.hidden = false;
      v.innerHTML = verdictHTML(res, h.next, course);
      if (res.solved) { confetti(); toast(`Challenge solved: ${esc(ch.title)}!`, 'success'); refreshProgress(); }
      v.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) { toast(e.message, 'error'); }
  };

  const work = $('[data-work]');
  if (ch.kind === 'answer') {
    work.innerHTML = `<div class="card"><div class="card-head"><h3>${icon('pencil')} Your answer</h3></div>
      ${ch.board ? miniBoard(ch.board) : ''}
      ${ch.answer_type === 'choice'
        ? `<div class="choice-grid" data-choices>${ch.options.map((o) => `<button class="quiz-opt" data-v="${esc(o)}">${ch.board ? `square ${esc(o)}` : esc(o)}</button>`).join('')}</div>`
        : '<div class="row"><input class="input mono" style="max-width:200px" type="number" step="any" data-num placeholder="your number"></div>'}
      <button class="btn btn-success" style="margin-top:14px" data-submit>${icon('check')} Submit answer</button></div>`;
    work.querySelectorAll('[data-v]').forEach((b) => {
      const taken = ch.board && ch.board[+b.dataset.v];
      if (taken) b.disabled = true;
      b.addEventListener('click', () => { answer = b.dataset.v; work.querySelectorAll('[data-v]').forEach((x) => x.classList.toggle('selected', x === b)); });
    });
    work.querySelector('[data-submit]').addEventListener('click', () => {
      const v = ch.answer_type === 'choice' ? answer : work.querySelector('[data-num]').value;
      if (v == null || v === '') { toast('Choose or type an answer first.', 'info'); return; }
      check({ answer: v });
    });
  } else {
    const loader = LAB_MODULES[course]?.[ch.lab];
    work.innerHTML = '<div data-lab></div>';
    const mod = await loader();
    labInst = await mod.mount(work.querySelector('[data-lab]'), { preset: { ...ch.preset }, lock: ch.lock || [] });
    $('[data-check]').addEventListener('click', () => check({ config: labInst.getConfig() }));
  }
  return () => labInst?.destroy?.();
}

function miniBoard(b) {
  return `<div class="board" style="padding:14px;margin-bottom:14px"><div class="ttt" style="width:200px">${b.map((v, i) => `<button disabled style="font-size:2rem"><span class="${v === 'X' ? 'x' : 'o'}">${v}</span>${v ? '' : `<span class="score" style="color:var(--board-text-2)">${i}</span>`}</button>`).join('')}</div></div>`;
}

/* ---------------------------------------------------------- quantum circuit challenges */
function renderCircuit(root, ch, wasSolved, list, course) {
  const h = header(ch, wasSolved, list, course);
  root.innerHTML = `${h.nav}
    <div class="alg-layout">
      <div class="stack">
        <div class="card"><span class="tape"></span>${h.card}
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
          <div class="callout tip" data-hinttext hidden><i data-icon="bulb"></i><div>${esc(ch.hint)}</div></div>
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
      const res = await api.checkChallenge(course, ch.id, editor.circuit, store.user?.id);
      const v = $('[data-verdict]');
      v.hidden = false;
      v.innerHTML = verdictHTML(res, h.next, course, 'fidelity');
      if (res.solved) { confetti(); toast(`Challenge solved: ${esc(ch.title)}!`, 'success'); refreshProgress(); }
    } catch (e) { toast(e.message, 'error'); }
  });
  return () => editor.destroy();
}
