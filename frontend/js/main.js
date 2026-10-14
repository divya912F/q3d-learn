// App shell: routing, sidebar, profile, AI drawer, backend status.
import { api } from './api.js';
import { store } from './store.js';
import { $, $$, esc, hydrateIcons, initials, toast, icon } from './ui.js';
import { Chat } from './components/chat.js';

const ROUTES = {
  home: { title: 'Home', load: () => import('./views/home.js') },
  learn: { title: 'Lessons', load: () => import('./views/learn.js') },
  lab: { title: '3D Lab — Bloch Sphere', load: () => import('./views/lab.js') },
  builder: { title: 'Circuit Builder', load: () => import('./views/builder.js') },
  algorithms: { title: 'Algorithm Library', load: () => import('./views/algorithms.js') },
  challenges: { title: 'Challenges', load: () => import('./views/challenges.js') },
  tutor: { title: 'AI Tutor', load: () => import('./views/tutor.js') },
  progress: { title: 'My Progress', load: () => import('./views/progress.js') },
  instructor: { title: 'Instructor Dashboard', load: () => import('./views/instructor.js') },
  about: { title: 'About the Project', load: () => import('./views/about.js') },
};

let cleanup = null;
let drawerChat = null;
let navToken = 0;

export function navigate(path) {
  if (location.hash === `#${path}`) route();
  else location.hash = path;
}

export function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [pathPart, query = ''] = raw.split('?');
  const parts = pathPart.split('/').filter(Boolean);
  return { name: parts[0] || 'home', params: parts.slice(1), query: new URLSearchParams(query) };
}

async function route() {
  const token = ++navToken;
  const { name, params, query } = parseHash();
  const r = ROUTES[name] || ROUTES.home;
  const key = ROUTES[name] ? name : 'home';
  $$('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === key));
  $('#page-title').textContent = r.title;
  document.title = `${r.title} · Q-3D Learn`;
  $('#sidebar').classList.remove('open');
  if (key !== 'challenges') store.context.challenge_id = null;
  if (key !== 'learn') store.context.lesson_id = null;
  try { cleanup?.(); } catch (e) { console.error(e); }
  cleanup = null;
  const view = $('#view');
  view.innerHTML = '';
  view.style.animation = 'none';
  void view.offsetWidth;
  view.style.animation = '';
  try {
    const mod = await r.load();
    if (token !== navToken) return;
    const result = await mod.render(view, { params, query });
    if (token !== navToken) { result?.(); return; }
    cleanup = typeof result === 'function' ? result : null;
    hydrateIcons(view);
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="card empty"><i data-icon="alert"></i><div>Something went wrong loading this page.<br><span class="faint small">${esc(e.message)}</span></div></div>`;
    hydrateIcons(view);
  }
  window.scrollTo({ top: 0 });
}

/* --------------------------------------------------------------- shared actions */
export function openDrawer(question) {
  const d = $('#drawer');
  if (!drawerChat) drawerChat = new Chat($('#drawer-chat'), { compact: true });
  d.classList.add('open');
  d.setAttribute('aria-hidden', 'false');
  $('#scrim').classList.add('show');
  if (question) drawerChat.ask(question);
  else setTimeout(() => d.querySelector('textarea')?.focus(), 250);
}

function closeDrawer() {
  $('#drawer').classList.remove('open');
  $('#drawer').setAttribute('aria-hidden', 'true');
  $('#scrim').classList.remove('show');
}

export function loadIntoBuilder(numQubits, operations, title) {
  store.set('circuit', { num_qubits: numQubits, operations });
  if (title) toast(`Loaded “${esc(title)}” into the Circuit Builder`, 'success', 2200);
  navigate('/builder');
}

export function loadIntoLab(operations) {
  sessionStorage.setItem('q3d-lab-ops', JSON.stringify(operations));
  navigate('/lab');
}

/* --------------------------------------------------------------- profile */
function renderUserChip() {
  const u = store.user;
  $('#user-chip').innerHTML = u
    ? `<span class="avatar">${esc(initials(u.name))}</span><span class="uname">${esc(u.name)}<small>${u.role === 'instructor' ? 'Instructor' : 'Learner'}${u.classroom_code ? ` · ${esc(u.classroom_code)}` : ''}</small></span>`
    : `<span class="avatar">?</span><span class="uname">Sign in<small>save your progress</small></span>`;
}

export function openProfile(force = false) {
  const m = $('#modal');
  const u = store.user;
  m.hidden = false;
  m.innerHTML = `<form class="modal-card stack" data-form>
    <div><h2>${u ? 'Your profile' : 'Welcome to Q-3D Learn'} ✨</h2>
    <p class="muted small">${u ? 'Update your details or switch profile.' : 'Create a learner profile to save lesson progress, quiz scores, challenges and experiments. No password needed.'}</p></div>
    <label class="field">Your name<input class="input" name="name" maxlength="80" required value="${esc(u?.name || '')}" placeholder="e.g. Ada"></label>
    <div class="role-pick">
      <label><input type="radio" name="role" value="student" ${u?.role !== 'instructor' ? 'checked' : ''}> <span><b>Student</b><br><small class="faint">Learn & experiment</small></span></label>
      <label><input type="radio" name="role" value="instructor" ${u?.role === 'instructor' ? 'checked' : ''}> <span><b>Instructor</b><br><small class="faint">Track a class</small></span></label>
    </div>
    <label class="field">Classroom code <span class="faint">(optional — try DEMO42 after loading the demo class)</span><input class="input mono" name="code" maxlength="12" value="${esc(u?.classroom_code || '')}" placeholder="ABC123"></label>
    <div class="row" style="justify-content:flex-end">
      ${u ? '<button type="button" class="btn btn-danger" data-signout>Sign out</button>' : ''}
      ${!force || u ? '<button type="button" class="btn btn-ghost" data-close>Not now</button>' : ''}
      <button class="btn btn-primary" type="submit">${u ? 'Save' : 'Start learning'}</button>
    </div></form>`;
  const form = m.querySelector('[data-form]');
  setTimeout(() => form.name.focus(), 50);
  const close = () => { m.hidden = true; m.innerHTML = ''; };
  m.querySelector('[data-close]')?.addEventListener('click', () => { sessionStorage.setItem('q3d-skip-profile', '1'); close(); });
  m.querySelector('[data-signout]')?.addEventListener('click', () => { store.set('user', null); renderUserChip(); close(); toast('Signed out'); route(); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const role = form.role.value;
    const code = form.code.value.trim().toUpperCase() || null;
    try {
      let user;
      if (u && u.name === name && u.role === role) {
        user = code && code !== u.classroom_code ? { ...u, ...(await api.joinClass(u.id, code)) } : { ...u, classroom_code: code || u.classroom_code };
      } else {
        user = await api.createUser({ name, role, classroom_code: code });
      }
      store.set('user', user);
      renderUserChip();
      close();
      toast(`Welcome, ${esc(user.name)}!`, 'success');
      route();
    } catch (err) { toast(err.message, 'error'); }
  });
}

/* --------------------------------------------------------------- boot */
async function checkBackend() {
  const pill = $('#status-pill');
  try {
    const sys = await api.system();
    store.system = sys;
    pill.className = 'status-pill ok';
    const q = sys.qiskit.available ? 'Qiskit Aer' : 'Q3D engine';
    const ai = sys.ai_provider === 'offline' ? 'offline tutor' : sys.ai_provider;
    $('#status-text').textContent = `${q} · ${ai}`;
    pill.title = `Backend v${sys.version} · DB ${sys.database} · Simulator: ${q} · AI: ${ai}`;
    $('#drawer-provider').textContent = sys.ai_provider === 'offline' ? 'Offline tutor (add an API key for LLM answers)' : `Powered by ${sys.ai_provider}`;
  } catch {
    pill.className = 'status-pill err';
    $('#status-text').textContent = 'Backend offline';
  }
}

async function boot() {
  hydrateIcons();
  renderUserChip();
  $('#menu-btn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  $('#open-drawer').addEventListener('click', () => openDrawer());
  $('#close-drawer').addEventListener('click', closeDrawer);
  $('#scrim').addEventListener('click', closeDrawer);
  $('#user-chip').addEventListener('click', () => openProfile());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

  checkBackend();
  try {
    const g = await api.gates();
    store.gates = Object.fromEntries(g.gates.map((x) => [x.name, x]));
  } catch {
    toast('Cannot reach the Q-3D Learn backend. Start it with <code>python run.py</code>.', 'error', 8000);
  }
  // validate a remembered user still exists (e.g. after the DB was reset)
  if (store.user) {
    try { store.set('user', { ...store.user, ...(await api.getUser(store.user.id)) }); } catch (e) { if (e.status === 404) store.set('user', null); }
    renderUserChip();
  }
  window.addEventListener('hashchange', route);
  await route();
  if (!store.user && !sessionStorage.getItem('q3d-skip-profile')) setTimeout(() => openProfile(), 900);
}

boot();

export { icon };
