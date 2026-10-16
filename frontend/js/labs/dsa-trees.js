// DSA lab: Tree Garden — BST vs AVL; nodes glide between snapshots so rotations are visible, comets run traversals.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { controls, Plot, Player, setLabContext, metric } from './kit.js';
import { space, glow, noGlow, label, loop, reducedMotion, TAU, lerp, ease, rgba } from './neon.js';

export const meta = {
  howto: [
    'Choose BST or AVL, then insert keys — random, already sorted, or your own list.',
    'Scrub the timeline: each step inserts (or deletes) one key. The insertion path glows and AVL rotations are announced.',
    'Node colour shows the balance factor: green = perfectly balanced, amber = leaning, red = out of balance.',
    'Play a traversal to watch a comet visit the nodes in in-order, pre-order, post-order or level order.',
  ],
};

const BF = (bf) => (bf === 0 ? '#69db7c' : Math.abs(bf) === 1 ? '#fcc419' : '#ff4d4d');

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { kind: 'avl', preset: 'random', values: '', remove: '', traversal: 'inorder', ...preset };
  if (Array.isArray(st.values)) st.values = st.values.join(', ');
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <div class="row"><input class="input mono" data-add placeholder="key, e.g. 42" style="flex:1"><button class="btn btn-course" data-addbtn>${icon('plus')} Insert</button></div>
      <div class="row"><button class="btn btn-ghost grow" data-trav>${icon('play')} Play traversal</button></div>
      <div class="card card-tight sticky small" data-explain></div>
    </div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('tree')} <span data-title>Tree</span></h3><div class="legend"><span><i style="background:#69db7c"></i>balanced</span><span><i style="background:#fcc419"></i>±1</span><span><i style="background:#ff4d4d"></i>±2+</span></div></div>
        <div data-plot></div><div data-player style="margin-top:10px"></div><div class="trav-strip mono small" data-seq></div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
        <div class="card"><div class="card-head"><h3>Shape</h3></div><div class="metrics" data-metrics></div></div>
        <div class="card"><div class="card-head"><h3>This step</h3></div><div data-step class="small muted">—</div></div>
      </div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  const ctl = controls($('[data-ctl]'), [
    { type: 'seg', key: 'kind', label: 'Tree type', options: [['bst', 'Plain BST'], ['avl', 'AVL (self-balancing)']] },
    { type: 'seg', key: 'preset', label: 'Keys', options: [['random', 'Random'], ['sorted', 'Sorted'], ['custom', 'My list']] },
    { type: 'text', key: 'values', label: 'My keys (comma separated)', show: (s) => s.preset === 'custom' },
    { type: 'text', key: 'remove', label: 'Then delete (optional)' },
    { type: 'select', key: 'traversal', label: 'Traversal', options: [['inorder', 'In-order (sorted!)'], ['preorder', 'Pre-order'], ['postorder', 'Post-order'], ['levelorder', 'Level order (BFS)']] },
  ], st, (k) => { if (k !== 'traversal') run(); explain(); }, { lock });

  const plot = new Plot($('[data-plot]'), { aspect: 0.55 });
  const player = new Player($('[data-player]'), { label: (i, n) => `step ${i + 1}/${n}`, fps: 2.2 });
  let res = null, idx = 0, from = null, to = null, tween = 1, comet = null, stop = null, tPrev = 0;

  const parseList = (s) => String(s ?? '').split(/[\s,]+/).filter((x) => x.trim() !== '').map(Number).filter((x) => Number.isInteger(x) && x >= -999 && x <= 999).slice(0, 31);

  function layout(tree) {
    const out = new Map();
    let i = 0;
    const walk = (n, d) => { if (!n) return; walk(n.left, d + 1); out.set(n.key, { x: i++, d, n }); walk(n.right, d + 1); };
    walk(tree, 0);
    const count = Math.max(1, i);
    out.forEach((v) => { v.fx = (v.x + 0.5) / count; });
    return out;
  }

  function show(i) {
    idx = i;
    from = to;
    to = layout(res.snapshots[i].tree);
    tween = from && !reducedMotion() ? 0 : 1;
    const s = res.snapshots[i];
    $('[data-step]').innerHTML = `<b>${s.op === 'insert' ? 'Insert' : 'Delete'} ${s.key}</b><br>Path: ${s.path.length ? s.path.join(' → ') : '(empty tree)'}<br>
      ${s.rotations.length ? `<span class="chip pink">↻ ${esc(s.rotations.join(' · '))}</span>` : '<span class="faint">no rotation needed</span>'}<br>Height after: <b>${s.height}</b>`;
    comet = null;
  }

  function draw(t) {
    plot.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#2b8a3e', stars: 60, t });
      if (!to) return;
      const height = Math.max(1, ...[...to.values()].map((v) => v.d + 1));
      const k = ease(Math.min(1, tween));
      const P = (key) => {
        const b = to.get(key);
        const a = from?.get(key) || b;
        const x = lerp(a.fx, b.fx, k), d = lerp(a.d, b.d, k);
        return [24 + x * (w - 48), 34 + (d / Math.max(1, height - 1 || 1)) * (h - 70)];
      };
      const snap = res.snapshots[idx];
      const pathSet = new Set(snap.path);
      // branches
      to.forEach((v, key) => {
        for (const child of [v.n.left, v.n.right]) {
          if (!child) continue;
          const [x1, y1] = P(key), [x2, y2] = P(child.key);
          ctx.save();
          const onPath = pathSet.has(key) && (pathSet.has(child.key) || child.key === snap.key);
          glow(ctx, onPath ? '#fff3bf' : '#63e6be', onPath ? 18 : 8);
          ctx.strokeStyle = onPath ? '#fff3bf' : 'rgba(99,230,190,.55)';
          ctx.lineWidth = onPath ? 3 : 1.8;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(x1, (y1 + y2) / 2, x2, (y1 + y2) / 2, x2, y2); ctx.stroke();
          ctx.restore();
        }
      });
      // nodes
      const r = Math.max(10, Math.min(18, (w / Math.max(8, to.size)) * 0.36));
      to.forEach((v, key) => {
        const [x, y] = P(key);
        const col = BF(v.n.bf);
        const isNew = key === snap.key && snap.op === 'insert';
        ctx.save();
        glow(ctx, col, isNew ? 30 : 16);
        const g = ctx.createRadialGradient(x - r / 3, y - r / 3, 1, x, y, r);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, col); g.addColorStop(1, rgba(col, 0.35));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, isNew ? r * (1 + 0.15 * Math.sin(t / 150)) : r, 0, TAU); ctx.fill();
        ctx.restore();
        label(ctx, String(key), x, y + 0.5, { align: 'center', size: r > 13 ? 11 : 9, weight: 700, color: '#0b0d1a' });
        if (v.n.bf) label(ctx, (v.n.bf > 0 ? '+' : '') + v.n.bf, x + r + 4, y - r + 2, { size: 9, color: col });
      });
      // traversal comet
      if (comet) {
        const seq = comet.seq.filter((key) => to.has(key));
        const f = Math.min(seq.length - 1, (t - comet.t0) / 450);
        const i = Math.floor(f);
        const [x1, y1] = P(seq[i]), [x2, y2] = P(seq[Math.min(seq.length - 1, i + 1)]);
        const fx = lerp(x1, x2, f - i), fy = lerp(y1, y2, f - i);
        ctx.save(); glow(ctx, '#ffffff', 30); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(fx, fy, 6, 0, TAU); ctx.fill(); ctx.restore();
        const shown = seq.slice(0, i + 1);
        $('[data-seq]').innerHTML = shown.map((key, j) => `<span class="${j === i ? 'hot' : ''}">${key}</span>`).join(' → ');
        if (f >= seq.length - 1 && t - comet.t0 > seq.length * 450 + 600) comet = null;
      }
      label(ctx, `height ${snap.height}`, w - 12, 14, { align: 'right', size: 11, color: 'rgba(200,255,230,.8)' });
    });
  }

  function frame(t) {
    const dt = Math.min(0.1, (t - tPrev) / 1000);
    tPrev = t;
    if (tween < 1) tween = Math.min(1, tween + dt * 1.8);
    draw(t);
  }

  async function run() {
    const values = st.preset === 'custom' ? parseList(st.values) : null;
    try {
      res = await api.lab('dsa/tree', { kind: st.kind, preset: st.preset === 'custom' ? 'random' : st.preset, values: values?.length ? values : null, delete: parseList(st.remove) }, store.user?.id);
    } catch (e) { toast(esc(e.message), 'error'); return; }
    st.values = res.values.join(', ');
    to = null;
    $('[data-title]').textContent = res.kind === 'avl' ? 'AVL tree' : 'Binary search tree';
    $('[data-metrics]').innerHTML = metric('Nodes', res.nodes) + metric('Height', res.height, res.height <= res.min_height + 1 ? 'good' : 'bad')
      + metric('Best possible', res.min_height) + metric('Rotations', res.rotations);
    player.load(res.snapshots.length, show, { autoplay: !reducedMotion() });
    setLabContext('trees', 'Tree garden', [
      `${res.kind === 'avl' ? 'AVL tree' : 'Plain BST'} built from ${res.values.length} keys: ${res.values.join(', ')}${parseList(st.remove).length ? `; then deleted ${parseList(st.remove).join(', ')}` : ''}`,
      `Final height ${res.height} (minimum possible ${res.min_height}); ${res.rotations} rotations performed`,
      `In-order traversal: ${res.traversals.inorder.join(', ')}`,
      `Level order: ${res.traversals.levelorder.join(', ')}`,
    ]);
  }

  $('[data-addbtn]').addEventListener('click', () => {
    const v = parseList($('[data-add]').value)[0];
    if (v == null) { toast('Type a whole number between −999 and 999.', 'info'); return; }
    st.preset = 'custom';
    st.values = [...parseList(st.values || res?.values.join(',') || ''), v].join(', ');
    $('[data-add]').value = '';
    ctl.render();
    run();
  });
  $('[data-add]').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('[data-addbtn]').click(); });
  $('[data-trav]').addEventListener('click', () => {
    player.pause();
    player.show(res.snapshots.length - 1);
    tween = 1;
    comet = { seq: res.traversals[st.traversal], t0: performance.now() - tPrevBase };
  });
  function explain() {
    $('[data-explain]').innerHTML = st.kind === 'avl'
      ? '<b>AVL</b>: after every insert the tree checks each node on the path. If one side is 2 levels taller, a single or double <b>rotation</b> fixes it — so height stays about log₂ n.'
      : '<b>Plain BST</b>: smaller keys go left, larger go right. Fast when balanced, but sorted inserts turn it into a long chain — try the <i>Sorted</i> keys!';
  }
  explain();
  const tPrevBase = performance.now();
  tPrev = 0;
  stop = loop((t) => frame(t));
  await run();
  return { getConfig: () => ({ kind: st.kind, values: parseList(st.values) }), destroy: () => { stop?.(); player.pause(); plot.dispose(); } };
}
