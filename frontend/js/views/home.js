// Study desk: course catalogue, continue-learning and the platform story.
import { store } from '../store.js';
import { esc, icon, hydrateIcons } from '../ui.js';
import { courseArt } from '../art.js';
import { navigate, openLab, refreshProgress } from '../main.js';
import { api } from '../api.js';
import { greeting, info as skyInfo } from '../sky.js';
import { openFocus } from '../study/focus.js';
import { openAmbience } from '../study/settings.js';

const JOURNEY = [
  ['😕', 'Confused', 'Abstract theory'], ['💡', 'Visualize', 'See it in 2D & 3D'], ['🔧', 'Build', 'Circuits, models, pipelines'],
  ['▶️', 'Simulate', 'Real computation'], ['🤖', 'Ask', 'AI study buddy'], ['🧪', 'Experiment', 'What-if & challenges'], ['🏆', 'Master', 'Concepts & skills'],
];

export async function render(root) {
  const courses = store.courses;
  const [p, review, focus] = store.user
    ? await Promise.all([refreshProgress(), api.reviewStats(store.user.id).catch(() => null), api.focus(store.user.id).catch(() => null)])
    : [null, null, null];
  const g = greeting(store.user ? store.user.name.split(' ')[0] : '');
  const hello = `${esc(g.hello.toLowerCase())} ✏️`;
  const sky = skyInfo();
  root.innerHTML = `
  <section class="hero">
    <div>
      <span class="greeting">${hello}</span>
      <h1>Learn the future of tech by <span class="scribble">seeing it<svg viewBox="0 0 200 18" preserveAspectRatio="none"><path d="M3 12 C 40 3, 80 16, 120 8 S 180 6, 197 10" fill="none" stroke="#fcc419" stroke-width="5" stroke-linecap="round"/></svg></span>.</h1>
      ${g.line ? `<p class="weather-line">${sky.icon} ${esc(g.line)}</p>` : `<button class="weather-line link" data-sky>${sky.icon} ${esc(g.phase)} sky · <u>match the sky to your local weather</u></button>`}
      <p class="sub">Four visual courses — <b>Quantum Computing</b>, <b>Machine Learning</b>, <b>Data Science</b> and <b>AI</b> — each with lessons, interactive labs, real simulations, challenges and an AI study buddy.</p>
      <div class="row">
        <a class="btn btn-primary btn-lg" href="#/c/${p ? (Object.entries(p.courses).find(([, c]) => c.started)?.[0] || 'ml') : 'ml'}">${icon('book')} ${p && p.lessons_completed_total ? 'Continue studying' : 'Start learning'}</a>
        <a class="btn btn-ghost btn-lg" href="#/tutor">${icon('bot')} Ask Q-Bot</a>
      </div>
      ${p ? `<div class="row" style="margin-top:20px;gap:22px">
        <span class="muted small"><b style="color:var(--text);font-size:1.1rem">${p.xp}</b> XP · level ${p.level}</span>
        <span class="muted small"><b style="color:var(--text);font-size:1.1rem">${p.streak}</b> day streak 🔥</span>
        <span class="muted small"><b style="color:var(--text);font-size:1.1rem">${p.lessons_completed_total}</b> lessons done</span></div>` : ''}
    </div>
    <div class="desk" aria-hidden="true">
      <div class="note" style="left:4%;top:6%;width:44%;background:#fff3bf;transform:rotate(-4deg)"><small>Quantum</small>|ψ⟩ = α|0⟩ + β|1⟩<br><span style="font-size:1rem">rotate me on the Bloch sphere!</span></div>
      <div class="note" style="right:2%;top:2%;width:46%;background:#ffe8cc;transform:rotate(3deg)"><small>Machine Learning</small>w ← w − η·∂L/∂w<br><span style="font-size:1rem">roll downhill on the loss</span></div>
      <div class="note" style="left:10%;bottom:6%;width:42%;background:#d3f9d8;transform:rotate(2.5deg)"><small>Data Science</small>median &lt; mean?<br><span style="font-size:1rem">→ right-skewed!</span></div>
      <div class="note" style="right:6%;bottom:10%;width:44%;background:#e5dbff;transform:rotate(-2deg)"><small>AI</small>f(n) = g(n) + h(n)<br><span style="font-size:1rem">A* finds the way</span></div>
    </div>
  </section>

  <div class="today-strip">
    <a class="card today" href="#/review" style="--t:var(--pink)"><span class="ti">${icon('cards')}</span><div><b>${review ? `${review.due + Math.min(10, review.unseen)} cards to review` : 'Review cards'}</b><small>${review ? `${review.due} due · ${Math.min(10, review.unseen)} new · ${review.reviewed_today} done today` : 'Flashcards from every lesson, spaced for memory'}</small></div></a>
    <button class="card today" data-focus style="--t:var(--amber)"><span class="ti">${icon('clock')}</span><div><b>${focus ? `${focus.today_minutes} min focused today` : 'Start a focus block'}</b><small>${focus ? `${focus.week_minutes} min this week · press F` : '25 minutes of deep study, then a break'}</small></div></button>
    <a class="card today" href="#/glossary" style="--t:var(--green)"><span class="ti">${icon('abc')}</span><div><b>Glossary</b><small>Every key term across the four courses</small></div></a>
    <a class="card today" href="${p ? '#/progress' : '#/notes'}" style="--t:var(--violet)"><span class="ti">${icon(p ? 'award' : 'notebook')}</span><div><b>${p ? 'Earn certificates' : 'My notebook'}</b><small>${p ? 'Finish a course to unlock a printable certificate' : 'Notes you write beside lessons'}</small></div></a>
  </div>

  <div class="section-title"><h2>Your courses</h2><span class="hand">pick a notebook →</span></div>
  <div class="course-grid">${courses.map((c) => {
    const cp = p?.courses?.[c.id];
    return `<a class="card course-card" href="#/c/${c.id}" style="--cc:var(--c-${c.id})">
      <div class="cover"><span class="label">${esc(c.title)}</span>${courseArt(c.id)}</div>
      <div class="body"><p>${esc(c.tagline)}</p>
        <div class="meta"><span>${icon('book')} ${c.lessons} lessons</span><span>${icon('flask')} ${c.labs.length} labs</span><span>${icon('trophy')} ${c.challenges} challenges</span></div>
        <div class="progress" style="margin-top:auto"><span style="width:${cp?.progress_pct || 0}%"></span></div>
        <div class="row-between tiny faint"><span>${cp ? `${cp.lessons_completed.length}/${cp.lessons_total} lessons · ${cp.challenges_solved.length} challenges` : `${c.level} · ~${c.minutes} min`}</span><span>${cp?.progress_pct || 0}%</span></div>
      </div></a>`;
  }).join('')}</div>

  ${p?.recommendations?.length ? `<div class="section-title"><h2>Pick up where you left off</h2></div>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))" data-recs>${p.recommendations.map((r, i) => `<div class="rec" data-rec="${i}" style="--course:var(--c-${r.course})"><div class="ic" style="background:color-mix(in srgb, var(--course) 15%, transparent);color:var(--course)"><i data-icon="${{ lesson: 'book', challenge: 'trophy', lab: 'flask', course: 'notebook' }[r.type] || 'book'}"></i></div><div><b>${esc(r.title)}</b><small>${esc(r.reason)}</small></div></div>`).join('')}</div>` : ''}

  <div class="section-title"><h2>Every course has the same study toolkit</h2></div>
  <div class="grid features">
    ${[['book', 'Learn', 'Short lessons with formulas, insights and quizzes.', 'var(--c-quantum)'],
      ['eye', 'Visualise', '3D Bloch spheres, decision boundaries, loss landscapes, search animations.', 'var(--c-ml)'],
      ['zap', 'Simulate', 'Real computation in Python: Qiskit/NumPy simulators, ML training, statistics.', 'var(--c-ds)'],
      ['bot', 'Ask AI', 'Q-Bot answers in text or voice, grounded on your actual results.', 'var(--c-ai)'],
      ['trophy', 'Challenge', 'Auto-graded puzzles, XP, streaks and a progress dashboard.', 'var(--pink)']].map(([ic, t, d, c]) => `
      <div class="card feature"><div class="ic" style="background:color-mix(in srgb, ${c} 15%, transparent);color:${c}"><i data-icon="${ic}"></i></div><h3>${t}</h3><p>${d}</p></div>`).join('')}
  </div>

  <div class="section-title"><h2>The learning journey</h2><span class="hand">from abstract theory to an interactive lab</span></div>
  <div class="card"><div class="journey">${JOURNEY.map(([e, t, s]) => `<div class="journey-step"><div class="dot">${e}</div><b>${t}</b><span>${s}</span></div>`).join('')}</div></div>

  <div class="section-title"><h2>Try a lab right now</h2></div>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
    ${[['quantum', 'bloch', 'Spin a qubit in 3D'], ['ml', 'classifier', 'Watch a neural net learn'], ['ds', 'pipeline', 'Clean a messy dataset'], ['ai', 'search', 'Race BFS vs A*']].map(([c, l, t]) => {
      const lab = courses.find((x) => x.id === c)?.labs.find((x) => x.id === l);
      return lab ? `<a class="card lab-card" style="--course:var(--c-${c})" href="#/c/${c}/lab/${l}"><div class="ic"><i data-icon="${lab.icon}"></i></div><div><b>${t}</b><p>${esc(lab.title)}</p></div></a>` : '';
    }).join('')}
  </div>

  <div class="section-title"><h2>About this project</h2></div>
  <div class="ps-strip">
    <div class="card"><div class="ic" style="background:var(--hl-blue);color:var(--primary)"><i data-icon="target"></i></div><div><small>Problem statement SIH26140</small><b>AI-Based Interactive Algorithm Learning Platform</b></div></div>
    <div class="card"><div class="ic" style="background:var(--hl-green);color:var(--green)"><i data-icon="cap"></i></div><div><small>Theme</small><b>Smart Education</b></div></div>
    <div class="card"><div class="ic" style="background:var(--hl-pink);color:var(--pink)"><i data-icon="users"></i></div><div><small>Team</small><b>SRIJAN</b></div></div>
  </div>
  <p class="quote">“From abstract theory to an interactive lab.”</p>
  <p class="center"><a href="#/about" class="btn btn-ghost">Read about the project ${icon('arrowRight')}</a></p>`;
  hydrateIcons(root);
  root.querySelector('[data-focus]').addEventListener('click', (e) => openFocus(e.currentTarget));
  root.querySelector('[data-sky]')?.addEventListener('click', () => openAmbience(document.getElementById('sky-chip')));
  root.querySelectorAll('[data-rec]').forEach((el) => el.addEventListener('click', () => {
    const r = p.recommendations[+el.dataset.rec];
    if (r.type === 'lesson') navigate(`/c/${r.course}/learn/${r.id}`);
    else if (r.type === 'challenge') navigate(`/c/${r.course}/challenges/${r.id}`);
    else if (r.type === 'lab') openLab(r.course, r.id);
    else navigate(`/c/${r.course}`);
  }));
}
