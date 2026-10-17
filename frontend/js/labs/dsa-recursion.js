// DSA lab: Recursion tree — watch calls branch, return and (with memoisation) collapse.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, glowDot, glowLine, label, loop, reducedMotion, rgba, hue } from './neon.js';

export const meta = {
  howto: [
    'Every node is one function call; children are the calls it makes. The tree grows in the exact order Java would run the calls.',
    'Fibonacci without memoisation recomputes the same values again and again — see how many fib(2) nodes appear.',
    'Turn on memoisation: repeated calls become green leaves (cache hits) and the tree collapses to a thin spine.',
    'Tower of Hanoi animates the 2ⁿ − 1 moves; fast power shows how halving the exponent keeps the tree only log n deep.',
  ],
};
const JAVA = {
  fib: (m) => m ? `long fib(int n, long[] memo) {
  if (n < 2) return n;
  if (memo[n] != 0) return memo[n];      // cache hit
  return memo[n] = fib(n-1, memo) + fib(n-2, memo);
}` : `int fib(int n) {
  if (n < 2) return n;                 // base case
  return fib(n - 1) + fib(n - 2);      // two recursive calls
}`,
  hanoi: () => `void hanoi(int n, char from, char via, char to) {
  if (n == 0) return;
  hanoi(n - 1, from, to, via);   // park n-1 disks
  move(n, from, to);             // move the biggest
  hanoi(n - 1, via, from, to);   // bring them back on top
}`,
  power: () => `long pow(long x, int k) {
  if (k == 0) return 1;
  long half = pow(x, k / 2);     // one call, half the size
  return k % 2 == 0 ? half * half : half * half * x;
}`,
  subsets: () => `void subsets(char[] s, int i, List<Character> cur) {
  if (i == s.length) { print(cur); return; }
  cur.add(s[i]);  subsets(s, i + 1, cur);   // include s[i]
  cur.remove(cur.size() - 1);
  subsets(s, i + 1, cur);                   // exclude s[i]
}`,
};

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { problem: 'fib', n: 6, memo: false, speed: 6, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <div class="row"><button class="btn btn-course grow" data-run>${icon('tree')} Run</button><button class="btn btn-ghost" data-skip>Skip</button></div>
      <div class="card card-tight sticky small"><b>Java</b><pre class="code-mini" data-code style="margin:6px 0 0;white-space:pre-wrap;font-size:11.5px"></pre></div></div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('tree')} Call tree</h3><div class="legend"><span><i style="background:#40f0ff"></i>call</span><span><i style="background:#69db7c"></i>cache hit</span><span><i style="background:#ffd43b"></i>returned</span></div></div><div data-tree></div></div>
      <div class="card board neon-card" data-hanoiwrap hidden><div class="card-head"><h3>${icon('layers')} Tower of Hanoi</h3><span class="chip gray" data-move></span></div><div data-hanoi></div></div>
      <div class="card"><div class="card-head"><h3>Result</h3></div><div class="metrics" data-metrics></div></div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  const ctl = controls($('[data-ctl]'), [
    { type: 'seg', key: 'problem', label: 'Function', options: [['fib', 'Fibonacci'], ['hanoi', 'Hanoi'], ['power', 'Fast power'], ['subsets', 'Subsets']] },
    { type: 'slider', key: 'n', label: 'n', min: 1, max: 15 },
    { type: 'toggle', key: 'memo', label: 'Memoisation (cache results)', show: (s) => s.problem === 'fib' },
    { type: 'slider', key: 'speed', label: 'Calls per second', min: 1, max: 60 },
  ], st, (k, v, live) => { if (k === 'speed') return; if (!live) run(); }, { lock });

  const tree = new Plot($('[data-tree]'), { height: 420 });
  const hanoi = new Plot($('[data-hanoi]'), { height: 200 });
  let res = null, lay = null, shown = 0, acc = 0, last = 0, stop = null;

  function layout(nodes) {
    const kids = new Map(nodes.map((n) => [n.id, []]));
    nodes.forEach((n) => n.parent != null && kids.get(n.parent).push(n.id));
    let leaf = 0;
    const X = new Array(nodes.length);
    const place = (id) => { const k = kids.get(id); if (!k.length) { X[id] = leaf++; return X[id]; } const xs = k.map(place); X[id] = (xs[0] + xs[xs.length - 1]) / 2; return X[id]; };
    place(0);
    const lastDesc = nodes.map((n) => n.id); // ids are in call order, so a subtree ends at its largest id
    for (let i = nodes.length - 1; i > 0; i--) { const p = nodes[i].parent; lastDesc[p] = Math.max(lastDesc[p], lastDesc[i]); }
    return { X, lastDesc, leaves: Math.max(1, leaf), depth: Math.max(...nodes.map((n) => n.depth)) + 1 };
  }

  function draw(t) {
    if (res && shown < res.nodes.length) {
      acc += (Math.min(200, t - last) / 1000) * st.speed;
      while (acc >= 1 && shown < res.nodes.length) { shown++; acc -= 1; }
      stats();
    }
    last = t;
    tree.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#1098ad', stars: 50, t });
      if (!res) return;
      const { X, leaves, depth } = lay;
      const sx = (x) => 20 + ((x + 0.5) / leaves) * (w - 40), sy = (d) => 26 + (d / Math.max(1, depth - 1)) * (h - 56);
      const N = res.nodes, r = Math.max(3, Math.min(16, (w - 40) / leaves / 2.6));
      for (let i = 1; i < shown; i++) { const n = N[i], p = N[n.parent]; glowLine(ctx, [[sx(X[p.id]), sy(p.depth)], [sx(X[n.id]), sy(n.depth)]], rgba(n.hit ? '#69db7c' : '#4dabf7', 0.55), 1.4, 6); }
      for (let i = 0; i < shown; i++) {
        const n = N[i], x = sx(X[n.id]), y = sy(n.depth);
        const done = shown > lay.lastDesc[n.id];
        const col = n.hit ? '#69db7c' : done ? hue(n.depth, depth + 2) : '#40f0ff';
        glowDot(ctx, x, y, r, col, i === shown - 1 ? 30 : 12);
        if (r >= 9) label(ctx, n.label.replace('fib', 'f').replace('pow', 'p').replace('move ', ''), x, y - r - 7, { align: 'center', size: Math.min(11, r), color: '#e7f5ff' });
        if (done && r >= 7 && res.problem !== 'hanoi') label(ctx, String(n.value).slice(0, 6), x, y + 0.5, { align: 'center', size: Math.min(10, r * 0.9), weight: 800, color: '#0b0d1a' });
      }
    });
    if (res?.problem === 'hanoi') drawHanoi(t);
  }

  function drawHanoi() {
    const n = res.n;
    const moveCount = Math.min(res.moves.length, res.nodes.slice(0, shown).length >= res.nodes.length ? res.moves.length : Math.floor((shown / res.nodes.length) * res.moves.length));
    const pegs = [Array.from({ length: n }, (_, i) => n - i), [], []];
    res.moves.slice(0, moveCount).forEach(([, a, c]) => pegs[c].push(pegs[a].pop()));
    $('[data-move]').textContent = `move ${moveCount}/${res.moves.length}`;
    hanoi.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#1098ad', stars: 20, grid: false });
      const pw = w / 3;
      pegs.forEach((peg, p) => {
        const cx = pw * p + pw / 2;
        ctx.save(); glow(ctx, '#99e9f2', 10); ctx.fillStyle = 'rgba(153,233,242,.5)'; ctx.fillRect(cx - 2, 30, 4, h - 50); ctx.fillRect(cx - pw * 0.4, h - 22, pw * 0.8, 4); ctx.restore();
        label(ctx, 'ABC'[p], cx, h - 8, { align: 'center', size: 11, weight: 800, color: '#99e9f2' });
        peg.forEach((d, k) => { const dw = (pw * 0.75 * d) / n, y = h - 22 - (k + 1) * Math.min(20, (h - 60) / n); ctx.save(); glow(ctx, hue(d, n + 1), 16); ctx.fillStyle = hue(d, n + 1); ctx.fillRect(cx - dw / 2, y, dw, Math.min(18, (h - 60) / n - 2)); ctx.restore(); });
      });
    });
  }

  function stats() {
    const hits = res.nodes.slice(0, shown).filter((n) => n.hit).length;
    $('[data-metrics]').innerHTML = metric('Calls so far', `${shown} / ${res.calls}`) + metric('Max depth (stack frames)', res.max_depth) + (res.problem === 'fib' ? metric('Cache hits', hits, hits ? 'good' : '') : '')
      + metric('Result', String(res.result).length > 14 ? String(res.result).slice(0, 12) + '…' : res.result) + (res.problem === 'fib' && !res.memo ? metric('With memo it would be', `${2 * res.n - 1} calls`, 'good') : '');
  }

  async function run() {
    if (st.problem !== 'fib') st.memo = false;
    const lim = { fib: st.memo ? 15 : 11, hanoi: 6, power: 1000, subsets: 5 }[st.problem];
    if (st.n > lim) { st.n = lim; ctl.render(); }
    try { res = await api.lab('dsa/recursion', { problem: st.problem, n: st.n, memo: st.memo }, store.user?.id); } catch (e) { toast(esc(e.message), 'error'); return; }
    lay = layout(res.nodes); shown = 0; acc = 0;
    $('[data-code]').textContent = JAVA[res.problem](res.memo);
    $('[data-hanoiwrap]').hidden = res.problem !== 'hanoi';
    if (reducedMotion()) shown = res.nodes.length;
    stats();
    setLabContext('recursion', 'Recursion tree', [`${res.problem}(${res.n}), memo ${res.memo}: ${res.calls} calls, max depth ${res.max_depth}, cache hits ${res.cache_hits}`, `Result ${res.result}`]);
  }
  $('[data-run]').addEventListener('click', run);
  $('[data-skip]').addEventListener('click', () => { if (res) { shown = res.nodes.length; stats(); } });
  stop = loop(draw);
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { stop?.(); tree.dispose(); hanoi.dispose(); } };
}
