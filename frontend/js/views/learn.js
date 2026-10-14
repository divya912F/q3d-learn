// Lessons for any course: path list, notebook-style reader with formulas, "try it" links and graded quizzes.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, renderTex, toast, confetti, hydrateIcons } from '../ui.js';
import { navigate, openDrawer, loadIntoBuilder, loadIntoLab, openLab, refreshProgress } from '../main.js';

export async function render(root, { params, course }) {
  const lessons = await api.lessons(course);
  let done = new Set();
  let best = {};
  if (store.user) {
    try {
      const p = await refreshProgress();
      done = new Set(p.courses[course].lessons_completed);
      best = p.courses[course].quiz_best;
    } catch { /* guest */ }
  }
  const current = params[0] || lessons.find((l) => !done.has(l.id))?.id || lessons[0].id;
  const meta = store.courseMeta(course);

  root.innerHTML = `<div class="learn-layout">
    <div class="lesson-list" data-list></div>
    <article class="card lesson-body paper-lines" data-lesson></article>
  </div>`;

  const list = root.querySelector('[data-list]');
  const pct = Math.round((100 * done.size) / lessons.length);
  list.innerHTML = `<div class="card card-tight" style="margin-bottom:4px"><div class="row-between small"><b>${esc(meta.title)}</b><span class="muted">${done.size}/${lessons.length} done</span></div>
      <div class="progress" style="margin-top:8px"><span style="width:${pct}%"></span></div></div>`
    + lessons.map((l) => `<button class="lesson-item${l.id === current ? ' active' : ''}${done.has(l.id) ? ' done' : ''}" data-id="${l.id}">
      <span class="lesson-num">${done.has(l.id) ? '✓' : l.order}</span>
      <span class="grow"><b>${esc(l.title)}</b><small>${esc(l.topic_label)} · ${l.level} · ${l.minutes} min${best[l.id] ? ` · quiz ${best[l.id].percent}%` : ''}</small></span></button>`).join('');
  list.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => navigate(`/c/${course}/learn/${b.dataset.id}`)));

  const lesson = await api.lesson(course, current);
  store.context.lesson_id = lesson.id;
  const art = root.querySelector('[data-lesson]');
  art.innerHTML = `
    <div class="row" style="gap:8px;margin-bottom:10px"><span class="chip">${esc(lesson.topic_label)}</span><span class="chip gray">${lesson.level}</span><span class="chip gray">${icon('clock')} ${lesson.minutes} min</span>${done.has(lesson.id) ? '<span class="chip green">✓ completed</span>' : ''}</div>
    <h2>${lesson.order}. ${esc(lesson.title)}</h2>
    <p class="lead">${esc(lesson.summary)}</p>
    <div data-blocks></div>
    <hr>
    <div class="row-between"><h3 style="margin:0">${icon('pencil')} Check your understanding</h3><button class="btn btn-ghost btn-sm" data-ask>${icon('bot')} Ask Q-Bot about this lesson</button></div>
    <p class="muted small">Score at least 2/3 to complete the lesson.</p>
    <div data-quiz></div>
    <div class="row-between" style="margin-top:14px">
      <button class="btn btn-course" data-submit>Submit answers</button>
      <div class="row">${prevNext(lessons, lesson, course)}</div>
    </div>`;
  hydrateIcons(art);

  const blocks = art.querySelector('[data-blocks]');
  lesson.blocks.forEach((b) => {
    if (b.type === 'text') blocks.insertAdjacentHTML('beforeend', `<div>${b.html}</div>`);
    if (b.type === 'formula') {
      const f = document.createElement('div');
      f.className = 'formula';
      blocks.appendChild(f);
      const tryRender = (n = 0) => (window.katex || n > 10 ? renderTex(f, b.tex) : setTimeout(() => tryRender(n + 1), 150));
      tryRender();
    }
    if (b.type === 'callout') {
      const ic = { tip: 'bulb', insight: 'sparkle', warning: 'alert' }[b.kind] || 'info';
      blocks.insertAdjacentHTML('beforeend', `<div class="callout ${b.kind}"><i data-icon="${ic}"></i><div>${b.html}</div></div>`);
    }
    if (b.type === 'try') {
      let where;
      if (b.lab) where = meta.labs.find((l) => l.id === b.lab)?.title || 'lab';
      else where = b.target === 'lab' ? '3D Bloch Lab' : 'Circuit Builder';
      const node = document.createElement('div');
      node.className = 'try-box';
      node.innerHTML = `<div><div class="faint">try it yourself →</div><b>${esc(b.label)}</b></div><button class="btn btn-course btn-sm">${icon('flask')} Open ${esc(where)}</button>`;
      node.querySelector('button').addEventListener('click', async () => {
        if (b.lab) openLab(course, b.lab, b.preset || {});
        else if (b.algorithm) { const a = await api.algorithm(b.algorithm); loadIntoBuilder(a.num_qubits, a.operations, a.title); }
        else if (b.target === 'lab') loadIntoLab(b.operations);
        else loadIntoBuilder(b.num_qubits, b.operations, b.label);
      });
      blocks.appendChild(node);
    }
  });
  hydrateIcons(blocks);

  const answers = new Array(lesson.quiz.length).fill(null);
  const quiz = art.querySelector('[data-quiz]');
  quiz.innerHTML = lesson.quiz.map((q, i) => `<div class="quiz-q" data-q="${i}"><h4>${i + 1}. ${esc(q.q)}</h4>
    <div class="quiz-opts">${q.options.map((o, j) => `<button class="quiz-opt" data-o="${j}">${esc(o)}</button>`).join('')}</div><div class="quiz-explain" hidden></div></div>`).join('');
  quiz.querySelectorAll('.quiz-q').forEach((qEl) => {
    const qi = +qEl.dataset.q;
    qEl.querySelectorAll('.quiz-opt').forEach((o) => o.addEventListener('click', () => {
      if (qEl.dataset.locked) return;
      answers[qi] = +o.dataset.o;
      qEl.querySelectorAll('.quiz-opt').forEach((x) => x.classList.toggle('selected', x === o));
    }));
  });
  const submit = art.querySelector('[data-submit]');
  submit.addEventListener('click', async () => {
    if (submit.dataset.done) { navigate(`/c/${course}/learn/${lesson.id}`); return; }
    if (answers.some((a) => a === null)) { toast('Answer every question first.', 'info'); return; }
    try {
      const res = await api.submitQuiz(course, lesson.id, answers, store.user?.id);
      res.results.forEach((r, i) => {
        const qEl = quiz.querySelector(`[data-q="${i}"]`);
        qEl.dataset.locked = '1';
        qEl.querySelectorAll('.quiz-opt').forEach((o) => {
          const j = +o.dataset.o;
          o.classList.remove('selected');
          if (j === r.answer) o.classList.add('correct');
          else if (j === answers[i]) o.classList.add('wrong');
        });
        const ex = qEl.querySelector('.quiz-explain');
        ex.hidden = false;
        ex.innerHTML = `${r.correct ? '✅' : '❌'} ${esc(r.explain)}`;
      });
      submit.textContent = 'Try again';
      submit.dataset.done = '1';
      if (res.percent >= 67) {
        confetti();
        toast(`Great work — ${res.score}/${res.total}! ${store.user ? 'Lesson completed.' : 'Create a profile to save progress.'}`, 'success', 4500);
        list.querySelector(`[data-id="${lesson.id}"]`)?.classList.add('done');
        refreshProgress();
      } else toast(`${res.score}/${res.total}. Review the explanations and try again — or ask Q-Bot!`, 'info', 4500);
    } catch (err) { toast(err.message, 'error'); }
  });
  art.querySelector('[data-ask]').addEventListener('click', () => openDrawer(`Can you explain the key idea of the lesson "${lesson.title}" in simple terms, with an example?`));
}

function prevNext(lessons, lesson, course) {
  const i = lessons.findIndex((l) => l.id === lesson.id);
  const prev = lessons[i - 1], next = lessons[i + 1];
  return `${prev ? `<a class="btn btn-ghost btn-sm" href="#/c/${course}/learn/${prev.id}">← ${esc(prev.title)}</a>` : ''}${next ? `<a class="btn btn-ghost btn-sm" href="#/c/${course}/learn/${next.id}">${esc(next.title)} →</a>` : ''}`;
}
