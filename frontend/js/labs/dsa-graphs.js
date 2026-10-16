// DSA lab: Graph Explorer — BFS ripples, Dijkstra relaxations and MSTs growing as glowing light-paths.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, noGlow, label, loop, reducedMotion, TAU, lerp, rgba } from './neon.js';

export const meta = {
  howto: [
    'Choose an algorithm. BFS/DFS traverse, Dijkstra finds shortest paths, Prim/Kruskal build a minimum spanning tree.',
    'Press Run and watch the events replay: visits pulse, relaxed edges flash, tree edges turn to light.',
    'After Dijkstra finishes, click any node to trace its shortest path from the start.',
    'Change the number of nodes, the density or roll a new random graph.',
  ],
};

const ALGS = [['bfs', 'Breadth-first search'], ['dfs', 'Depth-first search'], ['dijkstra', 'Dijkstra (shortest paths)'], ['prim', 'Prim (MST)'], ['kruskal', 'Kruskal (MST)']];
const C = { node: '#3bc9db', visit: '#69db7c', front: '#fcc419', tree: '#ffd43b', relax: '#ff6b9d', bad: '#ff4d4d', path: '#ffffff' };

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { algorithm: 'dijkstra', nodes: 10, density: 0.35, seed: 3, start: 0, speed: 4, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <div class="row"><button class="btn btn-course grow" data-run>${icon('play')} Run</button><button class="icon-btn" data-dice title="New random graph">${icon('dice')}</button></div>
      <div class="card card-tight sticky small" data-explain></div>
    </div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('graph')} Graph</h3>
        <div class="legend"><span><i style="background:${C.front}"></i>frontier</span><span><i style="background:${C.visit}"></i>visited</span><span><i style="background:${C.relax}"></i>relaxed</span><span><i style="background:${C.tree}"></i>tree edge</span></div></div>
        <div data-plot style="cursor:pointer"></div><p class="faint tiny" style="margin:8px 0 0" data-tip>Numbers on edges are weights.</p></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
        <div class="card"><div class="card-head"><h3>Result</h3></div><div class="metrics" data-metrics><div class="empty small">Press Run.</div></div></div>
        <div class="card"><div class="card-head"><h3 data-tbl-title>Distances</h3></div><div data-tbl class="small muted">—</div></div>
      </div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  const ctl = controls($('[data-ctl]'), [
    { type: 'select', key: 'algorithm', label: 'Algorithm', options: ALGS },
    { type: 'slider', key: 'nodes', label: 'Nodes', min: 6, max: 18 },
    { type: 'slider', key: 'density', label: 'Extra edges', min: 0, max: 0.8, step: 0.05, fmt: (v) => v.toFixed(2) },
    { type: 'custom', key: 'start', render: (box, s, set) => {
      box.innerHTML = `<label>Start node</label><select class="input">${Array.from({ length: s.nodes }, (_, i) => `<option value="${i}" ${i === +s.start ? 'selected' : ''}>${String.fromCharCode(65 + i)}</option>`).join('')}</select>`;
      box.querySelector('select').addEventListener('change', (e) => set(+e.target.value));
    } },
    { type: 'slider', key: 'speed', label: 'Speed', min: 1, max: 20, fmt: (v) => `${v} events/s` },
  ], st, (k, v, live) => {
    if (live && k !== 'speed') return;
    if (k === 'nodes' && st.start >= st.nodes) st.start = 0;
    if (k === 'nodes') ctl.render();
    if (k !== 'speed') run();
    explain();
  }, { lock });

  const plot = new Plot($('[data-plot]'), { aspect: 0.62 });
  let res = null, k = 0, stop = null, last = 0, acc = 0, pulses = [], selected = null, tPrev = 0;
  let state = null;

  function reset() {
    state = { visited: new Set(), frontier: new Set(), tree: new Set(), relaxed: new Map(), rejected: new Map(), dist: {}, current: null };
    pulses = [];
    k = 0;
  }
  const ek = (u, v) => (u < v ? `${u}-${v}` : `${v}-${u}`);

  function apply(ev) {
    const [type, a, b, c] = ev;
    if (type === 'frontier') { state.frontier.add(a); if (b != null) pulses.push({ u: b, v: a, t: 0, col: C.front }); }
    if (type === 'visit') {
      state.frontier.delete(a); state.visited.add(a); state.current = a;
      if (b != null && res.algorithm !== 'dijkstra') state.tree.add(ek(a, b));
      if (res.algorithm === 'dijkstra') state.dist[a] = c;
      pulses.push({ ring: a, t: 0, col: C.visit });
    }
    if (type === 'relax') { state.relaxed.set(ek(a, b), 1); state.dist[b] = c; pulses.push({ u: a, v: b, t: 0, col: C.relax }); }
    if (type === 'skip') state.rejected.set(ek(a, b), 1);
    if (type === 'consider') pulses.push({ u: a, v: b, t: 0, col: 'rgba(255,255,255,.8)' });
    if (type === 'take') { state.tree.add(ek(a, b)); state.visited.add(a); state.visited.add(b); pulses.push({ u: a, v: b, t: 0, col: C.tree }); }
    if (type === 'reject') state.rejected.set(ek(a, b), 1);
  }

  function geom(w, h) {
    const pad = 34;
    return (n) => [pad + n.x * (w - 2 * pad), pad + n.y * (h - 2 * pad)];
  }

  function draw(t) {
    plot.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#1098ad', stars: 80, t });
      if (!res) return;
      const P = geom(w, h);
      const nodes = res.graph.nodes;
      const pos = nodes.map(P);
      const done = k >= res.events.length;
      const treeFinal = done ? new Set(res.tree.map(([u, v]) => ek(u, v))) : state.tree;
      // edges
      for (const e of res.graph.edges) {
        const key = ek(e.u, e.v);
        const [x1, y1] = pos[e.u], [x2, y2] = pos[e.v];
        const inTree = treeFinal.has(key);
        ctx.save();
        if (inTree) { glow(ctx, C.tree, 16); ctx.strokeStyle = C.tree; ctx.lineWidth = 3.2; }
        else if (state.rejected.has(key)) { ctx.strokeStyle = 'rgba(255,77,77,.35)'; ctx.lineWidth = 1.4; ctx.setLineDash([4, 5]); }
        else if (state.relaxed.has(key)) { glow(ctx, C.relax, 8); ctx.strokeStyle = rgba(C.relax, 0.6); ctx.lineWidth = 1.8; }
        else { ctx.strokeStyle = 'rgba(150,170,255,.22)'; ctx.lineWidth = 1.2; }
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.restore();
        if (['dijkstra', 'prim', 'kruskal'].includes(res.algorithm)) {
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
          ctx.fillStyle = 'rgba(8,10,22,.8)'; ctx.beginPath(); ctx.arc(mx, my, 9, 0, TAU); ctx.fill();
          label(ctx, String(e.w), mx, my, { align: 'center', size: 9.5, color: inTree ? C.tree : 'rgba(200,210,255,.75)' });
        }
      }
      // energy flowing along the finished tree (ambient particles)
      if (done && !reducedMotion()) {
        for (const [u, v] of res.tree) {
          const [x1, y1] = pos[u], [x2, y2] = pos[v];
          for (let q = 0; q < 2; q++) {
            const f = ((t / 1400) + q * 0.5 + (u * 0.13)) % 1;
            ctx.save(); glow(ctx, '#fff3bf', 10); ctx.fillStyle = '#fff9db';
            ctx.beginPath(); ctx.arc(lerp(x1, x2, f), lerp(y1, y2, f), 1.8, 0, TAU); ctx.fill(); ctx.restore();
          }
        }
      }
      // selected shortest path
      if (selected != null && res.paths?.[selected]) {
        const path = res.paths[selected].map((i) => pos[i]);
        ctx.save(); glow(ctx, C.path, 20); ctx.strokeStyle = C.path; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore();
        const seg = ((t / 900) % 1) * (path.length - 1);
        const i = Math.floor(seg), f = seg - i;
        if (path[i + 1]) { ctx.save(); glow(ctx, '#fff', 24); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(lerp(path[i][0], path[i + 1][0], f), lerp(path[i][1], path[i + 1][1], f), 5, 0, TAU); ctx.fill(); ctx.restore(); }
      }
      // pulses (travelling sparks and shock-wave rings)
      for (const p of pulses) {
        if (p.ring != null) {
          const [x, y] = pos[p.ring];
          ctx.save(); ctx.strokeStyle = rgba(p.col.startsWith('#') ? p.col : '#ffffff', 1 - p.t); ctx.lineWidth = 2;
          glow(ctx, p.col, 12); ctx.beginPath(); ctx.arc(x, y, 12 + 30 * p.t, 0, TAU); ctx.stroke(); ctx.restore();
        } else {
          const [x1, y1] = pos[p.u], [x2, y2] = pos[p.v];
          ctx.save(); glow(ctx, p.col, 16); ctx.fillStyle = p.col;
          ctx.beginPath(); ctx.arc(lerp(x1, x2, p.t), lerp(y1, y2, p.t), 4, 0, TAU); ctx.fill(); ctx.restore();
        }
      }
      // nodes
      nodes.forEach((n, i) => {
        const [x, y] = pos[i];
        const isStart = i === res.start && !['kruskal'].includes(res.algorithm);
        const col = state.current === i && !done ? '#ffffff' : state.visited.has(i) ? C.visit : state.frontier.has(i) ? C.front : C.node;
        ctx.save();
        glow(ctx, col, state.visited.has(i) || state.frontier.has(i) ? 22 : 8);
        const g = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, 15);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, col); g.addColorStop(1, rgba(col.startsWith('#') ? col : '#3bc9db', 0.25));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, i === selected ? 16 : 13, 0, TAU); ctx.fill();
        noGlow(ctx);
        if (isStart) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 18, 0, TAU); ctx.stroke(); }
        ctx.restore();
        label(ctx, n.label, x, y + 0.5, { align: 'center', size: 11, weight: 700, color: '#0b0d1a' });
        if (res.algorithm === 'dijkstra' && state.dist[i] != null) label(ctx, `d=${state.dist[i]}`, x, y - 24, { align: 'center', size: 10, color: C.relax });
        if (['bfs', 'dfs'].includes(res.algorithm) && state.visited.has(i)) label(ctx, `#${res.order.indexOf(i) + 1}`, x, y - 24, { align: 'center', size: 10, color: C.visit });
      });
    });
  }

  function frame(t) {
    const dt = Math.min(0.1, (t - tPrev) / 1000);
    tPrev = t;
    if (res && k < res.events.length) {
      acc += dt * st.speed;
      while (acc >= 1 && k < res.events.length) { apply(res.events[k++]); acc -= 1; }
      if (k >= res.events.length) finish();
    }
    pulses.forEach((p) => { p.t += dt * (p.ring != null ? 1.6 : 2.4); });
    pulses = pulses.filter((p) => p.t < 1);
    draw(t);
  }

  async function run() {
    try {
      res = await api.lab('dsa/graph', { algorithm: st.algorithm, nodes: st.nodes, density: st.density, seed: st.seed, start: st.start }, store.user?.id);
    } catch (e) { toast(esc(e.message), 'error'); return; }
    reset();
    selected = null;
    acc = 0;
    $('[data-metrics]').innerHTML = '<div class="empty small">Running…</div>';
    if (reducedMotion()) { res.events.forEach(apply); k = res.events.length; finish(); }
    stop?.();
    tPrev = performance.now();
    stop = loop((t) => frame(t + tPrev));
  }

  function finish() {
    const L = (i) => res.graph.nodes[i].label;
    const facts = [`Graph: ${res.graph.nodes.length} nodes, ${res.graph.edges.length} edges (seed ${st.seed}); algorithm ${ALGS.find((a) => a[0] === res.algorithm)[1]}`];
    if (res.algorithm === 'dijkstra') {
      $('[data-tbl-title]').textContent = `Shortest distances from ${L(res.start)}`;
      $('[data-tbl]').innerHTML = `<table class="table"><thead><tr><th>Node</th><th>Distance</th><th>Path</th></tr></thead><tbody>${res.dist.map((d, i) => `<tr data-n="${i}" style="cursor:pointer"><td><b>${L(i)}</b></td><td class="mono">${d ?? '∞'}</td><td class="mono tiny">${(res.paths[i] || []).map(L).join('→')}</td></tr>`).join('')}</tbody></table>`;
      $('[data-tbl]').querySelectorAll('[data-n]').forEach((r) => r.addEventListener('click', () => { selected = +r.dataset.n; }));
      $('[data-metrics]').innerHTML = metric('Reachable', res.dist.filter((d) => d != null).length) + metric('Farthest', Math.max(...res.dist.filter((d) => d != null))) + metric('Events', res.events.length);
      facts.push(`Shortest distances from ${L(res.start)}: ${res.dist.map((d, i) => `${L(i)}=${d}`).join(', ')}`);
      $('[data-tip]').textContent = 'Click a node (or a table row) to trace its shortest path.';
    } else if (res.algorithm === 'prim' || res.algorithm === 'kruskal') {
      $('[data-tbl-title]').textContent = 'Tree edges (in the order they were added)';
      const w = (u, v) => res.graph.edges.find((e) => (e.u === u && e.v === v) || (e.u === v && e.v === u)).w;
      $('[data-tbl]').innerHTML = `<div class="row" style="gap:6px">${res.tree.map(([u, v]) => `<span class="chip amber">${L(u)}–${L(v)} · ${w(u, v)}</span>`).join('')}</div>`;
      $('[data-metrics]').innerHTML = metric('Total weight', res.total, 'good') + metric('Tree edges', res.tree.length) + metric('Rejected', res.events.filter((e) => e[0] === 'reject').length);
      facts.push(`Minimum spanning tree total weight ${res.total} using ${res.tree.length} edges: ${res.tree.map(([u, v]) => `${L(u)}-${L(v)}`).join(', ')}`);
    } else {
      $('[data-tbl-title]').textContent = 'Visit order';
      $('[data-tbl]').innerHTML = `<div class="row" style="gap:6px">${res.order.map((i, j) => `<span class="chip ${j === 0 ? 'green' : 'gray'}">${j + 1}. ${L(i)}</span>`).join('')}</div>`;
      $('[data-metrics]').innerHTML = metric('Visited', res.order.length) + metric('Max depth', Math.max(...Object.values(res.levels))) + metric('Events', res.events.length);
      facts.push(`Visit order: ${res.order.map(L).join(' → ')}; maximum depth in the search tree ${Math.max(...Object.values(res.levels))}`);
    }
    setLabContext('graphs', 'Graph explorer', facts);
  }

  plot.canvas.addEventListener('click', (e) => {
    if (!res?.paths) return;
    const [x, y] = plot.local(e);
    const P = geom(plot.w, plot.h);
    const hit = res.graph.nodes.findIndex((n) => { const [nx, ny] = P(n); return Math.hypot(nx - x, ny - y) < 18; });
    if (hit >= 0) selected = hit;
  });
  $('[data-run]').addEventListener('click', run);
  $('[data-dice]').addEventListener('click', () => { st.seed = Math.floor(Math.random() * 1000); run(); });
  function explain() {
    $('[data-explain]').textContent = {
      bfs: 'BFS uses a queue: it visits every node one edge away, then two edges away… like a ripple. It finds paths with the fewest edges.',
      dfs: 'DFS uses a stack: it dives down one branch as far as possible before backtracking. Great for exploring, cycle detection and topological order.',
      dijkstra: 'Dijkstra always finalises the closest unfinished node, then relaxes its edges (pink sparks). With non-negative weights the distances are optimal.',
      prim: 'Prim grows one tree from the start node, always adding the cheapest edge that reaches a new node.',
      kruskal: 'Kruskal sorts all edges by weight and adds each one unless it would close a cycle (red dashes = rejected).',
    }[st.algorithm];
  }
  explain();
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { stop?.(); plot.dispose(); } };
}
