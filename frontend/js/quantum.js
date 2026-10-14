// Client-side single-qubit maths for instant 3D Lab feedback (the backend remains the source of truth
// for multi-qubit simulation). Complex numbers are [re, im].
const S2 = Math.SQRT1_2;

const c = (re, im = 0) => [re, im];
const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const expi = (t) => [Math.cos(t), Math.sin(t)];

export const ZERO = [c(1), c(0)];

export function matrix(name, p = []) {
  const t = p[0] ?? 0;
  switch (name) {
    case 'id': return [[c(1), c(0)], [c(0), c(1)]];
    case 'h': return [[c(S2), c(S2)], [c(S2), c(-S2)]];
    case 'x': return [[c(0), c(1)], [c(1), c(0)]];
    case 'y': return [[c(0), c(0, -1)], [c(0, 1), c(0)]];
    case 'z': return [[c(1), c(0)], [c(0), c(-1)]];
    case 's': return [[c(1), c(0)], [c(0), c(0, 1)]];
    case 'sdg': return [[c(1), c(0)], [c(0), c(0, -1)]];
    case 't': return [[c(1), c(0)], [c(0), expi(Math.PI / 4)]];
    case 'tdg': return [[c(1), c(0)], [c(0), expi(-Math.PI / 4)]];
    case 'sx': return [[c(0.5, 0.5), c(0.5, -0.5)], [c(0.5, -0.5), c(0.5, 0.5)]];
    case 'rx': return [[c(Math.cos(t / 2)), c(0, -Math.sin(t / 2))], [c(0, -Math.sin(t / 2)), c(Math.cos(t / 2))]];
    case 'ry': return [[c(Math.cos(t / 2)), c(-Math.sin(t / 2))], [c(Math.sin(t / 2)), c(Math.cos(t / 2))]];
    case 'rz': return [[expi(-t / 2), c(0)], [c(0), expi(t / 2)]];
    case 'p': return [[c(1), c(0)], [c(0), expi(t)]];
    default: throw new Error(`Unknown single-qubit gate ${name}`);
  }
}

export function applyGate(state, name, params = []) {
  const m = matrix(name, params);
  return [add(mul(m[0][0], state[0]), mul(m[0][1], state[1])), add(mul(m[1][0], state[0]), mul(m[1][1], state[1]))];
}

/** Rotation (axis, angle) that a gate performs on the Bloch sphere. */
export function rotationOf(name, params = []) {
  const D = S2;
  const t = params[0] ?? 0;
  return {
    h: [[D, 0, D], Math.PI], x: [[1, 0, 0], Math.PI], y: [[0, 1, 0], Math.PI], z: [[0, 0, 1], Math.PI],
    s: [[0, 0, 1], Math.PI / 2], sdg: [[0, 0, 1], -Math.PI / 2], t: [[0, 0, 1], Math.PI / 4], tdg: [[0, 0, 1], -Math.PI / 4],
    sx: [[1, 0, 0], Math.PI / 2], rx: [[1, 0, 0], t], ry: [[0, 1, 0], t], rz: [[0, 0, 1], t], p: [[0, 0, 1], t], id: [[0, 0, 1], 0],
  }[name];
}

export function blochOf(s) {
  const [a, b] = s;
  // rho01 = a * conj(b)
  const r01 = [a[0] * b[0] + a[1] * b[1], a[1] * b[0] - a[0] * b[1]];
  const pa = a[0] ** 2 + a[1] ** 2, pb = b[0] ** 2 + b[1] ** 2;
  return [2 * r01[0], -2 * r01[1], pa - pb];
}

/** Normalise the global phase so that the |0⟩ amplitude is real and non-negative. */
export function canonical(s) {
  const [a, b] = s;
  const mag = Math.hypot(...a);
  if (mag < 1e-9) {
    const mb = Math.hypot(...b);
    return [c(0), c(mb)];
  }
  const ph = Math.atan2(a[1], a[0]);
  const rot = expi(-ph);
  return [mul(a, rot), mul(b, rot)];
}

export function anglesOf(s) {
  const [x, y, z] = blochOf(s);
  const theta = Math.acos(Math.max(-1, Math.min(1, z)));
  const phi = Math.hypot(x, y) < 1e-9 ? 0 : Math.atan2(y, x);
  return { theta, phi };
}

export function fromAngles(theta, phi) {
  return [c(Math.cos(theta / 2)), mul(c(Math.sin(theta / 2)), expi(phi))];
}

const NAMED = [
  ['|0⟩', [0, 0, 1]], ['|1⟩', [0, 0, -1]], ['|+⟩', [1, 0, 0]], ['|−⟩', [-1, 0, 0]], ['|+i⟩', [0, 1, 0]], ['|−i⟩', [0, -1, 0]],
];

export function stateName(s) {
  const b = blochOf(s);
  const hit = NAMED.find(([, v]) => Math.hypot(v[0] - b[0], v[1] - b[1], v[2] - b[2]) < 1e-6);
  return hit ? hit[0] : null;
}

function fmtC([re, im]) {
  const r = Math.abs(re) < 5e-4 ? 0 : re, i = Math.abs(im) < 5e-4 ? 0 : im;
  if (i === 0) return r.toFixed(3);
  if (r === 0) return `${i.toFixed(3)}i`;
  return `(${r.toFixed(3)}${i < 0 ? '−' : '+'}${Math.abs(i).toFixed(3)}i)`;
}

export function ketString(s) {
  const named = stateName(s);
  const [a, b] = canonical(s);
  const pa = a[0] ** 2 + a[1] ** 2, pb = b[0] ** 2 + b[1] ** 2;
  let out;
  if (pb < 1e-9) out = '|0⟩';
  else if (pa < 1e-9) out = '|1⟩';
  else {
    const bs = fmtC(b);
    out = `${fmtC(a)}|0⟩ ${bs.startsWith('-') ? '− ' + bs.slice(1) : '+ ' + bs}|1⟩`;
  }
  return named && named !== out ? `${out}  =  ${named}` : out;
}

export function amplitudes(s) {
  return canonical(s);
}

export const fmtComplexPair = fmtC;
