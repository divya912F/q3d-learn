// DSA lab: Dynamic-programming table — watch every cell get filled from earlier answers, then trace the solution back.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, glowDot, label, loop, reducedMotion, rgba, cmap } from './neon.js';

export const meta = {
  howto: [
    'Choose a classic DP problem. Each cell answers a smaller sub-problem; arrows show which earlier cells it was built from.',
    'Press Fill: cells light up one by one in order. The caption explains the rule used for the current cell.',
    'When the table is full, the golden path traces back the actual answer (the common subsequence, the edits, the items, the coins).',
    'Compare “cells computed” with the number of calls plain recursion would make — that gap is why DP matters.',
  ],
};

const JAVA = {
  lcs: `int[][] dp = new int[n + 1][m + 1];
for (int i = 1; i <= n; i++)
  for (int j = 1; j <= m; j++)
    dp[i][j] = a.charAt(i-1) == b.charAt(j-1)
        ? dp[i-1][j-1] + 1
        : Math.max(dp[i-1][j], dp[i][j-1]);`,
  edit: `for (int i = 0; i <= n; i++) dp[i][0] = i;
for (int j = 0; j <= m; j++) dp[0][j] = j;
for (int i = 1; i <= n; i++)
  for (int j = 1; j <= m; j++)
    dp[i][j] = a.charAt(i-1) == b.charAt(j-1) ? dp[i-1][j-1]
      : 1 + Math.min(dp[i-1][j-1], Math.min(dp[i-1][j], dp[i][j-1]));`,
  knapsack: `for (int i = 1; i <= items; i++)
  for (int c = 0; c <= W; c++) {
    dp[i][c] = dp[i-1][c];                       // skip item i
    if (w[i-1] <= c)
      dp[i][c] = Math.max(dp[i][c], dp[i-1][c - w[i-1]] + v[i-1]); // take it
  }`,
  coins: `Arrays.fill(dp, INF); dp[0] = 0;
for (int x = 1; x <= amount; x++)
  for (int coin : coins)
    if (coin <= x && dp[x - coin] + 1 < dp[x])
      dp[x] = dp[x - coin] + 1;`,
};

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { problem: 'lcs', a: 'STUDENT', b: 'SUDDEN', weights: '1,3,4,5', values: '15,20,30,45', capacity: 7, coins: '1,3,4', amount: 10, speed: 8, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <div class="row"><button class="btn btn-course grow" data-run>${icon('grid')} Fill table</button><button class="btn btn-ghost" data-skip>Skip</button></div>
      <div class="card card-tight sticky small"><b>Java</b><pre class="code-mini" data-code style="margin:6px 0 0;white-space:pre-wrap;font-size:11.5px"></pre></div></div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('table')} DP table</h3><span class="chip gray" data-why></span></div><div data-table></div></div>
      <div class="card"><div class="card-head"><h3>Answer</h3></div><div class="metrics" data-metrics></div><p class="small" data-answer style="margin:10px 0 0"></p></div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  controls($('[data-ctl]'), [
    { type: 'select', key: 'problem', label: 'Problem', options: [['lcs', 'Longest common subsequence'], ['edit', 'Edit distance (Levenshtein)'], ['knapsack', '0/1 knapsack'], ['coins', 'Coin change (fewest coins)']] },
    { type: 'text', key: 'a', label: 'String A', show: (s) => s.problem === 'lcs' || s.problem === 'edit' },
    { type: 'text', key: 'b', label: 'String B', show: (s) => s.problem === 'lcs' || s.problem === 'edit' },
    { type: 'text', key: 'weights', label: 'Item weights', show: (s) => s.problem === 'knapsack' },
    { type: 'text', key: 'values', label: 'Item values', show: (s) => s.problem === 'knapsack' },
    { type: 'slider', key: 'capacity', label: 'Bag capacity', min: 1, max: 20, show: (s) => s.problem === 'knapsack' },
    { type: 'text', key: 'coins', label: 'Coin values', show: (s) => s.problem === 'coins' },
    { type: 'slider', key: 'amount', label: 'Amount', min: 1, max: 40, show: (s) => s.problem === 'coins' },
    { type: 'slider', key: 'speed', label: 'Cells per second', min: 1, max: 60 },
  ], st, (k, v, live) => { if (k === 'speed') return; if (!live) run(); }, { lock });

  const table = new Plot($('[data-table]'), { height: 380 });
  let res = null, shown = 0, acc = 0, last = 0, stop = null, done = false, tDone = 0;

  function draw(t) {
    if (res && shown < res.fills.length) {
      acc += (Math.min(200, t - last) / 1000) * st.speed;
      while (acc >= 1 && shown < res.fills.length) { shown++; acc -= 1; }
      if (shown >= res.fills.length && !done) { done = true; tDone = t; finish(); }
      const f = res.fills[Math.max(0, shown - 1)];
      $('[data-why]').textContent = f ? `[${f.r}][${f.c}] = ${f.v ?? '∞'} · ${f.why}` : '';
    }
    last = t;
    table.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#1098ad', stars: 40, t });
      if (!res) return;
      const R = res.table.length, C = res.table[0].length, coins = res.problem === 'coins';
      const lw = coins ? 34 : res.problem === 'knapsack' ? 96 : 30;
      const cs = Math.min((w - lw - 16) / C, (h - 40) / (R + (coins ? 2 : 0)), 46), ox = lw + 6, oy = coins ? (h - cs * 2) / 2 : 30;
      const vals = res.fills.map((f) => f.v ?? 0), vmax = Math.max(1, ...vals);
      res.cols.forEach((c, j) => label(ctx, c || 'ε', ox + j * cs + cs / 2, oy - 12, { align: 'center', size: 11, weight: 800, color: '#99e9f2' }));
      res.rows.forEach((r, i) => label(ctx, r || 'ε', ox - 8, oy + i * cs + cs / 2, { align: 'right', size: res.problem === 'knapsack' ? 10 : 11, weight: 800, color: '#99e9f2' }));
      const filled = new Map(res.fills.slice(0, shown).map((f) => [`${f.r},${f.c}`, f]));
      const pathSet = new Set(done ? res.path.map(([r, c]) => `${r},${c}`) : []);
      for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) {
        const f = filled.get(`${i},${j}`), x = ox + j * cs, y = oy + i * cs;
        ctx.strokeStyle = 'rgba(153,233,242,.12)'; ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
        if (!f) continue;
        const onPath = pathSet.has(`${i},${j}`);
        const pulse = done && onPath ? 0.5 + 0.5 * Math.sin((t - tDone) / 200 - (i + j) * 0.5) : 0;
        ctx.fillStyle = onPath ? `rgba(255,212,59,${0.35 + 0.4 * pulse})` : cmap('ice', 0.15 + 0.7 * ((f.v ?? 0) / vmax), 0.55);
        ctx.fillRect(x + 2, y + 2, cs - 4, cs - 4);
        label(ctx, f.v == null ? '∞' : String(f.v), x + cs / 2, y + cs / 2, { align: 'center', size: cs > 30 ? 13 : 10, weight: 800, color: onPath ? '#2b1d00' : '#f1f3f5' });
      }
      // current cell + dependency arrows
      const cur = res.fills[shown - 1];
      if (cur && !done) {
        const cx = ox + cur.c * cs + cs / 2, cy = oy + cur.r * cs + cs / 2;
        cur.from.forEach(([r, c]) => {
          const fx = ox + c * cs + cs / 2, fy = oy + r * cs + cs / 2;
          ctx.save(); glow(ctx, '#f06595', 14); ctx.strokeStyle = '#f783ac'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(cx, cy); ctx.stroke(); ctx.restore();
          glowDot(ctx, fx, fy, 4, '#f783ac');
        });
        ctx.save(); glow(ctx, '#40f0ff', 26); ctx.strokeStyle = '#c5f6fa'; ctx.lineWidth = 2.5; ctx.strokeRect(cx - cs / 2 + 1, cy - cs / 2 + 1, cs - 2, cs - 2); ctx.restore();
      }
    });
  }

  function finish() {
    const r = res.result;
    let ans = '';
    if (res.problem === 'lcs') ans = `Longest common subsequence: <b>${esc(r.subsequence || '∅')}</b> (length ${r.length}).`;
    if (res.problem === 'edit') ans = `Edit distance <b>${r.distance}</b>: ${r.operations.map(esc).join(' → ')}`;
    if (res.problem === 'knapsack') ans = `Best value <b>${r.best_value}</b> by taking items ${r.items.map((i) => `#${i}`).join(', ') || 'none'}.`;
    if (res.problem === 'coins') ans = r.min_coins == null ? 'This amount cannot be made with these coins.' : `Fewest coins: <b>${r.min_coins}</b> (${r.coins_used.join(' + ')}). Greedy (largest coin first) uses ${r.greedy_count ?? '—'}${r.greedy_count > r.min_coins ? ' — greedy is <b>not optimal</b> here!' : '.'}`;
    $('[data-answer]').innerHTML = ans;
  }

  async function run() {
    try { res = await api.lab('dsa/dp', { ...st }, store.user?.id); } catch (e) { toast(esc(e.message), 'error'); return; }
    shown = 0; acc = 0; done = false;
    $('[data-answer]').innerHTML = '';
    $('[data-code]').textContent = JAVA[res.problem];
    if (reducedMotion()) skip();
    $('[data-metrics]').innerHTML = metric('Cells computed', res.cells) + metric('Plain recursion (worst case)', res.naive_calls ? `~${res.naive_calls.toLocaleString()} calls` : '—', 'bad') + metric('Time', res.problem === 'coins' ? 'O(amount × coins)' : 'O(n × m)');
    setLabContext('dp', 'Dynamic programming table', [`Problem ${res.problem}; rows ${res.rows.join(' ')}; cols ${res.cols.join(' ')}`, `Result ${JSON.stringify(res.result)}`, `${res.cells} cells vs ~${res.naive_calls} naive recursive calls`]);
  }
  function skip() { if (!res) return; shown = res.fills.length; if (!done) { done = true; tDone = performance.now(); finish(); } }
  $('[data-run]').addEventListener('click', run);
  $('[data-skip]').addEventListener('click', skip);
  stop = loop(draw);
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { stop?.(); table.dispose(); } };
}
