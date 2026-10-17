// Memory Radar — a traffic-light map of what you remember (green=mastered, yellow=practice,
// red=likely to be forgotten, grey=not studied), plus exactly what to revise today.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, hydrateIcons } from '../ui.js';
import { navigate } from '../main.js';

const COLORS = { mastered: 'var(--green)', practice: 'var(--amber)', forgetting: 'var(--pink)', new: 'var(--text-3)' };
const LABELS = { mastered: 'Mastered', practice: 'Practising', forgetting: 'Forgetting', new: 'Not started' };

export async function render(root) {
  if (!store.user) {
    root.innerHTML = `<div class="card empty" style="margin-top:40px"><i data-icon="radar"></i>
      <div><b>Memory Radar needs a profile.</b><p class="muted">Create one to track what you remember and get a daily revision plan.</p>
      <button class="btn btn-primary" data-prof>Create profile</button></div></div>`;
    hydrateIcons(root);
    root.querySelector('[data-prof]').addEventListener('click', () => import('../main.js').then((m) => m.openProfile()));
    return;
  }

  root.innerHTML = `<div class="card empty" style="margin-top:30px"><div class="spinner"></div><div class="muted">Scanning your memory…</div></div>`;
  let mem;
  try { mem = await api.memoryMap(store.user.id); } catch (e) { root.innerHTML = `<div class="card empty"><i data-icon="alert"></i><div>${esc(e.message)}</div></div>`; hydrateIcons(root); return; }

  const t = mem.totals;
  const studied = t.mastered + t.practice + t.forgetting;
  root.innerHTML = `
    <div class="row-between" style="margin-bottom:12px;flex-wrap:wrap;gap:10px">
      <div><span class="hand" style="font-size:1.3rem;color:var(--pink)">what will you remember?</span>
        <h2 style="margin:0">${icon('radar')} Memory Radar</h2>
        <p class="muted" style="margin:4px 0 0">Every concept, coloured by how well it's holding in memory. We schedule revision from your quiz & flashcard performance.</p></div>
    </div>

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:8px">
      ${stat('mastered', t.mastered)}${stat('practice', t.practice)}${stat('forgetting', t.forgetting)}${stat('new', t.new)}
    </div>

    ${t.due ? `<div class="card revise-card" style="margin:12px 0">
      <div class="row-between" style="flex-wrap:wrap;gap:10px"><div><h3 style="margin:0">${icon('alert')} Revise today — ${t.due} concept${t.due > 1 ? 's' : ''} fading</h3>
        <p class="muted small" style="margin:4px 0 0">These are due now. A few minutes brings them back to green.</p></div>
        <button class="btn btn-primary btn-lg" data-revise>${icon('cards')} Start revision</button></div>
      <div class="revise-chips">${mem.revise_today.slice(0, 18).map((c) => `<span class="chip red" title="${esc(c.course)}">${esc(trim(c.front))}</span>`).join('')}${t.due > 18 ? `<span class="chip gray">+${t.due - 18} more</span>` : ''}</div>
    </div>` : studied ? `<div class="callout insight" style="margin:12px 0"><i data-icon="checkCircle"></i><div>Nothing due right now — your memory is fresh. Come back tomorrow, or study new cards.</div></div>`
      : `<div class="callout insight" style="margin:12px 0"><i data-icon="bulb"></i><div>You haven't reviewed anything yet. Finish a lesson quiz or open <a href="#/review">Review cards</a> to start building your radar.</div></div>`}

    <div class="section-title"><h2>By course</h2><span class="hand">tap a topic to study it</span></div>
    <div class="radar-grid">
      ${mem.courses.map((c) => courseBlock(c)).join('')}
    </div>

    <div class="radar-legend">${Object.keys(LABELS).map((k) => `<span><i style="background:${COLORS[k]}"></i>${LABELS[k]}</span>`).join('')}</div>`;
  hydrateIcons(root);

  root.querySelector('[data-revise]')?.addEventListener('click', () => navigate('/review'));
  root.querySelectorAll('[data-topic]').forEach((el) => el.addEventListener('click', () => {
    const [course, lessonHint] = [el.dataset.course, el.dataset.lesson];
    navigate(lessonHint ? `/c/${course}/learn/${lessonHint}` : `/c/${course}/learn`);
  }));
}

function trim(s) { return s.length > 32 ? `${s.slice(0, 30)}…` : s; }

function stat(k, n) {
  return `<div class="card stat"><span class="accent" style="background:color-mix(in srgb, ${COLORS[k]} 18%, transparent);color:${COLORS[k]}">${icon(k === 'forgetting' ? 'alert' : k === 'mastered' ? 'checkCircle' : k === 'practice' ? 'clock' : 'book')}</span><div class="label">${LABELS[k]}</div><div class="value">${n}</div></div>`;
}

function courseBlock(c) {
  const ring = c.total ? `conic-gradient(var(--green) 0 ${c.counts.mastered / c.total * 360}deg, var(--amber) 0 ${(c.counts.mastered + c.counts.practice) / c.total * 360}deg, var(--pink) 0 ${(c.counts.mastered + c.counts.practice + c.counts.forgetting) / c.total * 360}deg, var(--surface-2) 0)` : 'var(--surface-2)';
  return `<div class="card radar-course" style="--cc:var(--c-${c.course})">
    <div class="row" style="gap:12px;align-items:center;margin-bottom:10px">
      <div class="radar-ring" style="background:${ring}"><span>${c.score}%</span></div>
      <div><b>${esc(c.title)}</b><div class="faint tiny">${c.counts.mastered} mastered · ${c.counts.forgetting} fading · ${c.counts.new} new</div></div>
    </div>
    <div class="radar-topics">
      ${c.topics.map((tp) => `<button class="radar-cell" data-topic data-course="${c.course}" title="${esc(tp.label)} — ${tp.seen}/${tp.total} studied (${tp.score}%)" style="--s:${COLORS[tp.status]}"><span class="rc-dot"></span>${esc(tp.label)}</button>`).join('')}
    </div></div>`;
}
