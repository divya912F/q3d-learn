// Glossary: every key term across the four courses, searchable, linked back to its lesson.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, hydrateIcons, markdown } from '../ui.js';
import { openDrawer } from '../main.js';

export async function render(root, { query }) {
  const all = await api.glossary();
  let course = query.get('course') || '';
  root.innerHTML = `
    <div class="row-between" style="align-items:flex-end;margin-bottom:14px">
      <div><span class="hand" style="font-size:1.4rem;color:var(--pink)">look it up, then ask why</span><h2 style="margin:0">Glossary</h2>
        <p class="muted small" style="margin:4px 0 0">${all.length} terms. In lessons, <span class="gloss" style="pointer-events:none">underlined words</span> open these definitions.</p></div>
      <div class="glossary-search">${icon('search')}<input class="input" data-q placeholder="Search a term…" value="${esc(query.get('q') || '')}" aria-label="Search the glossary"></div>
    </div>
    <div class="tabs" data-tabs style="margin-bottom:16px;width:max-content;max-width:100%">
      <button class="tab" data-c="">All</button>${store.courses.map((c) => `<button class="tab" data-c="${c.id}"><span class="swatch" style="background:var(--c-${c.id})"></span> ${esc(c.short)}</button>`).join('')}
    </div>
    <div data-list></div>`;
  hydrateIcons(root);
  const input = root.querySelector('[data-q]');
  const list = root.querySelector('[data-list]');

  const draw = () => {
    const q = input.value.trim().toLowerCase();
    root.querySelectorAll('[data-c]').forEach((b) => b.classList.toggle('active', b.dataset.c === course));
    const items = all.filter((g) => (!course || g.course === course) && (!q || g.term.toLowerCase().includes(q) || g.text.toLowerCase().includes(q)));
    if (!items.length) { list.innerHTML = `<div class="card empty">No term matches “${esc(input.value)}”. <a href="#" data-ask>Ask Q-Bot instead →</a></div>`; list.querySelector('[data-ask]').addEventListener('click', (e) => { e.preventDefault(); openDrawer(`What does "${input.value}" mean?`); }); return; }
    const groups = {};
    items.forEach((g) => { const L = g.term[0].toUpperCase(); (groups[L] ||= []).push(g); });
    list.innerHTML = Object.entries(groups).map(([L, gs]) => `<div class="gl-group"><div class="gl-letter">${L}</div><div class="gl-grid">${gs.map((g) => {
      const c = store.courseMeta(g.course);
      return `<div class="card gl-card" style="--course:var(--c-${g.course})">
        <div class="row-between"><h3>${esc(g.term)}</h3><span class="chip gray"><span class="swatch" style="background:var(--c-${g.course})"></span>${esc(c?.short || g.course)}</span></div>
        <div class="small muted">${markdown(g.text)}</div>
        <div class="row" style="gap:8px;margin-top:auto">${g.lesson ? `<a class="btn btn-ghost btn-sm" href="#/c/${g.course}/learn/${g.lesson}">${icon('book')} Lesson</a>` : ''}
          <button class="btn btn-ghost btn-sm" data-ask="${esc(g.term)}">${icon('bot')} Explain with an example</button></div></div>`;
    }).join('')}</div></div>`).join('');
    list.querySelectorAll('[data-ask]').forEach((b) => b.addEventListener('click', () => openDrawer(`Explain "${b.dataset.ask}" simply, with a concrete example and a common misconception.`)));
  };
  input.addEventListener('input', draw);
  root.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => { course = b.dataset.c; draw(); }));
  draw();
  if (query.get('q')) input.focus();
}
