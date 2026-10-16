// Command palette (Ctrl/⌘ + K): jump to any lesson, lab, challenge, glossary term or tool.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, hydrateIcons } from '../ui.js';

let index = null;
let building = null;

async function buildIndex(actions) {
  const items = [
    ['Study desk', 'Home', '#/', 'home'], ['Review cards', 'Spaced repetition', '#/review', 'cards'],
    ['Glossary', 'Every key term', '#/glossary', 'abc'], ['My notebook', 'Your lesson notes', '#/notes', 'notebook'],
    ['My progress', 'XP, mastery and certificates', '#/progress', 'chart'], ['AI Tutor (Q-Bot)', 'Ask anything', '#/tutor', 'bot'],
    ['Instructor dashboard', 'Classrooms and analytics', '#/instructor', 'users'], ['About the project', 'Story and architecture', '#/about', 'info'],
  ].map(([t, sub, href, ic]) => ({ type: 'Page', t, sub, href, ic }));
  items.push(...actions.map((a) => ({ type: 'Action', ...a })));
  const details = await Promise.all(store.courses.map((c) => api.course(c.id).catch(() => null)));
  store.courses.forEach((c, k) => {
    items.push({ type: 'Course', t: c.title, sub: c.tagline, href: `#/c/${c.id}`, ic: c.icon, course: c.id });
    c.labs.forEach((l) => items.push({ type: 'Lab', t: l.title, sub: c.title, href: `#/c/${c.id}/lab/${l.id}`, ic: l.icon, course: c.id }));
    const d = details[k];
    d?.lesson_list.forEach((l) => items.push({ type: 'Lesson', t: l.title, sub: `${c.short} · ${l.summary || l.topic_label}`, href: `#/c/${c.id}/learn/${l.id}`, ic: 'book', course: c.id }));
    d?.challenge_list.forEach((ch) => items.push({ type: 'Challenge', t: ch.title, sub: `${c.short} · ${ch.difficulty || ''}`, href: `#/c/${c.id}/challenges/${ch.id}`, ic: 'trophy', course: c.id }));
  });
  try {
    (await api.glossary()).forEach((g) => items.push({ type: 'Term', t: g.term, sub: g.text.replace(/\*/g, '').slice(0, 90), href: `#/glossary?q=${encodeURIComponent(g.term)}`, ic: 'abc', course: g.course }));
  } catch { /* offline */ }
  return items;
}

function score(item, q) {
  if (!q) return item.type === 'Page' || item.type === 'Action' ? 2 : item.type === 'Course' ? 1 : 0;
  const t = item.t.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  const words = q.split(/\s+/).filter(Boolean);
  if (words.every((w) => t.includes(w))) return 60 - t.indexOf(words[0]) * 0.1;
  const sub = (item.sub || '').toLowerCase();
  if (words.every((w) => t.includes(w) || sub.includes(w))) return 30;
  let i = 0; // subsequence match ("gro" → Grover)
  for (const ch of t) if (ch === q[i]) i++;
  return i === q.length ? 10 : -1;
}

export async function openPalette(actions = []) {
  const m = document.getElementById('modal');
  m.hidden = false;
  m.innerHTML = `<div class="palette-card" role="combobox" aria-expanded="true">
    <div class="palette-input">${icon('search')}<input data-q placeholder="Search lessons, labs, challenges, terms…" aria-label="Search" autocomplete="off"><span class="kbd">Esc</span></div>
    <div class="palette-list" data-list role="listbox"><div class="empty small">Loading…</div></div>
    <div class="palette-foot faint tiny"><span><span class="kbd">↑</span> <span class="kbd">↓</span> move · <span class="kbd">Enter</span> open</span><span>${store.courses.length} courses indexed</span></div></div>`;
  const input = m.querySelector('[data-q]');
  const list = m.querySelector('[data-list]');
  input.focus();
  const close = () => { m.hidden = true; m.innerHTML = ''; document.removeEventListener('keydown', keys, true); };
  m.addEventListener('click', (e) => { if (e.target === m) close(); });
  if (!index) { building ||= buildIndex(actions); index = await building; }
  let results = [];
  let sel = 0;
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    results = index.map((it) => [it, score(it, q)]).filter(([, s]) => s >= 0).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([it]) => it);
    sel = Math.min(sel, Math.max(0, results.length - 1));
    list.innerHTML = results.length ? results.map((r, i) => `<a class="pal-item ${i === sel ? 'sel' : ''}" data-i="${i}" href="${r.href || '#'}" role="option" ${r.course ? `style="--course:var(--c-${r.course})"` : ''}>
      <span class="pi">${icon(r.ic || 'sparkle')}</span><span class="grow"><b>${esc(r.t)}</b><small>${esc(r.sub || '')}</small></span><span class="chip gray">${r.type}</span></a>`).join('')
      : `<div class="empty small">No match for “${esc(input.value)}”. Try the <a href="#/glossary?q=${encodeURIComponent(input.value)}">glossary</a> or ask Q-Bot.</div>`;
    list.querySelectorAll('[data-i]').forEach((a) => a.addEventListener('click', (e) => {
      const r = results[+a.dataset.i];
      if (r.run) { e.preventDefault(); close(); r.run(); } else close();
    }));
    hydrateIcons(list);
  };
  const keys = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(results.length - 1, sel + 1); draw(); list.querySelector('.sel')?.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); list.querySelector('.sel')?.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[sel];
      if (!r) return;
      close();
      if (r.run) r.run(); else location.hash = r.href.slice(1);
    }
  };
  document.addEventListener('keydown', keys, true);
  input.addEventListener('input', () => { sel = 0; draw(); });
  draw();
}

export function resetPaletteIndex() { index = null; building = null; }
