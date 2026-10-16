// Review: spaced-repetition flashcards built from every lesson (SM-2 scheduling, Anki-style buttons).
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, hydrateIcons, confetti, toast, markdown } from '../ui.js';
import { openProfile, navigate, refreshNavBadges } from '../main.js';

const BUTTONS = [['again', 'Again', '1'], ['hard', 'Hard', '2'], ['good', 'Good', '3'], ['easy', 'Easy', '4']];

export async function render(root, { params }) {
  const course = params[0] && store.courseMeta(params[0]) ? params[0] : null;
  const guest = !store.user;
  root.innerHTML = `
    <div class="review-head">
      <div><span class="hand" style="font-size:1.4rem;color:var(--pink)">little and often beats cramming</span>
        <h2 style="margin:0">Review cards</h2>
        <p class="muted small" style="margin:4px 0 0">Every lesson becomes flashcards. Cards you find easy come back later; tricky ones come back soon.</p></div>
      <div class="tabs" data-tabs>
        <button class="tab ${!course ? 'active' : ''}" data-c="">All courses</button>
        ${store.courses.map((c) => `<button class="tab ${course === c.id ? 'active' : ''}" data-c="${c.id}" style="--course:var(--c-${c.id})"><span class="swatch" style="background:var(--c-${c.id})"></span> ${esc(c.short)}</button>`).join('')}
      </div>
    </div>
    <div class="review-stats" data-stats></div>
    <div class="review-layout">
      <div data-stage></div>
      <aside class="card review-why">
        <h3>${icon('bulb')} Why this works</h3>
        <p class="small muted"><b>Retrieval practice</b> — trying to recall an answer — strengthens memory more than re-reading. <b>Spacing</b> reviews over days helps it last.</p>
        <p class="small muted">Be honest with the buttons: <b>Again</b> brings a card back in 10 minutes, <b>Good</b> roughly doubles the gap each time, <b>Easy</b> stretches it further.</p>
        <div class="kbd-help tiny faint"><span class="kbd">Space</span> show answer · <span class="kbd">1</span>–<span class="kbd">4</span> grade</div>
      </aside>
    </div>`;
  hydrateIcons(root);
  root.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.c ? `/review/${b.dataset.c}` : '/review')));

  const stage = root.querySelector('[data-stage]');
  let queue = [];
  let i = 0;
  let flipped = false;
  let reviewed = 0;

  function stats(st) {
    root.querySelector('[data-stats]').innerHTML = guest
      ? `<div class="card card-tight row-between" style="grid-column:1/-1"><span class="small">${icon('info')} <b>Practice mode.</b> Create a profile so the app remembers which cards you know and schedules reviews for you.</span><button class="btn btn-primary btn-sm" data-profile>Create profile</button></div>`
      : [['Due now', st.due, 'var(--pink)'], ['New', Math.min(st.unseen, 10), 'var(--primary)'], ['Learning', st.learning, 'var(--amber)'], ['Known', st.young + st.mature, 'var(--green)'], ['Reviewed today', st.reviewed_today, 'var(--violet)']]
        .map(([l, v, c]) => `<div class="card stat"><div class="label">${l}</div><div class="value" style="color:${c}">${v}</div></div>`).join('');
    root.querySelector('[data-profile]')?.addEventListener('click', () => openProfile());
    hydrateIcons(root.querySelector('[data-stats]'));
  }

  async function load() {
    stage.innerHTML = '<div class="card empty">Shuffling your cards…</div>';
    try {
      if (guest) {
        const d = await api.deck(course);
        queue = d.cards.sort(() => Math.random() - 0.5).slice(0, 12).map((c) => ({ ...c, state: 'practice' }));
        stats();
      } else {
        const d = await api.dueCards(store.user.id, course, 20);
        queue = d.cards;
        stats(d.stats);
      }
    } catch (e) { stage.innerHTML = `<div class="card empty">${esc(e.message)}</div>`; return; }
    i = 0;
    show();
  }

  function show() {
    flipped = false;
    if (i >= queue.length) return finished();
    const c = queue[i];
    const meta = store.courseMeta(c.course);
    stage.innerHTML = `
      <div class="review-progress"><span style="width:${(100 * i) / queue.length}%"></span></div>
      <div class="row-between tiny faint" style="margin:8px 2px"><span>Card ${i + 1} of ${queue.length}</span><span class="chip ${c.state === 'new' ? '' : c.state === 'review' ? 'green' : 'amber'}">${c.state === 'practice' ? 'practice' : c.state}</span></div>
      <div class="flashcard" data-card style="--course:var(--c-${c.course})" tabindex="0" aria-live="polite">
        <div class="fc-inner">
          <div class="fc-face fc-front">
            <div class="fc-tag"><span class="swatch" style="background:var(--c-${c.course})"></span>${esc(meta?.short || c.course)} · ${esc(c.lesson_title || 'Concept')}</div>
            <div class="fc-q">${esc(c.front)}</div>
            <div class="fc-hint hand">${c.kind === 'concept' ? 'say it out loud, then flip ↻' : 'think of your answer, then flip ↻'}</div>
          </div>
          <div class="fc-face fc-back">
            <div class="fc-tag"><span class="swatch" style="background:var(--c-${c.course})"></span>Answer</div>
            <div class="fc-a">${c.kind === 'concept' ? markdown(c.back) : `<b>${esc(c.back)}</b>`}</div>
            ${c.explain ? `<p class="fc-ex">${esc(c.explain)}</p>` : ''}
            ${c.lesson_id ? `<a class="tiny" href="#/c/${c.course}/learn/${c.lesson_id}">${icon('book')} Revisit the lesson</a>` : ''}
          </div>
        </div>
      </div>
      <div class="fc-actions" data-actions>
        <button class="btn btn-primary btn-lg" data-flip>${icon('eye')} Show answer <span class="kbd">Space</span></button>
      </div>`;
    hydrateIcons(stage);
    stage.querySelector('[data-flip]').addEventListener('click', flip);
    stage.querySelector('[data-card]').addEventListener('click', () => { if (!flipped) flip(); });
  }

  function flip() {
    if (flipped) return;
    flipped = true;
    const c = queue[i];
    stage.querySelector('[data-card]').classList.add('flipped');
    const acts = stage.querySelector('[data-actions]');
    acts.innerHTML = guest
      ? `<button class="grade again" data-g="again"><b>Not yet</b><small>see it again</small></button><button class="grade good" data-g="good"><b>Got it</b><small>next card</small></button>`
      : BUTTONS.map(([g, l, k]) => `<button class="grade ${g}" data-g="${g}"><b>${l}</b><small>${esc(c.preview?.[g] || '')} <span class="kbd">${k}</span></small></button>`).join('');
    acts.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => grade(b.dataset.g)));
  }

  async function grade(g) {
    const c = queue[i];
    if (guest) { if (g === 'again') queue.push(c); }
    else {
      try {
        await api.gradeCard(store.user.id, c.id, g);
        if (g === 'again') queue.push({ ...c, state: 'learning', preview: { again: '10 min', hard: '1 d', good: '1 d', easy: '3 d' } });
      } catch (e) { toast(esc(e.message), 'error'); return; }
    }
    reviewed++;
    i++;
    show();
    if (!guest) api.reviewStats(store.user.id, course).then(stats).catch(() => {});
  }

  async function finished() {
    confetti();
    let st = null;
    if (!guest) { try { st = await api.reviewStats(store.user.id, course); stats(st); refreshNavBadges(); } catch { /* ignore */ } }
    stage.innerHTML = `<div class="card review-done">
      <div style="font-size:3rem">🎉</div>
      <h2>Session complete!</h2>
      <p class="muted">${reviewed ? `You reviewed <b>${reviewed}</b> card${reviewed === 1 ? '' : 's'}.` : 'Nothing is due right now.'} ${st ? `${st.young + st.mature} of ${st.total} cards are now in your long-term deck.` : ''}</p>
      <div class="row" style="justify-content:center">
        <button class="btn btn-primary" data-more>${icon('cards')} Study more</button>
        <a class="btn btn-ghost" href="#/">${icon('home')} Back to my desk</a>
      </div>
      <p class="faint tiny" style="margin-top:14px">Come back tomorrow — the cards you just learned will be waiting.</p></div>`;
    hydrateIcons(stage);
    stage.querySelector('[data-more]').addEventListener('click', () => { reviewed = 0; load(); });
  }

  const keys = (e) => {
    if (e.target.closest('input, textarea, select') || document.getElementById('modal').hidden === false) return;
    if (e.key === ' ' || e.key === 'Enter') { if (!flipped && stage.querySelector('[data-card]')) { e.preventDefault(); flip(); } return; }
    if (!flipped) return;
    if (guest) { if (e.key === '1') grade('again'); if (e.key === '2' || e.key === '3') grade('good'); return; }
    const b = BUTTONS.find(([, , k]) => k === e.key);
    if (b) grade(b[0]);
  };
  document.addEventListener('keydown', keys);
  await load();
  return () => document.removeEventListener('keydown', keys);
}
