// AI lab: tic-tac-toe against minimax with alpha–beta pruning, showing the score of every move.
import { api } from '../api.js';
import { store } from '../store.js';
import { icon, toast, hydrateIcons } from '../ui.js';
import { controls, setLabContext, metric } from './kit.js';

export const meta = {
  howto: [
    'You play X, the AI plays O. Click a square to move.',
    'Turn on “Show move scores” to see minimax’s evaluation of every empty square (+ win, 0 draw, − loss).',
    'Lower the look-ahead depth to make the AI short-sighted (and beatable!).',
    'Compare how many positions are searched with and without alpha–beta pruning.',
  ],
};

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

function winner(b) {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return { who: b[a], line: [a, c, d] };
  return b.every(Boolean) ? { who: 'draw', line: [] } : null;
}

export async function mount(root, { preset = {} } = {}) {
  const st = { depth: 9, alpha_beta: true, hints: !!preset.board, ai_first: false, ...preset };
  let board = preset.board ? [...preset.board] : Array(9).fill('');
  let turn = preset.turn || 'X';
  let scores = null;
  let busy = false;
  let record = { you: 0, ai: 0, draw: 0 };
  root.innerHTML = `<div class="lab-grid three">
    <div class="stack"><div class="card controls" data-ctl></div>
      <button class="btn btn-course" data-new>${icon('reset')} New game</button>
      <div class="card card-tight sticky small">Perfect tic-tac-toe is always a draw — with full look-ahead you can't beat the AI. Try depth 1 or 2!</div></div>
    <div class="board" style="padding:24px">
      <div class="row-between" style="margin-bottom:14px"><b class="hand" style="font-size:1.6rem" data-status>Your move (X)</b><span class="chip gray" data-score></span></div>
      <div class="ttt" data-board></div>
      <p class="tiny" style="color:var(--board-text-2);text-align:center;margin:14px 0 0">Scores are from the point of view of the player to move: higher = better for them.</p>
    </div>
    <div class="stack">
      <div class="card"><div class="card-head"><h3>AI's thinking</h3></div><div class="metrics" data-metrics><div class="empty small">Make a move.</div></div><div data-prune style="margin-top:12px"></div></div>
      <div class="card"><div class="card-head"><h3>How minimax scores</h3></div><p class="small muted" style="margin:0">A win scores <b>10 − depth</b> (faster wins are better), a loss <b>depth − 10</b>, a draw <b>0</b>. Each player assumes the other plays perfectly.</p></div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  controls($('[data-ctl]'), [
    { type: 'slider', key: 'depth', label: 'Look-ahead depth', min: 1, max: 9, step: 1 },
    { type: 'toggle', key: 'alpha_beta', label: 'Alpha–beta pruning' },
    { type: 'toggle', key: 'hints', label: 'Show move scores' },
    { type: 'toggle', key: 'ai_first', label: 'AI moves first' },
  ], st, (k) => { if (k === 'hints') analyse(); if (k === 'ai_first') reset(); });

  function render() {
    const w = winner(board);
    $('[data-board]').innerHTML = board.map((v, i) => {
      const s = scores && !v && st.hints ? scores[String(i)] : undefined;
      const col = s == null ? '' : s > 0 ? 'background:rgba(56,217,169,.85);color:#06281e' : s < 0 ? 'background:rgba(255,107,107,.85);color:#2a0606' : 'background:rgba(233,241,238,.25);color:#e9f1ee';
      return `<button data-i="${i}" class="${w?.line.includes(i) ? 'win' : ''}" ${v || w || busy || turn !== 'X' ? 'disabled' : ''}>
        <span class="${v === 'X' ? 'x' : 'o'}">${v}</span>${s != null ? `<span class="score" style="${col}">${s > 0 ? '+' : ''}${s}</span>` : ''}</button>`;
    }).join('');
    $('[data-score]').textContent = `You ${record.you} · AI ${record.ai} · Draw ${record.draw}`;
    const status = $('[data-status]');
    if (w) status.textContent = w.who === 'draw' ? "It's a draw! 🤝" : w.who === 'X' ? 'You win! 🎉' : 'AI wins 🤖';
    else status.textContent = busy ? 'AI is thinking…' : turn === 'X' ? 'Your move (X)' : 'AI to move (O)';
  }

  async function analyse(player = turn) {
    if (winner(board)) { scores = null; render(); return null; }
    const r = await api.lab('ai/minimax', { board, player, alpha_beta: st.alpha_beta, max_depth: st.depth }, store.user?.id);
    scores = player === 'X' || preset.turn === 'O' ? r.scores : null;
    if (player === turn) scores = r.scores;
    $('[data-metrics]').innerHTML = metric('Positions searched', r.nodes.toLocaleString()) + metric('Verdict', r.verdict) + metric('Best squares', r.best_moves.join(', '));
    $('[data-prune]').innerHTML = r.nodes_without_pruning ? `<div class="small"><div class="row-between"><span>with pruning</span><b class="mono">${r.nodes.toLocaleString()}</b></div><div class="progress" style="margin:4px 0 8px"><span style="width:${(100 * r.nodes) / r.nodes_without_pruning}%"></span></div>
      <div class="row-between"><span>without pruning</span><b class="mono">${r.nodes_without_pruning.toLocaleString()}</b></div><div class="progress" style="margin-top:4px"><span style="width:100%;background:var(--text-3)"></span></div>
      <p class="faint tiny" style="margin:6px 0 0">Alpha–beta skipped ${(100 - (100 * r.nodes) / r.nodes_without_pruning).toFixed(0)}% of the work — same answer.</p></div>` : '';
    setLabContext('minimax', 'Minimax tic-tac-toe', [`Board (row by row, 0–8): ${board.map((v) => v || '·').join('')}`, `${player} to move; minimax (depth ${st.depth}, alpha-beta ${st.alpha_beta ? 'on' : 'off'}) scores: ${JSON.stringify(r.scores)}`,
      `Best squares: ${r.best_moves.join(', ')} → verdict: ${r.verdict}`, `Positions searched: ${r.nodes}${r.nodes_without_pruning ? ` (without pruning: ${r.nodes_without_pruning})` : ''}`]);
    render();
    return r;
  }

  async function aiMove() {
    busy = true;
    render();
    try {
      const r = await analyse('O');
      await new Promise((res) => setTimeout(res, 500));
      if (r && r.best_moves.length) {
        const m = r.best_moves[Math.floor(Math.random() * r.best_moves.length)];
        board[m] = 'O';
      }
      turn = 'X';
      busy = false;
      finish() || (st.hints ? await analyse('X') : (scores = null, render()));
    } catch (e) { busy = false; toast(e.message, 'error'); }
  }

  function finish() {
    const w = winner(board);
    if (!w) return false;
    if (w.who === 'X') record.you++; else if (w.who === 'O') record.ai++; else record.draw++;
    scores = null;
    render();
    return true;
  }

  $('[data-board]').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-i]');
    if (!b || b.disabled) return;
    board[+b.dataset.i] = 'X';
    turn = 'O';
    scores = null;
    if (!finish()) await aiMove();
  });

  function reset() {
    board = Array(9).fill('');
    scores = null;
    turn = st.ai_first ? 'O' : 'X';
    render();
    if (turn === 'O') aiMove(); else if (st.hints) analyse('X');
  }
  $('[data-new]').addEventListener('click', () => { preset.board = null; preset.turn = null; reset(); });

  if (preset.board && preset.turn === 'O') {
    // challenge / lesson position: show O's options without auto-playing
    turn = 'O';
    render();
    const r = await analyse('O');
    $('[data-status]').textContent = 'Analysis: O to move';
    if (r) scores = r.scores;
    render();
    $('[data-board]').querySelectorAll('button').forEach((x) => { x.disabled = true; });
  } else { render(); if (st.hints) analyse('X'); }
  return { getConfig: () => ({ board, depth: st.depth }), destroy: () => {} };
}
