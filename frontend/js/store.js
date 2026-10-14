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
  lastResult: null,                          // latest simulation result (for AI context)
  gates: {},                                 // name -> gate spec from /api/gates
  context: { lesson_id: null, challenge_id: null },
  chat: saved.chat || [],                    // [{role, content, facts?}]
  voice: saved.voice ?? false,
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
};

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      user: store.user, circuit: store.circuit, chat: store.chat.slice(-40), voice: store.voice,
    }));
  } catch { /* storage unavailable (private mode) */ }
}
