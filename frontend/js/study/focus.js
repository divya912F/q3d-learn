// Focus timer (Pomodoro): focused study blocks + short breaks. Survives page changes and reloads,
// logs finished sessions to the learner's progress, and plays a soft chime.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, confetti } from '../ui.js';
import { popover, closePopover } from './settings.js';

const LS = 'q3d-focus:v1';
const PRESETS = [[25, 5, 'Classic'], [50, 10, 'Deep work'], [15, 3, 'Quick sprint']];
let s = { mode: 'focus', focus: 25, brk: 5, endsAt: null, left: 25 * 60, label: '', done: 0, day: '' };
try { s = { ...s, ...JSON.parse(localStorage.getItem(LS) || '{}') }; } catch { /* ignore */ }
const today = () => new Date().toISOString().slice(0, 10);
if (s.day !== today()) { s.done = 0; s.day = today(); }

let pill, tick, baseTitle = document.title;
const save = () => { try { localStorage.setItem(LS, JSON.stringify(s)); } catch { /* ignore */ } };
const running = () => !!s.endsAt;
const remaining = () => (running() ? Math.max(0, Math.round((s.endsAt - Date.now()) / 1000)) : s.left);
const total = () => (s.mode === 'focus' ? s.focus : s.brk) * 60;
const fmt = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

function chime() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    [[660, 0], [880, 0.18], [1320, 0.36]].forEach(([f, t]) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ac.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 0.9);
      o.connect(g).connect(ac.destination); o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 1);
    });
  } catch { /* audio blocked */ }
}

export function startFocus(minutes) {
  if (minutes) { s.mode = 'focus'; s.focus = minutes; }
  s.left = s.left > 0 && s.left <= total() && !minutes ? s.left : total();
  s.endsAt = Date.now() + s.left * 1000;
  save(); render(); loop();
}
export function pauseFocus() { s.left = remaining(); s.endsAt = null; save(); render(); }
export function resetFocus(mode = s.mode) { s.mode = mode; s.endsAt = null; s.left = total(); save(); render(); }

async function finish() {
  const wasFocus = s.mode === 'focus';
  s.endsAt = null;
  chime();
  if (wasFocus) {
    s.done += 1;
    confetti();
    toast(`Focus block done — ${s.focus} minutes${s.label ? ` on <b>${esc(s.label)}</b>` : ''}. Take a ${s.brk}-minute break! 🌿`, 'success', 6000);
    if (store.user) api.logFocus({ user_id: store.user.id, minutes: s.focus, course: store.currentCourse || store.course, label: s.label }).catch(() => {});
    if (window.Notification?.permission === 'granted' && document.hidden) new Notification('Q-3D Learn', { body: 'Focus block complete — time for a break.' });
    s.mode = 'brk';
  } else {
    toast('Break over — ready for another focus block? 📚', 'info', 6000);
    s.mode = 'focus';
  }
  s.left = total();
  save(); render();
}

function loop() {
  clearInterval(tick);
  if (!running()) return;
  tick = setInterval(() => {
    if (remaining() <= 0) { clearInterval(tick); finish(); return; }
    paint();
  }, 1000);
  paint();
}

function paint() {
  const sec = remaining();
  if (pill) {
    pill.querySelector('[data-t]').textContent = fmt(sec);
    pill.style.setProperty('--f', `${100 * (1 - sec / total())}%`);
  }
  const prefix = running() ? `${s.mode === 'focus' ? '⏳' : '🌿'} ${fmt(sec)} · ` : '';
  const clean = document.title.replace(/^(⏳|🌿) \d\d:\d\d · /, '');
  baseTitle = clean;
  if (document.title !== prefix + clean) document.title = prefix + clean;
  const btn = document.getElementById('focus-btn');
  if (btn) btn.classList.toggle('on', running());
}

function render() {
  const show = running() || s.left < total();
  if (!show) { pill?.remove(); pill = null; paint(); return; }
  if (!pill) {
    pill = document.createElement('button');
    pill.className = 'focus-pill';
    pill.addEventListener('click', () => openFocus(pill));
    document.body.appendChild(pill);
  }
  pill.classList.toggle('brk', s.mode !== 'focus');
  pill.classList.toggle('paused', !running());
  pill.innerHTML = `<span class="ring"></span><span><small>${s.mode === 'focus' ? 'Focus' : 'Break'}${running() ? '' : ' · paused'}</small><b data-t>${fmt(remaining())}</b></span>`;
  paint();
}

export async function openFocus(anchor = document.getElementById('focus-btn')) {
  const p = popover(anchor, `
    <div class="pop-head"><b>${icon('clock')} Focus timer</b><span class="faint tiny">${s.done} block${s.done === 1 ? '' : 's'} today</span></div>
    <div class="focus-face ${s.mode === 'focus' ? '' : 'brk'}"><small>${s.mode === 'focus' ? 'Focus' : 'Break'}</small><b data-big>${fmt(remaining())}</b></div>
    <div class="seg" data-presets>${PRESETS.map(([f, b, l]) => `<button class="${s.focus === f ? 'active' : ''}" data-f="${f}" data-b="${b}">${f}/${b} <span class="faint">${l}</span></button>`).join('')}</div>
    <input class="input" data-label maxlength="120" placeholder="What are you studying? (optional)" value="${esc(s.label)}" style="margin-top:10px">
    <div class="row" style="margin-top:10px">
      ${running() ? `<button class="btn btn-ghost grow" data-pause>${icon('pause')} Pause</button>` : `<button class="btn btn-primary grow" data-start>${icon('play')} ${s.left < total() ? 'Resume' : s.mode === 'focus' ? 'Start focus' : 'Start break'}</button>`}
      <button class="icon-btn" data-reset title="Reset">${icon('reset')}</button>
      <button class="btn btn-ghost btn-sm" data-switch>${s.mode === 'focus' ? 'Take a break' : 'Back to focus'}</button>
    </div>
    <div data-week class="focus-week"></div>
    <p class="faint tiny" style="margin:8px 0 0">${store.user ? 'Finished blocks count towards your XP and study streak.' : 'Create a profile to log focus time to your progress.'} Tip: press <span class="kbd">F</span> anywhere.</p>`, { width: 340 });
  const q = (x) => p.querySelector(x);
  p.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => {
    s.focus = +b.dataset.f; s.brk = +b.dataset.b; resetFocus('focus'); openFocus(anchor);
  }));
  q('[data-label]').addEventListener('input', (e) => { s.label = e.target.value; save(); });
  q('[data-start]')?.addEventListener('click', () => { if (window.Notification?.permission === 'default') window.Notification.requestPermission?.(); startFocus(); openFocus(anchor); });
  q('[data-pause]')?.addEventListener('click', () => { pauseFocus(); openFocus(anchor); });
  q('[data-reset]').addEventListener('click', () => { resetFocus(); openFocus(anchor); });
  q('[data-switch]').addEventListener('click', () => { resetFocus(s.mode === 'focus' ? 'brk' : 'focus'); openFocus(anchor); });
  const big = q('[data-big]');
  const t = setInterval(() => { if (!document.body.contains(big)) { clearInterval(t); return; } big.textContent = fmt(remaining()); }, 500);
  if (store.user) {
    try {
      const f = await api.focus(store.user.id);
      const max = Math.max(25, ...f.days.map((d) => d.minutes));
      q('[data-week]').innerHTML = `<div class="row-between tiny faint"><span>This week</span><b style="color:var(--text)">${f.week_minutes} min</b></div>
        <div class="bars">${f.days.map((d) => `<span title="${d.date}: ${d.minutes} min" style="height:${Math.max(3, 100 * d.minutes / max)}%"></span>`).join('')}</div>`;
    } catch { /* offline */ }
  }
}

export function initFocus() {
  render();
  loop();
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'f' || e.key === 'F') { e.preventDefault(); openFocus(); }
  });
  new MutationObserver(() => paint()).observe(document.querySelector('title'), { childList: true });
}
export { closePopover };
