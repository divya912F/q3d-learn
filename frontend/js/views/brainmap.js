// Brain Map — an interactive radial mind map of a course: centre → topics → lessons,
// with cross-course links. HTML nodes positioned over an SVG edge layer.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, hydrateIcons } from '../ui.js';
import { navigate, refreshProgress } from '../main.js';

const CNAME = { quantum: 'Quantum', ml: 'Machine Learning', ds: 'Data Science', ai: 'AI', dsa: 'DSA', cyber: 'Cybersecurity', chain: 'Blockchain', dl: 'Deep Learning' };

export async function render(root, { query } = {}) {
  const courses = store.courses;
  let course = (query && query.get && query.get('c')) || sessionStorage.getItem('q3d-brainmap') || 'all';
  if (course !== 'all' && !store.courseMeta(course)) course = 'all';
  const progress = store.user ? await refreshProgress().catch(() => null) : null;

  root.innerHTML = `
    <div class="row-between" style="margin-bottom:10px;flex-wrap:wrap;gap:10px">
      <div><span class="hand" style="font-size:1.3rem;color:var(--violet)">see the whole picture</span>
        <h2 style="margin:0">${icon('mindmap')} Brain Map</h2>
        <p class="muted" style="margin:4px 0 0">Every course as one connected map. Tap a topic to grow its branch; tap a lesson to open it.</p></div>
    </div>
    <div class="seg bm-courses" data-pick style="max-width:720px;margin-bottom:12px;flex-wrap:wrap">
      <button data-c="all" class="${course === 'all' ? 'active' : ''}">🧠 All courses</button>
      ${courses.map((c) => `<button data-c="${c.id}" class="${course === c.id ? 'active' : ''}">${esc(c.short)}</button>`).join('')}
    </div>
    <div class="card bm-stage" data-stage><div class="bm-canvas" data-canvas><svg class="bm-edges" data-edges></svg></div>
      <div class="bm-hint faint tiny" data-hint></div></div>`;
  hydrateIcons(root);

  const stage = root.querySelector('[data-stage]');
  const canvas = root.querySelector('[data-canvas]');
  const edges = root.querySelector('[data-edges]');
  const hint = root.querySelector('[data-hint]');
  const expanded = new Set();

  root.querySelector('[data-pick]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    course = b.dataset.c; sessionStorage.setItem('q3d-brainmap', course);
    root.querySelectorAll('[data-c]').forEach((x) => x.classList.toggle('active', x === b));
    expanded.clear(); draw();
  });

  function node(cls, x, y, html, color, onClick) {
    const el = document.createElement('button');
    el.className = `bm-node ${cls}`;
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    if (color) el.style.setProperty('--nc', color);
    el.innerHTML = html;
    if (onClick) el.addEventListener('click', onClick);
    canvas.appendChild(el);
    return el;
  }
  function edge(x1, y1, x2, y2, color, w = 2) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const mx = (x1 + x2) / 2;
    p.setAttribute('d', `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`);
    p.setAttribute('stroke', color); p.setAttribute('stroke-width', w); p.setAttribute('fill', 'none');
    p.setAttribute('stroke-opacity', '0.5'); p.setAttribute('stroke-linecap', 'round');
    edges.appendChild(p);
  }

  async function draw() {
    canvas.querySelectorAll('.bm-node').forEach((n) => n.remove());
    edges.innerHTML = '';
    const W = canvas.clientWidth || 900;
    const H = canvas.clientHeight || 600;
    edges.setAttribute('viewBox', `0 0 ${W} ${H}`);
    edges.setAttribute('width', W); edges.setAttribute('height', H);
    const cx = W / 2, cy = H / 2;
    if (course === 'all') return drawHub(W, H, cx, cy);
    return drawCourse(W, H, cx, cy);
  }

  async function drawHub(W, H, cx, cy) {
    hint.textContent = 'Tap any course to open its map.';
    document.documentElement.style.setProperty('--course', 'var(--violet)');
    const r = Math.min(W, H) * 0.34;
    const items = courses;
    items.forEach((c, i) => {
      const ang = (i / items.length) * 2 * Math.PI - Math.PI / 2;
      const x = cx + r * Math.cos(ang), y = cy + r * Math.sin(ang);
      const col = `var(--c-${c.id})`;
      edge(cx, cy, x, y, getComputedStyle(document.documentElement).getPropertyValue(`--c-${c.id}`) || '#888', 2.5);
      const pct = progress?.courses?.[c.id]?.progress_pct;
      node('bm-course', x, y, `<span class="bm-ic" style="background:${col}"><i data-icon="${c.icon}"></i></span><b>${esc(c.title)}</b><small>${c.lessons} lessons · ${c.labs.length} labs${pct ? ` · ${pct}%` : ''}</small>`, col, () => {
        course = c.id; sessionStorage.setItem('q3d-brainmap', course);
        root.querySelectorAll('[data-c]').forEach((x2) => x2.classList.toggle('active', x2.dataset.c === c.id));
        expanded.clear(); draw();
      });
    });
    node('bm-centre bm-hub', cx, cy, `<b>Q-3D Learn</b><small>8 courses · 137 lessons</small>`, 'var(--violet)', null);
    hydrateIcons(canvas);
  }

  async function drawCourse(W, H, cx, cy) {
    const c = await api.course(course);
    const col = getComputedStyle(document.documentElement).getPropertyValue(`--c-${course}`).trim() || '#7048e8';
    document.documentElement.style.setProperty('--course', `var(--c-${course})`);
    hint.innerHTML = `<b>${esc(c.title)}</b> — ${Object.keys(c.topics).length} topics, ${c.lessons} lessons. Tap a topic to expand.`;
    const done = new Set(progress?.courses?.[course]?.lessons_completed || []);
    // group lessons by topic
    const byTopic = {};
    for (const l of c.lesson_list) (byTopic[l.topic] ||= []).push(l);
    const topicIds = Object.keys(c.topics).filter((t) => byTopic[t]?.length);
    const rT = Math.min(W, H) * 0.30;
    const positions = {};
    topicIds.forEach((t, i) => {
      const ang = (i / topicIds.length) * 2 * Math.PI - Math.PI / 2;
      positions[t] = { ang, x: cx + rT * Math.cos(ang), y: cy + rT * Math.sin(ang) };
    });
    // edges + topic nodes
    topicIds.forEach((t) => {
      const pos = positions[t];
      edge(cx, cy, pos.x, pos.y, col, 2.5);
      const isOpen = expanded.has(t);
      const n = byTopic[t].length;
      node(`bm-topic ${isOpen ? 'open' : ''}`, pos.x, pos.y, `<b>${esc(c.topics[t])}</b><small>${n} lesson${n > 1 ? 's' : ''} ${isOpen ? '▾' : '▸'}</small>`, col, () => {
        if (expanded.has(t)) expanded.delete(t); else expanded.add(t);
        draw();
      });
    });
    // expanded lessons
    const rL = Math.min(W, H) * 0.30 + Math.min(W, H) * 0.17;
    topicIds.forEach((t) => {
      if (!expanded.has(t)) return;
      const pos = positions[t];
      const ls = byTopic[t].sort((a, b) => a.order - b.order);
      const fan = Math.min(0.9, 0.18 * ls.length);
      ls.forEach((l, j) => {
        const a = pos.ang + (ls.length === 1 ? 0 : (j / (ls.length - 1) - 0.5) * fan);
        const x = cx + rL * Math.cos(a), y = cy + rL * Math.sin(a);
        edge(pos.x, pos.y, x, y, col, 1.5);
        node(`bm-lesson ${done.has(l.id) ? 'done' : ''}`, x, y, `${done.has(l.id) ? '✓ ' : ''}${esc(l.title)}`, col, () => navigate(`/c/${course}/learn/${l.id}`));
      });
    });
    // centre
    node('bm-centre', cx, cy, `<span class="bm-ic" style="background:${col}"><i data-icon="${c.icon}"></i></span><b>${esc(c.title)}</b>`, col, null);
    // cross-course links (roadmap "next")
    (c.roadmap?.next || []).slice(0, 1).forEach(() => {});
    hydrateIcons(canvas);
  }

  // first paint (after layout settles) + on resize
  requestAnimationFrame(() => requestAnimationFrame(draw));
  let rz; const onResize = () => { clearTimeout(rz); rz = setTimeout(draw, 150); };
  window.addEventListener('resize', onResize);
  root._cleanup = () => window.removeEventListener('resize', onResize);
}
