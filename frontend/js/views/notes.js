// My notebook: every lesson note in one place, exportable as Markdown.
import { store } from '../store.js';
import { esc, icon, hydrateIcons, toast } from '../ui.js';
import { allNotes } from '../study/notes.js';

export async function render(root) {
  const notes = await allNotes();
  const byCourse = {};
  notes.forEach((n) => (byCourse[n.course] ||= []).push(n));
  root.innerHTML = `
    <div class="row-between" style="align-items:flex-end;margin-bottom:16px">
      <div><span class="hand" style="font-size:1.4rem;color:var(--pink)">your own words stick best</span><h2 style="margin:0">My notebook</h2>
        <p class="muted small" style="margin:4px 0 0">${notes.length ? `${notes.length} lesson note${notes.length === 1 ? '' : 's'}${store.user ? ', saved to your profile' : ', saved in this browser'}.` : 'Write notes beside any lesson and they collect here.'}</p></div>
      ${notes.length ? `<div class="row"><button class="btn btn-ghost btn-sm" data-print>${icon('file')} Print</button><button class="btn btn-primary btn-sm" data-export>${icon('download')} Export Markdown</button></div>` : ''}
    </div>
    ${notes.length ? store.courses.filter((c) => byCourse[c.id]).map((c) => `
      <div class="section-title" style="margin-top:8px"><h2 style="font-size:1.25rem"><span class="swatch" style="background:var(--c-${c.id})"></span> ${esc(c.title)}</h2></div>
      <div class="notes-grid">${byCourse[c.id].sort((a, b) => a.order - b.order).map((n) => `<article class="card note-card paper-lines" style="--course:var(--c-${c.id})">
        <div class="row-between"><b>${esc(n.lesson_title)}</b><a class="tiny" href="#/c/${c.id}/learn/${n.lesson_id}">edit →</a></div>
        <div class="note-text">${esc(n.text)}</div>
        <div class="faint tiny">${n.updated_at ? new Date(n.updated_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''}</div></article>`).join('')}</div>`).join('')
    : `<div class="card empty"><i data-icon="notebook"></i><div>No notes yet.<br><a href="#/c/${store.course || 'quantum'}/learn">Open a lesson</a> and use the <b>My notes</b> box under the lesson list.</div></div>`}`;
  hydrateIcons(root);
  root.querySelector('[data-print]')?.addEventListener('click', () => window.print());
  root.querySelector('[data-export]')?.addEventListener('click', () => {
    const md = [`# My Q-3D Learn notebook`, `_Exported ${new Date().toLocaleDateString()}_`, ''];
    store.courses.filter((c) => byCourse[c.id]).forEach((c) => {
      md.push(`## ${c.title}`, '');
      byCourse[c.id].sort((a, b) => a.order - b.order).forEach((n) => md.push(`### ${n.lesson_title}`, '', n.text.trim(), ''));
    });
    const blob = new Blob([md.join('\n')], { type: 'text/markdown' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'q3d-learn-notes.md' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Notebook exported', 'success');
  });
}
