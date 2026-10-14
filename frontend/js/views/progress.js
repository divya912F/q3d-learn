// Learner dashboard: XP & level, mastery radar, activity, learning path, recommendations.
import { api } from '../api.js';
import { store } from '../store.js';
import { radar, bars, ring } from '../charts.js';
import { esc, icon, hydrateIcons, toast } from '../ui.js';
import { openProfile, navigate, loadIntoBuilder } from '../main.js';

const TOPIC_LABELS = { superposition: 'Superposition', bloch: 'Bloch sphere', gates: 'Gates', phase: 'Phase', measurement: 'Measurement', entanglement: 'Entanglement', algorithms: 'Algorithms' };
const REC_STYLE = { lesson: ['book', 'var(--primary)'], challenge: ['trophy', 'var(--amber)'], builder: ['circuit', 'var(--violet)'], algorithm: ['flask', 'var(--green)'] };

export async function render(root) {
  if (!store.user) {
    root.innerHTML = `<div class="card empty" style="max-width:560px;margin:40px auto"><i data-icon="chart"></i>
      <h3 style="color:var(--text)">Track your quantum journey</h3><p>Create a free learner profile to record lessons, quiz scores, challenges and experiments — and get personalised recommendations.</p>
      <button class="btn btn-primary" data-profile>Create profile</button></div>`;
    hydrateIcons(root);
    root.querySelector('[data-profile]').addEventListener('click', () => openProfile());
    return;
  }
  const [p, lessons, circuits] = await Promise.all([api.progress(store.user.id), api.lessons(), api.circuits(store.user.id).catch(() => [])]);
  const done = new Set(p.lessons_completed);
  const nextLesson = lessons.find((l) => !done.has(l.id));

  root.innerHTML = `
    <div class="card" style="margin-bottom:18px">
      <div class="profile-head">
        ${ring(p.level_progress / 100, { label: `L${p.level}`, sub: `${p.level_progress}%` })}
        <div class="grow">
          <h2 style="margin:0">${esc(p.user.name)}</h2>
          <div class="muted small">${p.user.role === 'instructor' ? 'Instructor' : 'Quantum learner'}${p.user.classroom_code ? ` · classroom <b class="mono">${esc(p.user.classroom_code)}</b>` : ''}</div>
          <div class="row" style="margin-top:10px"><span class="chip amber">${icon('zap')} ${p.xp} XP</span><span class="chip">Level ${p.level}</span>${p.weak_topics.length ? `<span class="chip red">Focus: ${p.weak_topics.map((t) => TOPIC_LABELS[t]).join(', ')}</span>` : ''}</div>
        </div>
        <button class="btn btn-ghost btn-sm" data-edit>Edit profile</button>
      </div>
    </div>

    <div class="grid stats-row">
      ${stat('Lessons', `${p.lessons_completed.length}<small>/${p.lessons_total}</small>`, 'book', 'var(--primary)')}
      ${stat('Challenges', `${p.challenges_solved.length}<small>/${p.challenges_total}</small>`, 'trophy', 'var(--amber)')}
      ${stat('Experiments', p.experiments, 'flask', 'var(--green)')}
      ${stat('Questions asked', p.questions_asked, 'bot', 'var(--pink)')}
    </div>

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr));margin-top:18px">
      <div class="card"><div class="card-head"><h3>${icon('sparkle')} Recommended for you</h3></div><div class="stack" data-recs></div></div>
      <div class="card chart"><div class="card-head"><h3>${icon('target')} Topic mastery</h3><span class="faint tiny">quizzes + challenges</span></div><div data-radar></div></div>
      <div class="card"><div class="card-head"><h3>${icon('layers')} Learning path</h3></div><div class="path">${lessons.map((l) => {
        const st = done.has(l.id) ? 'done' : (nextLesson && l.id === nextLesson.id ? 'next' : '');
        return `<a class="path-item ${st}" href="#/learn/${l.id}" style="color:inherit;text-decoration:none"><span class="st">${st === 'done' ? '✓' : l.order}</span><span class="grow">${esc(l.title)}</span>${p.quiz_best[l.id] ? `<span class="chip ${p.quiz_best[l.id].percent >= 67 ? 'green' : 'red'}">${p.quiz_best[l.id].percent}%</span>` : ''}</a>`;
      }).join('')}</div></div>
    </div>

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(360px,1fr));margin-top:18px">
      <div class="card chart"><div class="card-head"><h3>${icon('chart')} Activity · last 14 days</h3></div><div data-activity></div></div>
      <div class="card"><div class="card-head"><h3>${icon('flask')} Experiment history</h3></div>${p.recent_experiments.length
        ? `<div style="overflow-x:auto"><table class="table"><thead><tr><th>When</th><th>Qubits</th><th>Gates</th><th>Depth</th><th>State</th></tr></thead><tbody>${p.recent_experiments.map((e) => `<tr><td class="faint">${new Date(e.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td><td>${e.num_qubits}</td><td>${e.gate_count}</td><td>${e.depth}</td><td class="mono small">${esc(e.state)}</td></tr>`).join('')}</tbody></table></div>`
        : '<div class="empty">No experiments yet — run a circuit in the builder.</div>'}</div>
      <div class="card"><div class="card-head"><h3>${icon('save')} Saved circuits</h3></div>${circuits.length
        ? `<div class="stack" style="gap:6px">${circuits.map((c) => `<div class="row-between" style="padding:8px 10px;border:1px solid var(--line);border-radius:10px"><span><b>${esc(c.title)}</b> <span class="faint small">${c.num_qubits}q · ${c.operations.length} ops</span></span><span class="row" style="gap:6px"><button class="btn btn-ghost btn-sm" data-open="${c.id}">Open</button><button class="icon-btn" data-del="${c.id}" title="Delete">${icon('trash')}</button></span></div>`).join('')}</div>`
        : '<div class="empty">Save circuits from the builder to find them here.</div>'}</div>
    </div>`;
  hydrateIcons(root);

  root.querySelector('[data-edit]').addEventListener('click', () => openProfile());
  radar(root.querySelector('[data-radar]'), Object.entries(TOPIC_LABELS).map(([k, label]) => ({ label, value: p.mastery[k] })));
  bars(root.querySelector('[data-activity]'), p.activity.map((d) => ({ label: d.date, value: d.count })), { fmtLabel: (l) => l.slice(5) });

  const recs = root.querySelector('[data-recs]');
  recs.innerHTML = p.recommendations.map((r, i) => {
    const [ic, col] = REC_STYLE[r.type] || REC_STYLE.lesson;
    return `<div class="rec" data-rec="${i}"><div class="ic" style="background:color-mix(in srgb, ${col} 18%, transparent);color:${col}">${icon(ic)}</div><div><b>${esc(r.title)}</b><small>${esc(r.reason)}</small></div></div>`;
  }).join('');
  recs.querySelectorAll('[data-rec]').forEach((el) => el.addEventListener('click', async () => {
    const r = p.recommendations[+el.dataset.rec];
    if (r.type === 'lesson') navigate(`/learn/${r.id}`);
    else if (r.type === 'challenge') navigate(`/challenges/${r.id}`);
    else if (r.type === 'algorithm') navigate(`/algorithms/${r.id}`);
    else { const a = await api.algorithm(r.id); loadIntoBuilder(a.num_qubits, a.operations, a.title); }
  }));
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

function stat(label, value, ic, color) {
  return `<div class="card stat"><span class="accent" style="background:color-mix(in srgb, ${color} 16%, transparent);color:${color}">${icon(ic)}</span><div class="label">${label}</div><div class="value">${value}</div></div>`;
}
