// Instructor dashboard: class analytics per course, weak-topic heatmap, student table and assignments.
import { api } from '../api.js';
import { store } from '../store.js';
import { heatColor } from '../charts.js';
import { esc, icon, hydrateIcons, toast } from '../ui.js';
import { openProfile } from '../main.js';

let current = sessionStorage.getItem('q3d-class') || null;
let course = 'all';

function weakLabel(key) {
  const [cid, t] = key.split(':');
  const meta = store.courseMeta(cid);
  return `${meta?.short || cid} · ${meta?.topics?.[t] || t}`;
}

export async function render(root) {
  const u = store.user;
  const mine = u?.role === 'instructor' ? await api.myClassrooms(u.id).catch(() => []) : [];
  if (!current && mine.length) current = mine[0].code;
  document.documentElement.style.setProperty('--course', course === 'all' ? 'var(--primary)' : `var(--c-${course})`);

  root.innerHTML = `
    <div class="row-between" style="margin-bottom:16px">
      <div><span class="hand" style="font-size:1.3rem;color:var(--pink)">teacher's register</span><h2 style="margin:0">Instructor Dashboard</h2><p class="muted" style="margin:4px 0 0">Teach better. Track smarter. Spot weak topics before the exam does.</p></div>
      <div class="row">
        <select class="input" data-class style="width:auto"><option value="">Select classroom…</option>${mine.map((c) => `<option value="${c.code}">${esc(c.name)} · ${c.code}</option>`).join('')}<option value="DEMO42">Demo class · DEMO42</option></select>
        <button class="btn btn-ghost btn-sm" data-demo>${icon('sparkle')} Load demo class</button>
        ${u?.role === 'instructor' ? `<button class="btn btn-primary btn-sm" data-new>${icon('plus')} New classroom</button>` : ''}
      </div>
    </div>
    ${u?.role !== 'instructor' ? `<div class="callout insight"><i data-icon="info"></i><div>You're viewing as ${u ? 'a student' : 'a guest'}. <a href="#" data-prof>Create an instructor profile</a> to run your own classroom — or explore the demo class with sample data.</div></div>` : ''}
    <div class="seg" data-course style="margin:6px 0 16px;max-width:560px"><button data-c="all" class="${course === 'all' ? 'active' : ''}">All courses</button>${store.courses.map((c) => `<button data-c="${c.id}" class="${course === c.id ? 'active' : ''}">${esc(c.short)}</button>`).join('')}</div>
    <div data-body></div>`;
  hydrateIcons(root);
  const sel = root.querySelector('[data-class]');
  if (current) sel.value = current;
  sel.addEventListener('change', () => { current = sel.value || null; sessionStorage.setItem('q3d-class', current || ''); load(); });
  root.querySelector('[data-prof]')?.addEventListener('click', (e) => { e.preventDefault(); openProfile(); });
  root.querySelector('[data-course]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]');
    if (!b) return;
    course = b.dataset.c;
    root.querySelectorAll('[data-c]').forEach((x) => x.classList.toggle('active', x === b));
    document.documentElement.style.setProperty('--course', course === 'all' ? 'var(--primary)' : `var(--c-${course})`);
    load();
  });
  root.querySelector('[data-demo]').addEventListener('click', async () => {
    await api.demoClassroom(u?.role === 'instructor' ? u.id : null);
    current = 'DEMO42';
    sessionStorage.setItem('q3d-class', current);
    sel.value = current;
    toast('Demo classroom loaded — 12 students across every course', 'success');
    load();
  });
  root.querySelector('[data-new]')?.addEventListener('click', async () => {
    const name = prompt('Classroom name:', 'Future Tech — Section A');
    if (!name) return;
    const c = await api.createClassroom(name, u.id);
    toast(`Classroom created. Share code <b class="mono">${c.code}</b> with your students.`, 'success', 7000);
    current = c.code;
    sessionStorage.setItem('q3d-class', current);
    render(root);
  });

  async function load() {
    const body = root.querySelector('[data-body]');
    if (!current) {
      body.innerHTML = '<div class="card empty"><i data-icon="users"></i><div>Pick a classroom, or click <b>Load demo class</b> to explore the dashboard with sample data.</div></div>';
      hydrateIcons(body);
      return;
    }
    try {
      const [o, lessons, challenges] = await Promise.all([
        api.overview(current, course),
        Promise.all(store.courses.map((c) => api.lessons(c.id))),
        Promise.all(store.courses.map((c) => api.challenges(c.id))),
      ]);
      renderOverview(body, o, lessons.flat(), challenges.flat(), load);
    } catch (e) {
      body.innerHTML = `<div class="card empty"><i data-icon="alert"></i><div>${esc(e.message)}${current === 'DEMO42' ? ' — click “Load demo class” first.' : ''}</div></div>`;
      hydrateIcons(body);
    }
  }
  await load();
}

function renderOverview(body, o, lessons, challenges, reload) {
  const t = o.totals;
  let sortKey = 'xp';
  let dir = -1;
  const colKeys = Object.keys(o.columns);
  body.innerHTML = `
    <div class="row" style="margin-bottom:14px"><h3 style="margin:0">${esc(o.classroom.name)}</h3><span class="chip mono">${o.classroom.code}</span><span class="faint small">Students join with this code from their profile.</span></div>
    <div class="grid stats-row">
      ${kpi('Students', t.students, 'users', 'var(--primary)')}
      ${kpi('Avg quiz score', t.avg_quiz != null ? `${t.avg_quiz}%` : '—', 'checkCircle', 'var(--green)')}
      ${kpi('Lab experiments', t.experiments, 'flask', 'var(--violet)')}
      ${kpi('Challenges solved', t.challenges_solved, 'trophy', 'var(--amber)')}
    </div>
    ${o.weakest.length ? `<div class="callout warning" style="margin-top:18px"><i data-icon="alert"></i><div><b>Weak-topic alert:</b> the class is struggling most with ${o.weakest.map((k) => `<b>${esc(o.columns[k])}</b> (${o.class_heat[k]}%)`).join(', ')}. Consider assigning a review lesson or a targeted challenge.</div></div>` : ''}
    <div class="grid" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);margin-top:18px" data-two>
      <div class="card"><div class="card-head"><h3>${icon('target')} ${o.course === 'all' ? 'Course mastery' : 'Topic mastery'} heatmap</h3><div class="legend"><span><i style="background:${heatColor(30)}"></i>&lt;50</span><span><i style="background:${heatColor(65)}"></i>50–79</span><span><i style="background:${heatColor(95)}"></i>80+</span></div></div>
        <div style="overflow-x:auto"><div class="heat" style="grid-template-columns:110px repeat(${colKeys.length}, minmax(56px,1fr))">
          <div></div>${colKeys.map((k) => `<div class="hh">${esc(o.columns[k])}</div>`).join('')}
          <div class="hn"><b>Class avg</b></div>${colKeys.map((k) => cell(o.class_heat[k])).join('')}
          ${o.students.map((s) => `<div class="hn" title="${esc(s.name)}">${esc(s.name)}</div>${colKeys.map((k) => cell(s.heat[k])).join('')}`).join('')}
        </div></div></div>
      <div class="card"><div class="card-head"><h3>${icon('file')} Assignments</h3></div>
        <div class="stack" style="gap:10px">${o.assignments.length ? o.assignments.map((a) => `
          <div><div class="row-between small"><span><b>${esc(a.title)}</b> <span class="chip gray">${esc(store.courseMeta(a.course)?.short || a.course)} · ${a.item_type}</span></span><span class="faint">${a.due ? `due ${esc(a.due)}` : ''}</span></div>
          <div class="row" style="gap:10px;margin-top:6px;flex-wrap:nowrap"><div class="progress grow"><span style="width:${a.completion}%;background:var(--c-${a.course})"></span></div><span class="mono small">${a.completion}%</span></div></div>`).join('') : '<div class="faint small">No assignments for this view yet.</div>'}</div>
        <hr><form class="stack" style="gap:8px" data-assign>
          <input class="input" name="title" placeholder="Assignment title" required>
          <select class="input" name="item">${store.courses.map((c) => `<optgroup label="${esc(c.title)}">${lessons.filter((l) => l.course === c.id).map((l) => `<option value="lesson:${l.id}">Lesson · ${esc(l.title)}</option>`).join('')}${challenges.filter((x) => x.course === c.id).map((x) => `<option value="challenge:${x.id}">Challenge · ${esc(x.title)}</option>`).join('')}</optgroup>`).join('')}</select>
          <div class="row" style="flex-wrap:nowrap"><input class="input" type="date" name="due"><button class="btn btn-primary btn-sm">${icon('plus')} Assign</button></div></form>
      </div>
    </div>
    <div class="card" style="margin-top:18px"><div class="card-head"><h3>${icon('users')} Students</h3><span class="faint tiny">click a column to sort</span></div><div style="overflow-x:auto" data-table></div></div>`;
  hydrateIcons(body);
  if (innerWidth < 1080) body.querySelector('[data-two]').style.gridTemplateColumns = '1fr';
  body.querySelector('[data-assign]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const [item_type, item_id] = f.item.value.split(':');
    try {
      await api.addAssignment(o.classroom.code, { title: f.title.value, item_type, item_id, due: f.due.value || null });
      toast('Assignment created', 'success');
      reload();
    } catch (err) { toast(err.message, 'error'); }
  });

  const cols = [['name', 'Student'], ['xp', 'XP'], ['lessons_completed', 'Lessons'], ['avg_quiz', 'Avg quiz'], ['challenges_solved', 'Challenges'], ['experiments', 'Experiments'], ['questions_asked', 'AI questions'], ['weak_topics', 'Weak topics'], ['last_active', 'Last active']];
  const drawTable = () => {
    const rows = o.students.slice().sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (Array.isArray(va)) return dir * (va.length - vb.length);
      if (typeof va === 'string') return dir * va.localeCompare(vb);
      return dir * ((va ?? -1) - (vb ?? -1));
    });
    body.querySelector('[data-table]').innerHTML = `<table class="table"><thead><tr>${cols.map(([k, l]) => `<th class="sortable" data-k="${k}">${l}${sortKey === k ? (dir < 0 ? ' ↓' : ' ↑') : ''}</th>`).join('')}</tr></thead><tbody>
      ${rows.map((s) => `<tr><td><b>${esc(s.name)}</b> <span class="faint tiny">L${s.level}</span></td><td>${s.xp}</td><td>${s.lessons_completed}/${s.lessons_total}</td>
        <td><span class="chip ${s.avg_quiz == null ? 'gray' : s.avg_quiz >= 70 ? 'green' : 'red'}">${s.avg_quiz ?? '—'}${s.avg_quiz != null ? '%' : ''}</span></td>
        <td>${s.challenges_solved}</td><td>${s.experiments}</td><td>${s.questions_asked}</td>
        <td style="max-width:320px">${s.weak_topics.length ? s.weak_topics.slice(0, 3).map((k) => `<span class="chip red" style="margin:1px">${esc(weakLabel(k))}</span>`).join('') + (s.weak_topics.length > 3 ? ` <span class="faint tiny">+${s.weak_topics.length - 3}</span>` : '') : '<span class="faint">—</span>'}</td>
        <td class="faint small">${new Date(s.last_active).toLocaleDateString([], { month: 'short', day: 'numeric' })}</td></tr>`).join('')}</tbody></table>`;
    body.querySelectorAll('[data-k]').forEach((th) => th.addEventListener('click', () => {
      if (sortKey === th.dataset.k) dir = -dir; else { sortKey = th.dataset.k; dir = th.dataset.k === 'name' ? 1 : -1; }
      drawTable();
    }));
  };
  drawTable();
}

function cell(v) {
  return `<div class="hc" style="background:${heatColor(v)};${v == null ? 'color:var(--text-3)' : ''}" title="${v == null ? 'no data' : `${v}%`}">${v == null ? '·' : v}</div>`;
}

function kpi(label, value, ic, color) {
  return `<div class="card stat"><span class="accent" style="background:color-mix(in srgb, ${color} 16%, transparent);color:${color}">${icon(ic)}</span><div class="label">${label}</div><div class="value">${value}</div></div>`;
}
