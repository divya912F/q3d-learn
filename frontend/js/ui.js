// Shared UI helpers: icons, DOM helpers, toasts, markdown, maths formatting, confetti.

const ICONS = {
  cloud: '<path d="M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.1 9.2 4.4 4.4 0 0 0 7 18z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  cards: '<rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 6V4h14v14h-4"/><path d="M7 12h6M7 15h4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/>',
  abc: '<path d="M3 17l3.5-10L10 17M4.2 13.5h4.6"/><path d="M13 7v10h3a2.5 2.5 0 0 0 0-5h-3 2.5a2.5 2.5 0 0 0 0-5z"/><path d="M21 9a3 3 0 1 0 0 6"/>',
  wifiOff: '<path d="M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5.2-2.7M19 13a10 10 0 0 0-2-1.5M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 11 5.1"/><circle cx="12" cy="20" r="1" fill="currentColor"/>',
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  book: '<path d="M2 5c3-1.5 7-1.5 10 1 3-2.5 7-2.5 10-1v14c-3-1.5-7-1.5-10 1-3-2.5-7-2.5-10-1z"/><path d="M12 6v14"/>',
  sphere: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="9" ry="3.5"/><path d="M12 12l5-6"/><circle cx="17" cy="6" r="1.2" fill="currentColor"/>',
  circuit: '<path d="M2 7h20M2 17h20"/><rect x="5" y="4" width="6" height="6" rx="1.5" fill="var(--bg)"/><circle cx="16" cy="7" r="1.6" fill="currentColor"/><path d="M16 7v10"/><circle cx="16" cy="17" r="3" fill="var(--bg)"/><path d="M16 14v6M13 17h6"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/><path d="M12 14v4M8 21h8M9 18h6"/>',
  bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4"/><circle cx="12" cy="3" r="1"/><circle cx="9" cy="14" r="1.3" fill="currentColor"/><circle cx="15" cy="14" r="1.3" fill="currentColor"/><path d="M2 13v3M22 13v3"/>',
  chart: '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c3 0 5 2 5 5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  code: '<path d="M8 6l-6 6 6 6M16 6l6 6-6 6"/>',
  mic: '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  volume: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
  mute: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/>',
  send: '<path d="M4 12l16-8-6 16-3-7z"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
  cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  zap: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  file: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/>',
  school: '<path d="M3 21h18M5 21V10l7-5 7 5v11"/><path d="M10 21v-5h4v5M9 12h.5M14.5 12h.5"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/><circle cx="16" cy="16" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/><path d="M9 9h1M14 9h1M9 14h1M14 14h1"/>',
  trend: '<path d="M3 20h18"/><path d="M4 16l5-6 4 3 7-8"/><path d="M15 5h5v5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 4v16"/>',
  route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  pencil: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
  notebook: '<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M5 7H3M5 12H3M5 17H3M9 3v18"/>',
  shuffle: '<path d="M3 6h4l10 12h4M3 18h4l3-3.6M14 9.6 17 6h4"/><path d="M19 4l2 2-2 2M19 16l2 2-2 2"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>',
  step: '<path d="M5 4l10 8-10 8z" fill="currentColor"/><rect x="17" y="4" width="3" height="16" rx="1" fill="currentColor"/>',
  github: '<path d="M9 19c-4 1.5-4-2-6-2.5M15 22v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V22"/>',
};

export function icon(name) {
  const body = ICONS[name] || ICONS.info;
  return `<svg viewBox="0 0 24 24" width="1.15em" height="1.15em" style="flex:none" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export function hydrateIcons(root = document) {
  root.querySelectorAll('i[data-icon]:not([data-done])').forEach((el) => {
    el.innerHTML = icon(el.dataset.icon);
    el.dataset.done = '1';
  });
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Create an element from an HTML string (first element). */
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  const node = t.content.firstElementChild;
  hydrateIcons(t.content);
  return node;
}

export function toast(message, kind = 'info', ms = 3600) {
  const box = document.getElementById('toasts');
  const ic = { success: 'checkCircle', error: 'alert', info: 'sparkle' }[kind] || 'sparkle';
  const color = { success: 'var(--green)', error: 'var(--red)', info: 'var(--primary)' }[kind];
  const t = el(`<div class="toast ${kind}"><i data-icon="${ic}" style="color:${color}"></i><div>${message}</div></div>`);
  box.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .3s, transform .3s'; t.style.opacity = '0'; t.style.transform = 'translateY(6px)'; }, ms);
  setTimeout(() => t.remove(), ms + 350);
}

/* ------------------------------------------------------------------ markdown */
export function markdown(src) {
  const lines = esc(src).split('\n');
  let html = '';
  let list = null;
  let code = false;
  const inline = (s) => s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const closeList = () => { if (list) { html += `</${list}>`; list = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('```')) { closeList(); html += code ? '</code></pre>' : '<pre><code>'; code = !code; continue; }
    if (code) { html += line + '\n'; continue; }
    let m;
    if ((m = line.match(/^\s*[-•*]\s+(.*)/))) {
      if (list !== 'ul') { closeList(); html += '<ul>'; list = 'ul'; }
      html += `<li>${inline(m[1])}</li>`;
    } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) {
      if (list !== 'ol') { closeList(); html += '<ol>'; list = 'ol'; }
      html += `<li>${inline(m[1])}</li>`;
    } else if ((m = line.match(/^#{1,4}\s+(.*)/))) {
      closeList(); html += `<p><b>${inline(m[1])}</b></p>`;
    } else if (!line.trim()) {
      closeList();
    } else {
      closeList(); html += `<p>${inline(line)}</p>`;
    }
  }
  closeList();
  if (code) html += '</code></pre>';
  return html;
}

/* ------------------------------------------------------------------ maths */
const TEX_MAP = [
  [/\\\{/g, '⦃'], [/\\\}/g, '⦄'], [/\\in\b/g, '∈'], [/\\tanh/g, 'tanh'], [/\\min/g, 'min'],
  [/\\begin\{pmatrix\}(.*?)\\end\{pmatrix\}/g, (_, b) => '[' + b.split('\\\\').map((r) => r.split('&').map((x) => x.trim()).join(' ')).join(' ; ') + ']'],
  [/\\begin\{cases\}(.*?)\\end\{cases\}/g, (_, b) => '{ ' + b.split('\\\\').map((r) => r.replace(/&/g, ' ')).join(' ; ') + ' }'],
  [/\\text\{([^}]*)\}|\\mathrm\{([^}]*)\}/g, (_, a, b) => a ?? b],
  [/\\xrightarrow\{([^}]*)\}/g, ' —$1→ '],
  [/\\hat\{(\w)\}/g, '$1̂'], [/\\bar\{(\w+)\}/g, '$1̄'], [/\\mathcal\{N\}/g, '𝒩'],
  [/\^\{\\otimes n\}/g, '⊗ⁿ'], [/\\sqrt\{(\w+)\}|\\sqrt(\w)/g, (_, a, b) => `√${a || b}`],
  [/\\psi/g, 'ψ'], [/\\varphi|\\phi/g, 'φ'], [/\\theta/g, 'θ'], [/\\alpha/g, 'α'], [/\\beta/g, 'β'], [/\\gamma/g, 'γ'], [/\\eta/g, 'η'],
  [/\\sigma/g, 'σ'], [/\\mu/g, 'μ'], [/\\lambda/g, 'λ'], [/\\partial\s*/g, '∂'], [/\\sum_\{?(\w)\}?/g, 'Σ_$1 '], [/\\sum/g, 'Σ'], [/\\max_\{?([^}\s]+)\}?/g, 'max_$1 '],
  [/\\max/g, 'max'], [/\\pi/g, 'π'], [/\\rangle/g, '⟩'], [/\\langle/g, '⟨'], [/\\otimes/g, '⊗'], [/\\leftarrow/g, '←'], [/\\Rightarrow/g, '⇒'],
  [/\\rightarrow/g, '→'], [/\\cdot/g, '·'], [/\\approx/g, '≈'], [/\\mid/g, '|'], [/\\lVert|\\rVert/g, '‖'], [/\\left|\\right/g, ''],
  [/\\qquad|\\quad/g, '   '], [/\\[,;!]|\\ /g, ' '], [/\\big|\\Big/g, ''], [/\^2/g, '²'], [/\^\{([^}]*)\}/g, '^($1)'],
  [/\\t?frac\{([^}]*)\}\{([^}]*)\}/g, (_, a, b) => `(${wrap(a)}/${wrap(b)})`],
  [/[{}]/g, ''], [/\\cos/g, 'cos'], [/\\sin/g, 'sin'], [/\\[a-zA-Z]+/g, ''], [/⦃/g, '{'], [/⦄/g, '}'],
];

const wrap = (x) => (/^[\w√ψφθαβπσμη∂\u0302\u0304]+$/u.test(x.trim()) ? x.trim() : `(${x.trim()})`);

export function renderTex(target, tex) {
  if (window.katex) {
    try { window.katex.render(tex, target, { displayMode: true, throwOnError: false }); return; } catch { /* fall through */ }
  }
  let s = tex;
  for (const [re, rep] of TEX_MAP) s = s.replace(re, rep);
  target.classList.add('fallback');
  target.textContent = s;
}

export function fmtNum(x, d = 3) {
  const v = Math.abs(x) < 10 ** -(d + 1) ? 0 : x;
  return v.toFixed(d).replace(/^-0\.0+$/, '0.000');
}

export function fmtComplex(re, im, d = 3) {
  const r = Math.abs(re) < 5e-4 ? 0 : re;
  const i = Math.abs(im) < 5e-4 ? 0 : im;
  if (i === 0) return fmtNum(r, d);
  if (r === 0) return `${fmtNum(i, d)}i`;
  return `${fmtNum(r, d)}${i < 0 ? '−' : '+'}${fmtNum(Math.abs(i), d)}i`;
}

/** Format an angle as a multiple of π when it is a nice fraction. */
export function fmtAngle(a) {
  for (const den of [1, 2, 3, 4, 6, 8, 12, 16]) {
    const num = (a * den) / Math.PI;
    if (Math.abs(num - Math.round(num)) < 1e-6) {
      const n = Math.round(num);
      if (n === 0) return '0';
      const top = n === 1 ? 'π' : n === -1 ? '−π' : `${n}π`;
      return den === 1 ? top : `${top}/${den}`;
    }
  }
  return a.toFixed(3);
}

export function parseAngle(text) {
  const s = String(text).trim().replace(/π/g, 'pi').replace(/−/g, '-');
  if (!/^[0-9pi+\-*/().\s]+$/.test(s)) throw new Error('Use numbers and pi, e.g. pi/4');
  // eslint-disable-next-line no-new-func
  const v = Function('pi', `"use strict";return (${s.replace(/(\d)\s*pi/g, '$1*pi')});`)(Math.PI);
  if (!Number.isFinite(v)) throw new Error('Not a number');
  return v;
}

/** Colour for a complex phase (hue wheel; 0 rad = blue). */
export function phaseColor(phase, light = 62) {
  const deg = ((phase * 180) / Math.PI + 360 + 220) % 360;
  return `hsl(${deg.toFixed(0)} 90% ${light}%)`;
}

export const GATE_COLORS = {
  superposition: '#3b5bdb', pauli: '#7048e8', phase: '#1098ad', rotation: '#e67700',
  entangle: '#d6336c', multi: '#0ca678', measure: '#64748b', basic: '#64748b', meta: '#475569',
};

/** Colours for class labels / series in plots (work on paper and in dark mode). */
export const CLASS_COLORS = ['#3b5bdb', '#e8590c', '#0ca678', '#d6336c', '#7048e8', '#1098ad', '#e67700', '#495057', '#5c940d', '#ae3ec9'];

export function cssVar(name, el = document.documentElement) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

export function gateColor(spec) {
  return GATE_COLORS[spec?.category] || '#4f8cff';
}

export function initials(name = '') {
  return name.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export function setRangeFill(input) {
  const min = +input.min || 0;
  const max = +input.max || 100;
  input.style.setProperty('--p', `${((input.value - min) / (max - min)) * 100}%`);
}

/* ------------------------------------------------------------------ confetti */
export function confetti() {
  const c = document.createElement('canvas');
  c.className = 'confetti';
  c.width = innerWidth; c.height = innerHeight;
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  const colors = Object.values(GATE_COLORS).slice(0, 6);
  const parts = Array.from({ length: 160 }, () => ({
    x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .35,
    vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, s: 4 + Math.random() * 6,
    r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: colors[(Math.random() * colors.length) | 0],
  }));
  let frame = 0;
  (function tick() {
    ctx.clearRect(0, 0, c.width, c.height);
    parts.forEach((p) => {
      p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vx *= 0.99;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
    });
    if (++frame < 160) requestAnimationFrame(tick); else c.remove();
  })();
}

export function debounce(fn, ms = 200) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
