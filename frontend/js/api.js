// Thin wrapper around the FastAPI backend.
const BASE = window.Q3D_API_BASE || '';

async function request(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const detail = data?.detail;
    let msg = `Request failed (${res.status})`;
    if (typeof detail === 'string') msg = detail;
    else if (detail?.issues) msg = detail.issues.join(' ');
    else if (Array.isArray(detail)) msg = detail.map((d) => d.msg).join('; ');
    const err = new Error(msg);
    err.status = res.status;
    err.detail = detail;
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b || {}),
  del: (p) => request('DELETE', p),

  system: () => request('GET', '/api/system'),
  gates: () => request('GET', '/api/gates'),
  simulate: (circuit, opts = {}) => request('POST', '/api/simulate', { ...circuit, ...opts }),
  labState: (circuit) => request('POST', '/api/lab/state', circuit),
  exportQasm: (circuit) => request('POST', '/api/qasm/export', circuit),
  importQasm: (qasm) => request('POST', '/api/qasm/import', { qasm }),
  algorithms: () => request('GET', '/api/algorithms'),
  algorithm: (id) => request('GET', `/api/algorithms/${id}`),

  courses: () => request('GET', '/api/courses'),
  course: (cid) => request('GET', `/api/courses/${cid}`),
  lessons: (cid) => request('GET', `/api/courses/${cid}/lessons`),
  lesson: (cid, id) => request('GET', `/api/courses/${cid}/lessons/${id}`),
  submitQuiz: (cid, id, answers, user_id) => request('POST', `/api/courses/${cid}/lessons/${id}/quiz`, { answers, user_id }),
  challenges: (cid) => request('GET', `/api/courses/${cid}/challenges`),
  checkChallenge: (cid, id, payload, user_id) => request('POST', `/api/courses/${cid}/challenges/${id}/check`, { ...payload, user_id }),

  lab: (path, config, user_id) => request('POST', `/api/${path}`, { config, user_id }),

  progress: (uid, course) => request('GET', `/api/progress/${uid}${course ? `?course=${course}` : ''}`),
  saveCircuit: (body) => request('POST', '/api/circuits', body),
  circuits: (uid) => request('GET', `/api/circuits/user/${uid}`),
  deleteCircuit: (id, uid) => request('DELETE', `/api/circuits/${id}?user_id=${uid}`),

  createUser: (body) => request('POST', '/api/users', body),
  getUser: (id) => request('GET', `/api/users/${id}`),
  joinClass: (uid, code) => request('POST', `/api/users/${uid}/join/${encodeURIComponent(code)}`),
  ask: (body) => request('POST', '/api/tutor/ask', body),

  createClassroom: (name, instructor_id) => request('POST', '/api/classrooms', { name, instructor_id }),
  myClassrooms: (uid) => request('GET', `/api/classrooms/instructor/${uid}`),
  demoClassroom: (uid) => request('POST', `/api/classrooms/demo${uid ? `?instructor_id=${uid}` : ''}`),
  overview: (code, course = 'all') => request('GET', `/api/classrooms/${encodeURIComponent(code)}/overview?course=${course}`),
  addAssignment: (code, body) => request('POST', `/api/classrooms/${encodeURIComponent(code)}/assignments`, body),
};
