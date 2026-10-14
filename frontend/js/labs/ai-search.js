// AI lab: pathfinding visualiser — BFS, DFS, UCS, Greedy and A* on an editable grid.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, cssVar, hydrateIcons } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';

export const meta = {
  howto: [
    'Pick a map or draw your own: walls block, mud costs 5 per step. Drag the start (S) and goal (G).',
    'Choose a search algorithm (and a heuristic for Greedy / A*).',
    'Run: cells light up in the order they are expanded; then the path is drawn.',
    'Press “Compare all” to see how many cells each algorithm explores and how good its path is.',
  ],
};

const ALGS = [['bfs', 'Breadth-first (BFS)'], ['dfs', 'Depth-first (DFS)'], ['ucs', 'Uniform-cost (UCS)'], ['greedy', 'Greedy best-first'], ['astar', 'A* search']];

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { preset: 'maze', algorithm: 'astar', heuristic: 'manhattan', tool: 'wall', speed: 60, ...preset };
  const mapLocked = lock.includes('preset');
  let grid = await api.get(`/api/ai/maze/${st.preset}`);
  let res = null;
  let shown = 0;
  let anim = null;
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <div class="row"><button class="btn btn-course grow" data-run>${icon('play')} Run</button><button class="btn btn-ghost" data-cmp>${icon('chart')} Compare all</button></div>
      <div class="card card-tight sticky small" data-explain></div>
    </div>
    <div class="stack" style="min-width:0"><div class="card">
      <div class="card-head"><h3>${icon('route')} Grid world</h3><div class="legend"><span><i style="background:var(--text)"></i>wall</span><span><i style="background:#a0785a"></i>mud (cost 5)</span><span><i style="background:var(--course);opacity:.5"></i>expanded</span><span><i style="background:#ffd43b"></i>path</span></div></div>
      <div data-plot style="cursor:crosshair"></div>
      <p class="faint small" style="margin:8px 0 0">${mapLocked ? 'The map is fixed for this challenge.' : 'Click & drag to paint with the selected tool.'}</p></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
        <div class="card"><div class="card-head"><h3>Result</h3></div><div class="metrics" data-metrics><div class="empty small">Press Run.</div></div></div>
        <div class="card"><div class="card-head"><h3>Comparison</h3></div><div data-cmpbody class="small muted">Press “Compare all”.</div></div>
      </div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  const ctl = controls($('[data-ctl]'), [
    { type: 'select', key: 'preset', label: 'Map', options: [['open', 'Open field'], ['maze', 'Maze'], ['mud', 'Swamp (mud)'], ['trap', 'U-shaped trap']] },
    { type: 'select', key: 'algorithm', label: 'Algorithm', options: ALGS },
    { type: 'seg', key: 'heuristic', label: 'Heuristic h(n)', options: [['manhattan', 'Manhattan'], ['euclidean', 'Euclidean'], ['zero', 'h = 0']], show: (s) => ['astar', 'greedy'].includes(s.algorithm) },
    { type: 'seg', key: 'tool', label: 'Paint tool', options: [['wall', 'Wall'], ['mud', 'Mud'], ['erase', 'Erase'], ['start', 'Start'], ['goal', 'Goal']], show: () => !mapLocked },
    { type: 'slider', key: 'speed', label: 'Animation speed', min: 5, max: 200, step: 5, fmt: (v) => `${v} cells/s` },
  ], st, async (k) => {
    if (k === 'preset') { grid = await api.get(`/api/ai/maze/${st.preset}`); res = null; draw(); run(); }
    if (k === 'algorithm' || k === 'heuristic') run();
  }, { lock });
  explain();

  const plot = new Plot($('[data-plot]'), { aspect: 0.6 });
  const key = (r, c) => `${r},${c}`;

  function geom(w, h) {
    const cs = Math.min(w / grid.cols, h / grid.rows);
    return { cs, ox: (w - cs * grid.cols) / 2, oy: (h - cs * grid.rows) / 2 };
  }

  function draw() {
    plot.draw((ctx, w, h) => {
      const { cs, ox, oy } = geom(w, h);
      plot.g = { cs, ox, oy };
      const walls = new Set(grid.walls.map(([r, c]) => key(r, c)));
      const mud = new Set((grid.mud || []).map(([r, c]) => key(r, c)));
      ctx.strokeStyle = cssVar('--chart-grid');
      for (let r = 0; r < grid.rows; r++) for (let c = 0; c < grid.cols; c++) {
        const x = ox + c * cs, y = oy + r * cs;
        if (mud.has(key(r, c))) { ctx.fillStyle = 'rgba(160,120,90,.55)'; ctx.fillRect(x, y, cs, cs); }
        ctx.strokeRect(x + 0.5, y + 0.5, cs, cs);
      }
      if (res) {
        const course = cssVar('--course');
        const n = Math.min(shown, res.order.length);
        for (let i = 0; i < n; i++) {
          const [r, c] = res.order[i];
          ctx.globalAlpha = 0.18 + 0.5 * (i / Math.max(1, res.order.length));
          ctx.fillStyle = course;
          ctx.fillRect(ox + c * cs + 1, oy + r * cs + 1, cs - 2, cs - 2);
        }
        ctx.globalAlpha = 1;
        if (n < res.order.length && n > 0) {
          const [r, c] = res.order[n - 1];
          ctx.strokeStyle = course;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(ox + c * cs + 1, oy + r * cs + 1, cs - 2, cs - 2);
        }
        if (n >= res.order.length && res.path.length) {
          ctx.strokeStyle = '#fcc419';
          ctx.lineWidth = Math.max(4, cs * 0.42);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          res.path.forEach(([r, c], i) => { const x = ox + (c + 0.5) * cs, y = oy + (r + 0.5) * cs; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      ctx.fillStyle = cssVar('--text');
      walls.forEach((k) => { const [r, c] = k.split(',').map(Number); ctx.fillRect(ox + c * cs, oy + r * cs, cs, cs); });
      const mark = ([r, c], color, label) => {
        const x = ox + (c + 0.5) * cs, y = oy + (r + 0.5) * cs;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, y, cs * 0.46, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `700 ${Math.max(9, cs * 0.55)}px Inter, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y + 1);
      };
      mark(grid.start, '#0ca678', 'S');
      mark(grid.goal, '#e03131', 'G');
    });
  }

  // painting
  let painting = false;
  const cellAt = (e) => {
    const [x, y] = plot.local(e);
    const { cs, ox, oy } = plot.g;
    const c = Math.floor((x - ox) / cs), r = Math.floor((y - oy) / cs);
    return r >= 0 && r < grid.rows && c >= 0 && c < grid.cols ? [r, c] : null;
  };
  const paint = (e) => {
    if (mapLocked) return;
    const cell = cellAt(e);
    if (!cell) return;
    const k = key(...cell);
    const isSG = k === key(...grid.start) || k === key(...grid.goal);
    grid.walls = grid.walls.filter(([r, c]) => key(r, c) !== k);
    grid.mud = (grid.mud || []).filter(([r, c]) => key(r, c) !== k);
    if (st.tool === 'wall' && !isSG) grid.walls.push(cell);
    if (st.tool === 'mud' && !isSG) grid.mud.push(cell);
    if (st.tool === 'start') grid.start = cell;
    if (st.tool === 'goal') grid.goal = cell;
    res = null;
    draw();
  };
  plot.canvas.addEventListener('pointerdown', (e) => { painting = true; plot.canvas.setPointerCapture(e.pointerId); paint(e); });
  plot.canvas.addEventListener('pointermove', (e) => { if (painting && ['wall', 'mud', 'erase'].includes(st.tool)) paint(e); });
  plot.canvas.addEventListener('pointerup', () => { painting = false; });

  const cfg = (alg = st.algorithm, h = st.heuristic) => ({ rows: grid.rows, cols: grid.cols, walls: grid.walls, mud: grid.mud, start: grid.start, goal: grid.goal, algorithm: alg, heuristic: h });

  async function run() {
    cancelAnimationFrame(anim);
    try {
      res = await api.lab('ai/search', cfg(), store.user?.id);
      shown = 0;
      let last = performance.now();
      const tick = (t) => {
        shown = Math.min(res.order.length, shown + Math.max(1, Math.round(((t - last) / 1000) * st.speed)));
        last = t;
        draw();
        if (shown < res.order.length) anim = requestAnimationFrame(tick);
        else showResult();
      };
      anim = requestAnimationFrame(tick);
    } catch (e) { toast(e.message, 'error'); }
  }

  function showResult() {
    $('[data-metrics]').innerHTML = metric('Expanded', res.expanded) + metric('Path cost', res.found ? res.path_cost : '—') + metric('Path steps', res.found ? res.path_length : '—') + metric('Max frontier', res.max_frontier);
    if (!res.found) toast('No path exists — the goal is walled off!', 'error');
    setLabContext('search', 'Pathfinding lab', [
      `Map ${st.preset}${mapLocked ? '' : ' (possibly edited)'}: ${grid.rows}×${grid.cols} grid, ${grid.walls.length} walls, ${(grid.mud || []).length} mud cells (cost 5)`,
      `Algorithm ${ALGS.find((a) => a[0] === res.algorithm)[1]}${['astar', 'greedy'].includes(res.algorithm) ? ` with ${res.heuristic} heuristic` : ''}`,
      res.found ? `Found a path: cost ${res.path_cost}, ${res.path_length} steps, after expanding ${res.expanded} cells (max frontier ${res.max_frontier})` : 'No path found',
    ]);
  }

  $('[data-run]').addEventListener('click', run);
  $('[data-cmp]').addEventListener('click', async () => {
    const box = $('[data-cmpbody]');
    box.innerHTML = 'Running all algorithms…';
    try {
      const rows = [];
      for (const [alg, h] of [['bfs', 'manhattan'], ['dfs', 'manhattan'], ['ucs', 'zero'], ['greedy', 'manhattan'], ['astar', 'manhattan']]) {
        const r = await api.lab('ai/search', cfg(alg, h));
        rows.push({ alg, ...r });
      }
      const best = Math.min(...rows.filter((r) => r.found).map((r) => r.path_cost));
      box.innerHTML = `<table class="table"><thead><tr><th>Algorithm</th><th>Expanded</th><th>Cost</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(ALGS.find((a) => a[0] === r.alg)[1].split(' (')[0])}</td><td class="mono">${r.expanded}</td><td class="mono" style="color:${r.path_cost === best ? 'var(--green)' : 'var(--red)'}">${r.found ? r.path_cost : '—'}${r.path_cost === best ? ' ✓' : ''}</td></tr>`).join('')}</tbody></table>
        <p class="faint tiny" style="margin:6px 0 0">✓ = optimal cost. Fewer expansions = less work.</p>`;
    } catch (e) { box.textContent = e.message; }
  });

  function explain() {
    const text = {
      bfs: 'BFS explores in rings around the start (a FIFO queue). Shortest path when all steps cost the same — but it ignores mud costs.',
      dfs: 'DFS dives as deep as it can before backtracking (a stack). Little memory, but the path is usually long and winding.',
      ucs: 'UCS always expands the cheapest path so far (a priority queue on g). Optimal even with mud, but it explores in every direction.',
      greedy: 'Greedy best-first rushes toward the goal using only h(n). Fast, but it can be fooled by walls and is not guaranteed optimal.',
      astar: 'A* orders by f = g + h: cost so far plus an optimistic guess of what remains. With an admissible heuristic it is optimal and focused.',
    };
    $('[data-explain]').textContent = text[st.algorithm];
  }
  root.addEventListener('change', explain);
  draw();
  run();
  return { getConfig: () => ({ ...cfg(), preset: st.preset }), destroy: () => { cancelAnimationFrame(anim); plot.dispose(); } };
}
