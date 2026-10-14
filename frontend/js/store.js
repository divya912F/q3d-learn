// Global app state with a tiny pub/sub and localStorage persistence.
const KEY = 'q3d-learn:v1';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

const saved = load();
const listeners = new Map();

export const store = {
  user: saved.user || null,                 // {id, name, role, classroom_code}
  circuit: saved.circuit || { num_qubits: 2, operations: [] },
  lastResult: null,                          // latest quantum simulation result (AI context)
  labContext: null,                          // {lab, title, facts[]} from the current visual lab (AI context)
  labCircuit: null,                          // 1-qubit circuit from the 3D Bloch lab
  gates: {},                                 // quantum gate catalogue
  courses: [],                               // course catalogue from /api/courses
  course: saved.course || null,              // currently open course id
  context: { lesson_id: null, challenge_id: null },
  chat: saved.chat || [],
  voice: saved.voice ?? false,
  theme: saved.theme || document.documentElement.dataset.theme || 'light',
  system: null,

  set(key, value) {
    this[key] = value;
    persist();
    (listeners.get(key) || []).forEach((fn) => fn(value));
  },
  on(key, fn) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(fn);
    return () => listeners.get(key).delete(fn);
  },
  courseMeta(id = this.course) {
    return this.courses.find((c) => c.id === id) || null;
  },
};

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      user: store.user, circuit: store.circuit, chat: store.chat.slice(-40), voice: store.voice, theme: store.theme, course: store.course,
    }));
  } catch { /* storage unavailable (private mode) */ }
}
