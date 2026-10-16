// Learner dashboard across all courses: XP, streak, per-course progress, mastery radar, path, recommendations.
import { api } from '../api.js';
import { store } from '../store.js';
import { radar, bars, ring } from '../charts.js';
import { esc, icon, hydrateIcons, toast } from '../ui.js';
import { openProfile, navigate, loadIntoBuilder, openLab } from '../main.js';

const REC_STYLE = { lesson: 'book', challenge: 'trophy', lab: 'flask', course: 'notebook' };

export async function render(root) {
  if (!store.user) {
    root.innerHTML = `<div class="card empty" style="max-width:560px;margin:40px auto"><i data-icon="chart"></i>
      <h3 style="color:var(--text)">Track your study journey</h3><p>Create a free learner profile to record lessons, quiz scores, challenges and experiments in all four courses — and get personalised recommendations.</p>
      <button class="btn btn-primary" data-profile>Create profile</button></div>`;
    hydrateIcons(root);
    root.querySelector('[data-profile]').addEventListener('click', () => openProfile());
    return;
  }
  let course = store.course || 'quantum';
  const [p, circuits] = await Promise.all([api.progress(store.user.id), api.circuits(store.user.id).catch(() => [])]);
  root.innerHTML = `
    <div class="card" style="margin-bottom:18px"><div class="profile-head">
      ${ring(p.level_progress / 100, { label: `L${p.level}`, sub: `${p.level_progress}%`, color: 'var(--primary)' })}
      <div class="grow"><span class="hand" style="font-size:1.3rem;color:var(--pink)">study report card</span>
        <h2 style="margin:0">${esc(p.user.name)}</h2>
        <div class="muted small">${p.user.role === 'instructor' ? 'Instructor' : 'Learner'}${p.user.classroom_code ? ` · classroom <b class="mono">${esc(p.user.classroom_code)}</b>` : ''}</div>
        <div class="row" style="margin-top:10px"><span class="chip amber">${icon('zap')} ${p.xp} XP</span><span class="chip">Level ${p.level}</span><span class="chip pink">🔥 ${p.streak}-day streak</span><span class="chip green">${p.lessons_completed_total} lessons · ${p.challenges_solved_total} challenges</span><span class="chip violet">⏳ ${p.focus_minutes} focus min</span><span class="chip gray">🃏 ${p.reviews_total} card reviews</span></div>
      </div>
      <button class="btn btn-ghost btn-sm" data-edit>Edit profile</button></div></div>
    <div class="course-progress" data-cps></div>
    <div data-detail style="margin-top:18px"></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(360px,1fr));margin-top:18px">
      <div class="card chart"><div class="card-head"><h3>${icon('chart')} Activity · last 14 days</h3></div><div data-activity></div></div>
      <div class="card"><div class="card-head"><h3>${icon('flask')} Recent experiments</h3></div>${p.recent_experiments.length
        ? `<div style="overflow-x:auto"><table class="table"><thead><tr><th>When</th><th>Course</th><th>Lab</th><th>Result</th></tr></thead><tbody>${p.recent_experiments.map((e) => `<tr><td class="faint" style="white-space:nowrap">${new Date(e.date).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td><td><span class="chip" style="background:color-mix(in srgb, var(--c-${e.course}) 15%, transparent);color:var(--c-${e.course})">${esc(store.courseMeta(e.course)?.short || e.course)}</span></td><td>${esc(e.lab)}</td><td class="mono small">${esc(e.state || (e.num_qubits ? `${e.num_qubits}q · ${e.gate_count} gates` : ''))}</td></tr>`).join('')}</tbody></table></div>`
        : '<div class="empty">No experiments yet — open any lab and run it.</div>'}</div>
      <div class="card"><div class="card-head"><h3>${icon('save')} Saved quantum circuits</h3></div>${circuits.length
        ? `<div class="stack" style="gap:6px">${circuits.map((c) => `<div class="row-between" style="padding:8px 10px;border:1px solid var(--line);border-radius:10px"><span><b>${esc(c.title)}</b> <span class="faint small">${c.num_qubits}q · ${c.operations.length} ops</span></span><span class="row" style="gap:6px"><button class="btn btn-ghost btn-sm" data-open="${c.id}">Open</button><button class="icon-btn" data-del="${c.id}" title="Delete">${icon('trash')}</button></span></div>`).join('')}</div>`
        : '<div class="empty">Save circuits from the Circuit Builder to find them here.</div>'}</div>
    </div>`;
  hydrateIcons(root);
  root.querySelector('[data-edit]').addEventListener('click', () => openProfile());
  bars(root.querySelector('[data-activity]'), p.activity.map((d) => ({ label: d.date, value: d.count })), { fmtLabel: (l) => l.slice(5), color: 'var(--primary)' });

  function cards() {
    root.querySelector('[data-cps]').innerHTML = store.courses.map((c) => {
      const cp = p.courses[c.id];
      return `<div class="card cp" data-c="${c.id}" style="--cc:var(--c-${c.id});${c.id === course ? 'box-shadow:var(--shadow-lift);outline:2px solid var(--cc)' : ''}">
        <div class="row-between"><b>${esc(c.title)}</b><span class="mono small">${cp.progress_pct}%</span></div>
        <div class="progress" style="margin:8px 0"><span style="width:${cp.progress_pct}%"></span></div>
        <div class="faint tiny">${cp.lessons_completed.length}/${cp.lessons_total} lessons · ${cp.challenges_solved.length}/${cp.challenges_total} challenges · ${cp.xp} XP</div></div>`;
    }).join('');
    root.querySelectorAll('[data-c]').forEach((el) => el.addEventListener('click', () => { course = el.dataset.c; document.documentElement.style.setProperty('--course', `var(--c-${course})`); cards(); detail(); }));
  }

  async function detail() {
    const meta = store.courseMeta(course);
    const cp = p.courses[course];
    const [lessons, recs] = await Promise.all([api.lessons(course), api.progress(store.user.id, course).then((x) => x.recommendations)]);
    const done = new Set(cp.lessons_completed);
    const next = lessons.find((l) => !done.has(l.id));
    const box = root.querySelector('[data-detail]');
    box.innerHTML = `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
      <div class="card"><div class="card-head"><h3>${icon('sparkle')} Next steps in ${esc(meta.short)}</h3><a class="btn btn-ghost btn-sm" href="#/certificate/${course}">${icon('award')} Certificate</a></div><div class="stack" style="gap:8px" data-recs></div></div>
      <div class="card chart"><div class="card-head"><h3>${icon('target')} Topic mastery</h3><span class="faint tiny">quizzes + challenges</span></div><div data-radar></div>
        ${cp.weak_topics.length ? `<p class="small" style="margin:6px 0 0"><span class="hl-pink">Focus on: ${cp.weak_topics.map((t) => esc(meta.topics[t])).join(', ')}</span></p>` : ''}</div>
      <div class="card paper-lines" style="padding-left:62px"><div class="card-head"><h3>${icon('layers')} Learning path</h3></div><div class="path">${lessons.map((l) => {
        const st = done.has(l.id) ? 'done' : next && l.id === next.id ? 'next' : '';
        const q = cp.quiz_best[l.id];
        return `<a class="path-item ${st}" href="#/c/${course}/learn/${l.id}" style="color:inherit;text-decoration:none"><span class="st">${st === 'done' ? '✓' : l.order}</span><span class="grow">${esc(l.title)}</span>${q ? `<span class="chip ${q.percent >= 67 ? 'green' : 'red'}">${q.percent}%</span>` : ''}</a>`;
      }).join('')}</div></div></div>`;
    hydrateIcons(box);
    radar(box.querySelector('[data-radar]'), Object.entries(meta.topics).map(([k, label]) => ({ label, value: cp.mastery[k] })));
    const recBox = box.querySelector('[data-recs]');
    recBox.innerHTML = recs.map((r, i) => `<div class="rec" data-rec="${i}"><div class="ic" style="background:color-mix(in srgb, var(--course) 15%, transparent);color:var(--course)">${icon(REC_STYLE[r.type] || 'book')}</div><div><b>${esc(r.title)}</b><small>${esc(r.reason)}</small></div></div>`).join('') || '<div class="empty small">All done here — amazing! 🎉</div>';
    recBox.querySelectorAll('[data-rec]').forEach((el) => el.addEventListener('click', () => {
      const r = recs[+el.dataset.rec];
      if (r.type === 'lesson') navigate(`/c/${r.course}/learn/${r.id}`);
      else if (r.type === 'challenge') navigate(`/c/${r.course}/challenges/${r.id}`);
      else if (r.type === 'lab') openLab(r.course, r.id);
      else navigate(`/c/${r.course}`);
    }));
  }

  cards();
  document.documentElement.style.setProperty('--course', `var(--c-${course})`);
  await detail();
  root.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => {
    const c = circuits.find((x) => String(x.id) === b.dataset.open);
    loadIntoBuilder(c.num_qubits, c.operations, c.title);
  }));
  root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Delete this saved circuit?')) return;
    await api.deleteCircuit(b.dataset.del, store.user.id);
    toast('Deleted');
    render(root);
  }));
}
