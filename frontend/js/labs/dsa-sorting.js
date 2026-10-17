// DSA lab: Sorting Race — six real sorting traces replayed side by side as neon bars with light trails.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, noGlow, cmap, label, loop, reducedMotion, glowLine } from './neon.js';

export const meta = {
  howto: [
    'Pick how the input is arranged (random, reversed, nearly sorted, few unique values) and how many items.',
    'Press Race: all six algorithms replay their real comparisons and swaps at the same speed — the shortest trace wins.',
    'Use the Speed slider to slow it right down (as slow as 1 step every 2 seconds) — the caption tells you what is happening at each step.',
    'The spotlight shows one algorithm in detail. Turn on sound to hear the values being compared.',
    'Read the growth chart: how comparisons scale as n doubles (log scale).',
  ],
};

const NAMES = { bubble: 'Bubble', insertion: 'Insertion', selection: 'Selection', merge: 'Merge', quick: 'Quick', heap: 'Heap' };
const HUES = { bubble: '#ff6b9d', insertion: '#3bc9db', selection: '#fcc419', merge: '#69db7c', quick: '#b197fc', heap: '#ff922b' };

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { order: 'random', n: 16, algorithm: 'quick', speed: 0.5, sound: false, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <div class="row"><button class="btn btn-course grow" data-run>${icon('play')} Race!</button><button class="icon-btn" data-reset title="Restart">${icon('reset')}</button></div>
      <div class="card card-tight sticky small" data-explain></div>
    </div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('sort')} Spotlight: <span data-spot-name></span></h3><div class="row" style="gap:6px" data-spot-stats></div></div>
        <div class="sort-action" data-action>Press Race to watch it sort, one step at a time.</div>
        <div data-spot></div></div>
      <div class="card board neon-card"><div class="card-head"><h3>${icon('zap')} The race</h3><span class="faint tiny">same speed per step — fewer steps wins</span></div>
        <div class="race-grid" data-race></div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
        <div class="card board neon-card"><div class="card-head"><h3>${icon('trend')} How comparisons grow</h3><span class="faint tiny">log scale · ${''}same input shape</span></div><div data-growth></div></div>
        <div class="card"><div class="card-head"><h3>Results</h3></div><div data-table class="small"><div class="empty small">Press Race.</div></div></div>
      </div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  controls($('[data-ctl]'), [
    { type: 'seg', key: 'order', label: 'Input order', options: [['random', 'Random'], ['reversed', 'Reversed'], ['nearly', 'Nearly'], ['few', 'Few unique']] },
    { type: 'slider', key: 'n', label: 'Items', min: 8, max: 64, step: 4 },
    { type: 'select', key: 'algorithm', label: 'Spotlight algorithm', options: Object.entries(NAMES).map(([k, v]) => [k, `${v} sort`]) },
    { type: 'slider', key: 'speed', label: 'Speed', min: 0.5, max: 40, step: 0.5, fmt: (v) => (v < 1 ? `${Math.round(1 / v)}s per step` : `${v} steps/s`) },
    { type: 'toggle', key: 'sound', label: 'Sound of sorting (spotlight)' },
  ], st, (k, v, live) => {
    if (live) return;
    if (k === 'order' || k === 'n') run();
    if (k === 'algorithm') { spotlight(); explain(); }
  }, { lock });

  const spot = new Plot($('[data-spot]'), { height: 260 });
  const lanes = {};
  Object.keys(NAMES).forEach((a) => {
    const box = document.createElement('div');
    box.className = 'race-lane';
    box.innerHTML = `<div class="row-between tiny"><b style="color:${HUES[a]}">${NAMES[a]}</b><span data-c class="mono faint"></span></div><div data-p></div>`;
    $('[data-race]').appendChild(box);
    lanes[a] = { box, plot: new Plot(box.querySelector('[data-p]'), { height: 110 }), stat: box.querySelector('[data-c]') };
  });
  const growth = new Plot($('[data-growth]'), { height: 220 });

  let data = null, sims = {}, stop = null, clock = 0, finishOrder = [], acc = 0;
  let audio = null;

  function sim(run) {
    return { a: [...run.values], k: 0, hl: [], done: new Set(), comps: 0, writes: 0, finished: false, run };
  }
  function step(s) {
    const ev = s.run.events[s.k++];
    if (!ev) { s.finished = true; return null; }
    s.hl = [];
    if (ev[0] === 'c') { s.comps++; s.hl = [[ev[1], 'c'], [ev[2], 'c']]; }
    else if (ev[0] === 's') { const [, i, j] = ev; [s.a[i], s.a[j]] = [s.a[j], s.a[i]]; s.writes += 2; s.hl = [[i, 's'], [j, 's']]; }
    else if (ev[0] === 'w') { s.a[ev[1]] = ev[2]; s.writes++; s.hl = [[ev[1], 's']]; }
    else if (ev[0] === 'p') s.hl = [[ev[1], 'p']];
    else if (ev[0] === 'd') s.done.add(ev[1]);
    return ev;
  }

  function drawBars(plot, s, hue, big = false) {
    const { ctx, w, h } = plot;
    if (!reducedMotion() && s.k > 0 && !s.finished) { ctx.fillStyle = 'rgba(6,7,16,0.42)'; ctx.fillRect(0, 0, w, h); } // light trails
    else space(ctx, w, h, { tint: hue, stars: big ? 70 : 20, grid: big });
    const n = s.a.length, max = Math.max(...s.run.values), pad = big ? 18 : 8;
    const bw = (w - 2 * pad) / n;
    const hl = new Map(s.hl);
    for (let i = 0; i < n; i++) {
      const v = s.a[i], bh = ((h - 2 * pad - (big ? 14 : 4)) * v) / max;
      const x = pad + i * bw, y = h - pad - bh;
      const mark = hl.get(i);
      let col = cmap('neon', 0.25 + 0.7 * (v / max), 0.9);
      if (s.done.has(i) || s.finished) col = hue;
      if (mark === 'c') col = '#ffffff';
      if (mark === 's') col = '#ff4d8d';
      if (mark === 'p') col = '#ffd43b';
      if (mark || (s.finished && big)) glow(ctx, mark ? col : hue, big ? 18 : 10); else noGlow(ctx);
      ctx.fillStyle = col;
      const r = Math.min(4, bw * 0.3);
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x + bw * 0.12, y, bw * 0.76, bh, [r, r, 1, 1]) : ctx.rect(x + bw * 0.12, y, bw * 0.76, bh);
      ctx.fill();
    }
    noGlow(ctx);
    if (big) {
      label(ctx, `${s.comps} comparisons · ${s.writes} writes`, 14, 14, { size: 12 });
      if (s.finished) label(ctx, '✓ sorted', w - 14, 14, { align: 'right', color: hue, size: 12 });
    }
  }

  function beep(v, max) {
    if (!st.sound) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'triangle';
      o.frequency.value = 180 + (v / max) * 900;
      g.gain.setValueAtTime(0.06, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.09);
      o.connect(g).connect(audio.destination);
      o.start(); o.stop(audio.currentTime + 0.1);
    } catch { /* no audio */ }
  }

  function spotlight() {
    if (!data) return;
    const run = data.runs.find((r) => r.algorithm === st.algorithm);
    $('[data-spot-name]').textContent = `${NAMES[st.algorithm]} sort`;
    $('[data-spot-stats]').innerHTML = `<span class="chip gray">avg ${run.complexity.average}</span><span class="chip gray">worst ${run.complexity.worst}</span><span class="chip gray">${run.complexity.stable ? 'stable' : 'not stable'}</span>`;
    sims.__spot = sim(run);
  }

  function updateAction(ev) {
    const el = $('[data-action]');
    if (!el) return;
    const s = sims.__spot;
    if (!ev) { if (s?.finished) el.innerHTML = '✅ <b>Sorted!</b> Every value is now in order.'; return; }
    const pos = (i) => `#${i + 1}`;
    if (ev[0] === 'c') el.innerHTML = `🔍 Comparing <b>${s.a[ev[1]]}</b> and <b>${s.a[ev[2]]}</b> — which is smaller?`;
    else if (ev[0] === 's') el.innerHTML = `🔁 Out of order — <b>swapping</b> the values at ${pos(ev[1])} and ${pos(ev[2])}.`;
    else if (ev[0] === 'w') el.innerHTML = `✏️ Placing <b>${ev[2]}</b> into position ${pos(ev[1])}.`;
    else if (ev[0] === 'p') el.innerHTML = `📌 Picked <b>${s.a[ev[1]]}</b> as the pivot to partition around.`;
    else if (ev[0] === 'd') el.innerHTML = `🎯 Value at ${pos(ev[1])} is now in its final sorted place.`;
  }

  function frame(t) {
    const dt = (t - clock) / 1000;
    clock = t;
    // fractional accumulator so very slow speeds (e.g. 1 step every 2 s) work
    acc += st.speed * Math.min(dt, 0.25);
    const budget = Math.floor(acc);
    acc -= budget;
    let allDone = true;
    let spotEv = null;
    for (const [a, s] of Object.entries(sims)) {
      for (let i = 0; i < budget && !s.finished; i++) {
        const ev = step(s);
        if (a === '__spot') { spotEv = ev; if (ev && ev[0] === 'c' && i === 0) beep(s.a[ev[1]], Math.max(...s.run.values)); }
      }
      if (s.finished && a !== '__spot' && !finishOrder.includes(a)) finishOrder.push(a);
      allDone &&= s.finished;
    }
    if (budget > 0) updateAction(spotEv);
    drawBars(spot, sims.__spot, HUES[st.algorithm], true);
    for (const a of Object.keys(NAMES)) {
      const s = sims[a];
      drawBars(lanes[a].plot, s, HUES[a]);
      const rank = finishOrder.indexOf(a);
      lanes[a].stat.innerHTML = `${s.comps} cmp${rank >= 0 ? ` · <b style="color:${HUES[a]}">${['🥇 1st', '🥈 2nd', '🥉 3rd', '4th', '5th', '6th'][rank]}</b>` : ''}`;
    }
    if (allDone) { stop?.(); stop = null; results(); }
  }

  async function run() {
    stop?.();
    try {
      data = await api.lab('dsa/sort', { n: st.n, order: st.order }, store.user?.id);
    } catch (e) { toast(esc(e.message), 'error'); return; }
    sims = Object.fromEntries(data.runs.map((r) => [r.algorithm, sim(r)]));
    finishOrder = [];
    spotlight();
    spot.drawFn = () => drawBars(spot, sims.__spot, HUES[st.algorithm], true);
    Object.keys(NAMES).forEach((a) => { lanes[a].plot.drawFn = () => drawBars(lanes[a].plot, sims[a], HUES[a]); });
    drawGrowth();
    clock = 0;
    acc = 1; // prime so the first step shows immediately, then the slow cadence
    if (reducedMotion()) {
      Object.values(sims).forEach((s) => { while (!s.finished) step(s); });
      finishOrder = [...data.runs].sort((a, b) => a.steps - b.steps).map((r) => r.algorithm);
      frame(0);
    } else stop = loop(frame);  // loop() passes elapsed-ms-since-start as t
  }

  function drawGrowth() {
    growth.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#1098ad', stars: 25 });
      const { sizes, comparisons } = data.growth;
      const all = Object.values(comparisons).flat().filter((v) => v > 0);
      const lo = Math.log10(Math.max(1, Math.min(...all))), hi = Math.log10(Math.max(...all));
      const pad = 36;
      const sx = (i) => pad + (i / (sizes.length - 1)) * (w - pad - 70);
      const sy = (v) => h - pad - ((Math.log10(Math.max(1, v)) - lo) / (hi - lo || 1)) * (h - pad - 16);
      sizes.forEach((n, i) => label(ctx, `n=${n}`, sx(i), h - 14, { align: 'center', size: 10, color: 'rgba(200,210,255,.6)' }));
      for (const [a, pts] of Object.entries(comparisons)) {
        const line = pts.map((v, i) => [sx(i), sy(v)]);
        glowLine(ctx, line, HUES[a], a === st.algorithm ? 3 : 1.6, a === st.algorithm ? 16 : 6);
        label(ctx, NAMES[a], line[line.length - 1][0] + 6, line[line.length - 1][1], { color: HUES[a], size: 10 });
      }
    });
  }

  function results() {
    const rows = [...data.runs].sort((a, b) => a.steps - b.steps);
    $('[data-table]').innerHTML = `<table class="table"><thead><tr><th>#</th><th>Algorithm</th><th>Compares</th><th>Writes</th><th>Big-O (avg)</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr><td>${i + 1}</td><td><b style="color:${HUES[r.algorithm]}">●</b> ${NAMES[r.algorithm]}</td><td class="mono">${r.comparisons}</td><td class="mono">${r.writes}</td><td class="mono">${r.complexity.average}</td></tr>`).join('')}</tbody></table>`;
    const me = data.runs.find((r) => r.algorithm === st.algorithm);
    setLabContext('sorting', 'Sorting race', [
      `Input: ${data.n} items, order = ${data.order}`,
      `Spotlight ${NAMES[st.algorithm]} sort: ${me.comparisons} comparisons, ${me.writes} writes (average ${me.complexity.average}, worst ${me.complexity.worst})`,
      `Fewest steps: ${NAMES[rows[0].algorithm]} (${rows[0].comparisons} comparisons); most: ${NAMES[rows[rows.length - 1].algorithm]} (${rows[rows.length - 1].comparisons})`,
      ...rows.map((r) => `${NAMES[r.algorithm]}: ${r.comparisons} comparisons, ${r.writes} writes`),
    ]);
  }

  function explain() {
    const text = {
      bubble: 'Bubble sort swaps neighbours that are out of order; big values “bubble” to the end each pass. O(n²), but stops early on sorted input.',
      insertion: 'Insertion sort grows a sorted prefix, sliding each new value left into place — brilliant on nearly sorted data.',
      selection: 'Selection sort finds the minimum of the unsorted part every round: always n(n−1)/2 comparisons, but very few swaps.',
      merge: 'Merge sort splits in half, sorts both halves and merges them — always O(n log n), stable, uses extra memory.',
      quick: 'Quicksort partitions around a pivot (yellow). Usually the fastest — but a last-element pivot on sorted/reversed input is O(n²).',
      heap: 'Heap sort builds a max-heap, then repeatedly swaps the maximum to the end — O(n log n) with no extra memory.',
    };
    $('[data-explain]').textContent = text[st.algorithm];
  }
  $('[data-run]').addEventListener('click', run);
  $('[data-reset]').addEventListener('click', () => { if (data) { sims = Object.fromEntries(data.runs.map((r) => [r.algorithm, sim(r)])); finishOrder = []; acc = 1; spotlight(); stop?.(); clock = 0; stop = loop(frame); } });
  explain();
  await run();
  return {
    getConfig: () => ({ algorithm: st.algorithm, order: st.order, n: st.n }),
    destroy: () => { stop?.(); spot.dispose(); growth.dispose(); Object.values(lanes).forEach((l) => l.plot.dispose()); audio?.close?.(); },
  };
}
