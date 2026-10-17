// AI lab: N-Queens — constraint satisfaction by brute force, backtracking and forward checking.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, glowDot, label, loop, reducedMotion, rgba } from './neon.js';

export const meta = {
  howto: [
    'Place N queens so that no two share a row, column or diagonal. The solver works row by row.',
    'Brute force tries every square and only then checks; backtracking skips squares already under attack; forward checking also gives up as soon as some later row has no safe square left.',
    'Red glow = attacked squares. A red flash means a conflict or a dead end; a fading queen is a backtrack.',
    'Compare the “nodes” counter for the three methods, and turn on “find all” to count every solution (92 for N = 8).',
  ],
};

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { n: 8, method: 'backtracking', find_all: false, speed: 30, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <div class="row"><button class="btn btn-course grow" data-run>${icon('crown')} Solve</button><button class="btn btn-ghost" data-skip>Skip to end</button></div>
      <div class="card card-tight sticky small" data-explain></div></div>
    <div class="stack" style="min-width:0">
      <div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)" data-two>
        <div class="card board neon-card"><div class="card-head"><h3>${icon('crown')} Board</h3><span class="chip gray" data-step></span></div><div data-board></div></div>
        <div class="stack">
          <div class="card"><div class="card-head"><h3>Search stats</h3></div><div class="metrics" data-metrics></div></div>
          <div class="card board neon-card"><div class="card-head"><h3>${icon('grid')} Solutions found</h3></div><div class="row" style="flex-wrap:wrap;gap:6px" data-sols></div></div>
        </div>
      </div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  controls($('[data-ctl]'), [
    { type: 'slider', key: 'n', label: 'Board size N', min: 4, max: 12 },
    { type: 'seg', key: 'method', label: 'Method', options: [['brute', 'Brute force'], ['backtracking', 'Backtracking'], ['forward', 'Forward checking']] },
    { type: 'toggle', key: 'find_all', label: 'Find all solutions' },
    { type: 'slider', key: 'speed', label: 'Animation speed (events / s)', min: 2, max: 400, log: true, fmt: (v) => Math.round(v) },
  ], st, (k, v, live) => { if (k === 'speed') return; if (!live) run(); }, { lock });
  if (innerWidth < 1000) $('[data-two]').style.gridTemplateColumns = '1fr';

  const board = new Plot($('[data-board]'), { aspect: 1 });
  let res = null, ev = 0, acc = 0, last = 0, queens = [], flash = null, stop = null, found = 0, nodes = 0, backs = 0;

  function applyEvent(e) {
    const [kind, r, c] = e;
    if (kind === 'try') { flash = { r, c, color: '#748ffc', t: performance.now() }; nodes++; }
    if (kind === 'place') { queens[r] = c; queens.length = r + 1; if (st.method !== 'brute') nodes++; }
    if (kind === 'conflict') flash = { r, c, color: '#ff6b6b', t: performance.now() };
    if (kind === 'remove') { queens.length = r; flash = { r, c, color: '#ff922b', t: performance.now() }; backs++; }
    if (kind === 'dead') flash = { r, row: true, color: '#ff6b6b', t: performance.now() };
    if (kind === 'solution') { found = r; flash = { gold: true, t: performance.now() }; addSolution([...queens]); }
  }

  function addSolution(q) {
    if ($('[data-sols]').children.length >= 24) return;
    const n = st.n, cv = document.createElement('canvas'); cv.width = cv.height = n * 6; cv.style.cssText = 'width:54px;height:54px;border-radius:6px;image-rendering:pixelated;box-shadow:0 0 12px rgba(255,212,59,.35)';
    const c = cv.getContext('2d');
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) { c.fillStyle = (r + k) % 2 ? '#1c1e3a' : '#2b2f5c'; c.fillRect(k * 6, r * 6, 6, 6); }
    q.forEach((k, r) => { c.fillStyle = '#ffd43b'; c.fillRect(k * 6 + 1, r * 6 + 1, 4, 4); });
    $('[data-sols]').appendChild(cv);
  }

  function attacked(n) {
    const A = Array.from({ length: n }, () => new Array(n).fill(0));
    queens.forEach((c, r) => { for (let i = 0; i < n; i++) { A[r][i]++; A[i][c]++; const d1 = i - r + c, d2 = r + c - i; if (d1 >= 0 && d1 < n) A[i][d1]++; if (d2 >= 0 && d2 < n) A[i][d2]++; } });
    return A;
  }

  function draw(t) {
    if (res && ev < res.events.length) {
      const dt = Math.min(200, t - last); acc += (dt / 1000) * st.speed;
      while (acc >= 1 && ev < res.events.length) { applyEvent(res.events[ev++]); acc -= 1; }
      stats();
    }
    last = t;
    board.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#e8590c', stars: 30, t, grid: false });
      if (!res) return;
      const n = res.n, s = (Math.min(w, h) - 24) / n, ox = (w - s * n) / 2, oy = (h - s * n) / 2;
      const A = attacked(n);
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        ctx.fillStyle = (r + c) % 2 ? 'rgba(30,32,64,.95)' : 'rgba(48,52,100,.95)';
        ctx.fillRect(ox + c * s, oy + r * s, s, s);
        if (A[r][c] && queens[r] !== c) { ctx.fillStyle = `rgba(255,60,90,${Math.min(0.45, 0.12 * A[r][c])})`; ctx.fillRect(ox + c * s, oy + r * s, s, s); }
      }
      if (flash) {
        const age = (performance.now() - flash.t) / 500;
        if (age < 1) {
          ctx.save(); glow(ctx, flash.color || '#ffd43b', 30);
          if (flash.gold) { ctx.strokeStyle = `rgba(255,212,59,${1 - age})`; ctx.lineWidth = 6; ctx.strokeRect(ox, oy, s * n, s * n); }
          else if (flash.row) { ctx.fillStyle = rgba(flash.color, 0.5 * (1 - age)); ctx.fillRect(ox, oy + flash.r * s, s * n, s); }
          else { ctx.fillStyle = rgba(flash.color, 0.7 * (1 - age)); ctx.fillRect(ox + flash.c * s, oy + flash.r * s, s, s); }
          ctx.restore();
        }
      }
      queens.forEach((c, r) => {
        const x = ox + c * s + s / 2, y = oy + r * s + s / 2;
        glowDot(ctx, x, y, s * 0.26, '#ffd43b', 26);
        label(ctx, '♛', x, y + 1, { align: 'center', size: Math.round(s * 0.42), weight: 400, color: '#2b1d00', font: 'serif' });
      });
    });
  }

  function stats() {
    $('[data-step]').textContent = `event ${ev}/${res.events.length}${res.truncated ? '+' : ''}`;
    $('[data-metrics]').innerHTML = metric('Squares considered', res.nodes.toLocaleString()) + metric('Backtracks', `${backs} / ${res.backtracks}`)
      + metric('Pruned rows', res.pruned) + metric('Solutions', st.find_all ? `${found} / ${res.solution_count}${res.solution_count_capped ? '+' : ''}` : found ? '1 ✓' : '—', found ? 'good' : '')
      + metric('Blind search space N^N', res.search_space.toLocaleString());
  }

  async function run() {
    try { res = await api.lab('ai/nqueens', { n: st.n, method: st.method, find_all: st.find_all }, store.user?.id); } catch (e) { toast(esc(e.message), 'error'); return; }
    ev = 0; acc = 0; queens = []; found = 0; nodes = 0; backs = 0; flash = null;
    $('[data-sols]').innerHTML = '';
    if (reducedMotion()) skip();
    stats();
    $('[data-explain]').innerHTML = { brute: 'Brute force places a queen and only <i>then</i> notices the conflict — lots of wasted red flashes.', backtracking: 'Backtracking never places a queen on an attacked square, and undoes the last choice when a row has no options.', forward: 'Forward checking looks ahead: after each placement it checks that every later row still has a safe square, and backtracks immediately if not.' }[st.method]
      + ` It explored <b>${res.nodes.toLocaleString()}</b> nodes instead of ${res.search_space.toLocaleString()} blind placements.`;
    setLabContext('nqueens', 'N-Queens CSP', [`N = ${res.n}, method ${res.method}, find all ${res.find_all}`, `${res.nodes} nodes, ${res.backtracks} backtracks, ${res.pruned} pruned; ${res.solution_count} solution(s) found`, `First solution (column per row): ${res.solutions[0]?.join(', ') ?? 'none'}`]);
  }
  function skip() { while (res && ev < res.events.length) applyEvent(res.events[ev++]); if (res && !st.find_all && res.solutions[0]) queens = [...res.solutions[0]]; nodes = res?.nodes ?? 0; backs = res?.backtracks ?? 0; stats(); }
  $('[data-run]').addEventListener('click', run);
  $('[data-skip]').addEventListener('click', skip);
  stop = loop(draw);
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { stop?.(); board.dispose(); } };
}
