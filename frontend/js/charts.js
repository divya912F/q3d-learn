// Lightweight SVG charts (no dependencies).
import { esc, phaseColor } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';

/** Measurement histogram with optional exact-probability markers. */
export function histogram(container, rows, { height = 280, valueLabel = (v) => `${(v * 100).toFixed(1)}%`, highlight = null } = {}) {
  const width = Math.max(320, container.clientWidth || 600);
  const pad = { l: 44, r: 12, t: 18, b: rows.length > 16 ? 58 : 38 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const max = Math.max(0.0001, ...rows.map((r) => Math.max(r.value, r.exact ?? 0)));
  const yMax = max > 0.5 ? 1 : Math.ceil(max * 10) / 10 || 0.1;
  const bw = iw / Math.max(rows.length, 1);
  const barW = Math.min(64, bw * 0.68);
  const ticks = [0, yMax / 2, yMax];
  let svg = `<svg class="hist" viewBox="0 0 ${width} ${height}" role="img" aria-label="Measurement histogram">
    <defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7aa7ff"/><stop offset="1" stop-color="#5b4bff" stop-opacity=".75"/></linearGradient>
    <linearGradient id="hg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#f59e0b" stop-opacity=".8"/></linearGradient></defs>`;
  ticks.forEach((t) => {
    const y = pad.t + ih - (t / yMax) * ih;
    svg += `<line x1="${pad.l}" x2="${width - pad.r}" y1="${y}" y2="${y}" stroke="rgba(140,160,255,.12)"/>
      <text x="${pad.l - 8}" y="${y + 4}" text-anchor="end" fill="#6f7aa3" font-size="11">${(t * 100).toFixed(0)}%</text>`;
  });
  rows.forEach((r, i) => {
    const cx = pad.l + bw * i + bw / 2;
    const h = (r.value / yMax) * ih;
    const hl = highlight && highlight === r.label;
    svg += `<g><title>|${esc(r.label)}⟩ ${valueLabel(r.value)}${r.count != null ? ` (${r.count} shots)` : ''}</title>
      <rect class="bar" x="${cx - barW / 2}" y="${pad.t + ih - h}" width="${barW}" height="${Math.max(h, 0.5)}" rx="5" fill="url(#${hl ? 'hg2' : 'hg'})"/>`;
    if (r.exact != null) {
      const ey = pad.t + ih - (r.exact / yMax) * ih;
      svg += `<line x1="${cx - barW / 2 - 4}" x2="${cx + barW / 2 + 4}" y1="${ey}" y2="${ey}" stroke="#fbbf24" stroke-width="2" stroke-dasharray="4 3"/>`;
    }
    if (rows.length <= 16 && r.value > 0) {
      svg += `<text x="${cx}" y="${pad.t + ih - h - 6}" text-anchor="middle" fill="#a9b3d6" font-size="11">${valueLabel(r.value)}</text>`;
    }
    const rot = rows.length > 16 ? ` transform="rotate(-60 ${cx} ${height - pad.b + 14})"` : '';
    svg += `<text x="${cx}" y="${height - pad.b + 18}" text-anchor="${rows.length > 16 ? 'end' : 'middle'}" fill="#cfd7ff" font-size="12" font-family="JetBrains Mono, monospace"${rot}>${esc(r.label)}</text></g>`;
  });
  svg += '</svg>';
  container.innerHTML = svg;
}

/** Circle-per-amplitude view (magnitude = fill, line = phase). */
export function amplitudeCircles(container, amps, n) {
  container.innerHTML = `<div class="amp-grid">${amps.map(([re, im], i) => {
    const mag = Math.hypot(re, im);
    const ph = Math.atan2(im, re);
    const col = phaseColor(ph);
    const r = 26 * mag;
    const x2 = 32 + 26 * mag * Math.cos(-ph), y2 = 32 + 26 * mag * Math.sin(-ph);
    return `<div class="amp-cell" title="|${i.toString(2).padStart(n, '0')}⟩: ${(mag * mag * 100).toFixed(1)}%, phase ${(ph * 180 / Math.PI).toFixed(0)}°">
      <svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="none" stroke="rgba(140,160,255,.25)"/>
      <circle cx="32" cy="32" r="${r.toFixed(2)}" fill="${col}" fill-opacity=".55"/>
      ${mag > 1e-3 ? `<line x1="32" y1="32" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="#fff" stroke-width="2" stroke-linecap="round"/>` : ''}</svg>
      |${i.toString(2).padStart(n, '0')}⟩</div>`;
  }).join('')}</div>`;
}

/** Radar chart for topic mastery. values: [{label, value|null}] 0..100 */
export function radar(container, values, { size = 300 } = {}) {
  const c = size / 2;
  const R = c - 50;
  const n = values.length;
  const pt = (i, v) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [c + Math.cos(a) * R * v, c + Math.sin(a) * R * v];
  };
  let svg = `<svg viewBox="0 0 ${size} ${size}" style="max-width:${size}px;margin:auto">`;
  [0.25, 0.5, 0.75, 1].forEach((f) => {
    svg += `<polygon points="${values.map((_, i) => pt(i, f).join(',')).join(' ')}" fill="none" stroke="rgba(140,160,255,${f === 1 ? 0.3 : 0.12})"/>`;
  });
  values.forEach((v, i) => {
    const [x, y] = pt(i, 1);
    const [lx, ly] = pt(i, 1.2);
    svg += `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="rgba(140,160,255,.12)"/>
      <text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="10.5" fill="#a9b3d6">${esc(v.label)}</text>`;
  });
  const poly = values.map((v, i) => pt(i, (v.value ?? 0) / 100).join(',')).join(' ');
  svg += `<polygon points="${poly}" fill="rgba(79,140,255,.25)" stroke="#6aa1ff" stroke-width="2"/>`;
  values.forEach((v, i) => {
    if (v.value == null) return;
    const [x, y] = pt(i, v.value / 100);
    svg += `<circle cx="${x}" cy="${y}" r="4" fill="${v.value < 70 ? '#fb7185' : '#9fc0ff'}"><title>${esc(v.label)}: ${v.value}%</title></circle>`;
  });
  container.innerHTML = svg + '</svg>';
}

/** Simple vertical bar series (e.g. activity per day). */
export function bars(container, rows, { height = 160, color = '#4f8cff', fmtLabel = (l) => l } = {}) {
  const width = Math.max(300, container.clientWidth || 500);
  const pad = { l: 28, r: 6, t: 10, b: 26 };
  const iw = width - pad.l - pad.r, ih = height - pad.t - pad.b;
  const max = Math.max(1, ...rows.map((r) => r.value));
  const bw = iw / rows.length;
  let svg = `<svg viewBox="0 0 ${width} ${height}">`;
  [0, max].forEach((t) => {
    const y = pad.t + ih - (t / max) * ih;
    svg += `<line x1="${pad.l}" x2="${width - pad.r}" y1="${y}" y2="${y}" stroke="rgba(140,160,255,.1)"/><text x="${pad.l - 6}" y="${y + 4}" text-anchor="end">${t}</text>`;
  });
  rows.forEach((r, i) => {
    const h = (r.value / max) * ih;
    const x = pad.l + i * bw + bw * 0.18;
    svg += `<rect x="${x}" y="${pad.t + ih - h}" width="${bw * 0.64}" height="${Math.max(h, 1)}" rx="3" fill="${color}" opacity="${r.value ? 0.9 : 0.25}"><title>${esc(r.label)}: ${r.value}</title></rect>`;
    if (i % Math.ceil(rows.length / 7) === 0) svg += `<text x="${x + bw * 0.32}" y="${height - 6}" text-anchor="middle">${esc(fmtLabel(r.label))}</text>`;
  });
  container.innerHTML = svg + '</svg>';
}

/** Ring (donut) progress with centred text. */
export function ring(value, { size = 92, stroke = 9, color = 'url(#rg)', label = '', sub = '' } = {}) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  return `<svg class="level-ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f8cff"/><stop offset="1" stop-color="#9b7bff"/></linearGradient></defs>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="rgba(255,255,255,.08)" stroke-width="${stroke}" fill="none"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round"
      stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - Math.max(0, Math.min(1, value)))}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="${sub ? '46%' : '52%'}" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-family="Space Grotesk, Inter, system-ui, sans-serif" font-weight="700" font-size="${size / 4}">${esc(label)}</text>
    ${sub ? `<text x="50%" y="68%" text-anchor="middle" fill="#6f7aa3" font-size="${size / 9}">${esc(sub)}</text>` : ''}
  </svg>`;
}

/** Semicircle gauge for challenge fidelity. */
export function gauge(value) {
  const v = Math.max(0, Math.min(1, value));
  const a = Math.PI * (1 - v);
  const x = 70 + 56 * Math.cos(a), y = 72 - 56 * Math.sin(a);
  const col = v >= 0.99 ? '#34d399' : v > 0.6 ? '#fbbf24' : '#fb7185';
  return `<svg class="gauge" viewBox="0 0 140 84">
    <path d="M14 72 A56 56 0 0 1 126 72" stroke="rgba(255,255,255,.1)" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M14 72 A56 56 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}" stroke="${col}" stroke-width="10" fill="none" stroke-linecap="round"/>
    <text x="70" y="66" text-anchor="middle" fill="#fff" font-family="Space Grotesk, Inter, system-ui, sans-serif" font-weight="700" font-size="20">${(v * 100).toFixed(1)}%</text>
    <text x="70" y="81" text-anchor="middle" fill="#6f7aa3" font-size="9">fidelity</text></svg>`;
}

/** Heat colour for a 0..100 score. */
export function heatColor(v) {
  if (v == null) return 'rgba(255,255,255,.06)';
  const hue = (v / 100) * 140; // red → green
  return `hsl(${hue.toFixed(0)} 75% ${55 + (v / 100) * 8}%)`;
}
