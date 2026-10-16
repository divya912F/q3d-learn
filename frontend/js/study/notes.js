// Lesson notes: saved to the learner's profile when signed in, otherwise kept in this browser.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, debounce } from '../ui.js';

const LS = 'q3d-notes:v1';
const local = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch { return {}; } };
const saveLocal = (all) => { try { localStorage.setItem(LS, JSON.stringify(all)); } catch { /* ignore */ } };

export async function getNote(lessonId) {
  if (store.user) { try { return (await api.note(store.user.id, lessonId)).text; } catch { /* offline */ } }
  return local()[lessonId]?.text || '';
}

export async function putNote(lesson, course, text) {
  if (store.user) return api.saveNote(store.user.id, lesson.id, text);
  const all = local();
  all[lesson.id] = { text, course, lesson_title: lesson.title, order: lesson.order, updated_at: new Date().toISOString() };
  saveLocal(all);
  return all[lesson.id];
}

export async function allNotes() {
  if (store.user) { try { return await api.notes(store.user.id); } catch { /* offline */ } }
  return Object.entries(local()).filter(([, n]) => n.text.trim()).map(([lesson_id, n]) => ({ lesson_id, ...n }));
}

/** Notes widget for the lesson page. */
export async function mountNotes(box, lesson, course) {
  box.innerHTML = `<div class="row-between"><b class="small">✏️ My notes</b><span class="faint tiny" data-status></span></div>
    <textarea class="input notes-area" data-text rows="6" placeholder="Summarise “${esc(lesson.title)}” in your own words…"></textarea>
    <div class="row-between tiny faint"><span>${store.user ? 'Saved to your profile' : 'Saved in this browser'}</span><a href="#/notes">all notes →</a></div>`;
  const ta = box.querySelector('[data-text]');
  const status = box.querySelector('[data-status]');
  ta.value = await getNote(lesson.id);
  const save = debounce(async () => {
    status.textContent = 'saving…';
    try { await putNote(lesson, course, ta.value); status.textContent = 'saved ✓'; } catch { status.textContent = 'offline — will retry'; }
  }, 700);
  ta.addEventListener('input', () => { status.textContent = '…'; save(); });
}
