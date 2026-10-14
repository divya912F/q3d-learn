// Lightweight, theme-aware SVG charts (no dependencies). Colours come from CSS variables so
// they read well on the paper theme and in night mode.
import { esc, phaseColor } from './ui.js';

const T = 'style="fill:var(--text-3)"';
const T2 = 'style="fill:var(--text-2)"';
const GRID = 'style="stroke:var(--chart-grid)"';
const AXIS = 'style="stroke:var(--chart-axis)"';

function width(container, min = 300) {
  return Math.max(min, Math.floor(container.clientWidth || container.parentElement?.clientWidth || 600));
}

export function niceNum(v) {
  if (v == null || !Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1000) return v.toFixed(0);
  if (a >= 100) return v.toFixed(1);
  if (a >= 1) return v.toFixed(2);
  return v.toFixed(3);
}

/** Measurement histogram with optional exact-probability markers (quantum results). */
export function histogram(container, rows, { height = 280, valueLabel = (v) => `${(v * 100).toFixed(1)}%`, highlight = null } = {}) {
  const w = width(container, 320);
  const pad = { l: 44, r: 12, t: 18, b: rows.length > 16 ? 58 : 38 };
  const iw = w - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const max = Math.max(0.0001, ...rows.map((r) => Math.max(r.value, r.exact ?? 0)));
  const yMax = max > 0.5 ? 1 : Math.ceil(max * 10) / 10 || 0.1;
  const bw = iw / Math.max(rows.length, 1);
  const barW = Math.min(64, bw * 0.68);
  let svg = `<svg class="hist" viewBox="0 0 ${w} ${height}" role="img" aria-label="Measurement histogram">`;
  [0, yMax / 2, yMax].forEach((t) => {
    const y = pad.t + ih - (t / yMax) * ih;
    svg += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y}" y2="${y}" ${GRID}/><text x="${pad.l - 8}" y="${y + 4}" text-anchor="end" font-size="11" ${T}>${(t * 100).toFixed(0)}%</text>`;
  });
  rows.forEach((r, i) => {
    const cx = pad.l + bw * i + bw / 2;
    const h = (r.value / yMax) * ih;
    const fill = highlight && highlight === r.label ? 'var(--amber)' : 'var(--course)';
    svg += `<g><title>|${esc(r.label)}⟩ ${valueLabel(r.value)}${r.count != null ? ` (${r.count} shots)` : ''}</title>
      <rect x="${cx - barW / 2}" y="${pad.t + ih - h}" width="${barW}" height="${Math.max(h, 0.5)}" rx="4" style="fill:${fill};fill-opacity:.85"/>`;
    if (r.exact != null) {
      const ey = pad.t + ih - (r.exact / yMax) * ih;
      svg += `<line x1="${cx - barW / 2 - 4}" x2="${cx + barW / 2 + 4}" y1="${ey}" y2="${ey}" style="stroke:var(--amber)" stroke-width="2.5" stroke-dasharray="4 3"/>`;
    }
    if (rows.length <= 16 && r.value > 0) svg += `<text x="${cx}" y="${pad.t + ih - h - 6}" text-anchor="middle" font-size="11" ${T2}>${valueLabel(r.value)}</text>`;
    const rot = rows.length > 16 ? ` transform="rotate(-60 ${cx} ${height - pad.b + 14})"` : '';
    svg += `<text x="${cx}" y="${height - pad.b + 18}" text-anchor="${rows.length > 16 ? 'end' : 'middle'}" font-size="12" font-family="JetBrains Mono, monospace" style="fill:var(--text)"${rot}>${esc(r.label)}</text></g>`;
  });
  container.innerHTML = svg + '</svg>';
}

/** Numeric histogram from bin edges, with an optional curve (pdf) and vertical marker lines. */
export function binHistogram(container, { edges, counts, curve_x, curve_y }, { height = 240, color = 'var(--course)', lines = [], xLabel = '', fmt = niceNum } = {}) {
  const w = width(container);
  const pad = { l: 42, r: 12, t: 14, b: xLabel ? 40 : 28 };
  const iw = w - pad.l - pad.r, ih = height - pad.t - pad.b;
  if (!edges?.length) { container.innerHTML = '<div class="empty">No numeric data</div>'; return; }
  const x0 = edges[0], x1 = edges[edges.length - 1];
  const yMax = Math.max(1, ...counts, ...(curve_y || [0]).map((v) => v || 0)) * 1.08;
  const sx = (x) => pad.l + ((x - x0) / (x1 - x0 || 1)) * iw;
  const sy = (y) => pad.t + ih - (y / yMax) * ih;
  let svg = `<svg viewBox="0 0 ${w} ${height}" role="img" aria-label="Histogram">`;
  for (let k = 0; k <= 4; k++) {
    const v = (yMax * k) / 4;
    svg += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${sy(v)}" y2="${sy(v)}" ${GRID}/><text x="${pad.l - 6}" y="${sy(v) + 4}" text-anchor="end" font-size="10" ${T}>${Math.round(v)}</text>`;
  }
  counts.forEach((c, i) => {
    const a = sx(edges[i]), b = sx(edges[i + 1]);
    svg += `<rect x="${a + 0.5}" y="${sy(c)}" width="${Math.max(0.5, b - a - 1)}" height="${Math.max(0, sy(0) - sy(c))}" style="fill:${color};fill-opacity:.75"><title>${fmt(edges[i])} – ${fmt(edges[i + 1])}: ${c}</title></rect>`;
  });
  if (curve_x && curve_y) {
    const d = curve_x.map((x, i) => `${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(curve_y[i] || 0).toFixed(1)}`).join('');
    svg += `<path d="${d}" fill="none" style="stroke:var(--text)" stroke-width="2.2" stroke-dasharray="1 0"/>`;
  }
  lines.forEach((ln) => {
    if (ln.x == null) return;
    const x = sx(ln.x);
    svg += `<line x1="${x}" x2="${x}" y1="${pad.t}" y2="${sy(0)}" style="stroke:${ln.color}" stroke-width="2" stroke-dasharray="5 4"/>
      <text x="${x + 4}" y="${pad.t + 12 + (ln.dy || 0)}" font-size="11" font-weight="600" style="fill:${ln.color}">${esc(ln.label)}</text>`;
  });
  const ticks = 5;
  for (let k = 0; k <= ticks; k++) {
    const v = x0 + ((x1 - x0) * k) / ticks;
    svg += `<text x="${sx(v)}" y="${height - pad.b + 16}" text-anchor="middle" font-size="10" ${T}>${fmt(v)}</text>`;
  }
  svg += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${sy(0)}" y2="${sy(0)}" ${AXIS}/>`;
  if (xLabel) svg += `<text x="${pad.l + iw / 2}" y="${height - 4}" text-anchor="middle" font-size="11" ${T2}>${esc(xLabel)}</text>`;
  container.innerHTML = svg + '</svg>';
}

/** Multi-series line chart. series: [{name, color, values:[y]|points:[[x,y]], dashed}] */
export function lineChart(container, series, { height = 200, xs = null, yLabel = '', xLabel = '', marker = null, logY = false, yMin = null, yMax = null } = {}) {
  const w = width(container);
  const pad = { l: 46, r: 14, t: 12, b: xLabel ? 40 : 26 };
  const iw = w - pad.l - pad.r, ih = height - pad.t - pad.b;
  const pts = series.map((s) => (s.points || s.values.map((y, i) => [xs ? xs[i] : i, y])).filter((p) => p[1] != null && Number.isFinite(p[1])));
  const all = pts.flat();
  if (!all.length) { container.innerHTML = '<div class="empty small">No data yet</div>'; return; }
  const tf = (y) => (logY ? Math.log10(Math.max(y, 1e-6)) : y);
  const X0 = Math.min(...all.map((p) => p[0])), X1 = Math.max(...all.map((p) => p[0]));
  let Y0 = yMin ?? Math.min(...all.map((p) => tf(p[1]))), Y1 = yMax ?? Math.max(...all.map((p) => tf(p[1])));
  if (Y0 === Y1) { Y0 -= 1; Y1 += 1; }
  const sx = (x) => pad.l + ((x - X0) / (X1 - X0 || 1)) * iw;
  const sy = (y) => pad.t + ih - ((tf(y) - Y0) / (Y1 - Y0)) * ih;
  let svg = `<svg viewBox="0 0 ${w} ${height}">`;
  for (let k = 0; k <= 4; k++) {
    const v = Y0 + ((Y1 - Y0) * k) / 4;
    const y = pad.t + ih - (k / 4) * ih;
    svg += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y}" y2="${y}" ${GRID}/><text x="${pad.l - 6}" y="${y + 4}" text-anchor="end" font-size="10" ${T}>${niceNum(logY ? 10 ** v : v)}</text>`;
  }
  const intX = all.every((p) => Number.isInteger(p[0])) && X1 - X0 <= 12;
  const xticks = intX ? Array.from({ length: X1 - X0 + 1 }, (_, k) => X0 + k) : Array.from({ length: 6 }, (_, k) => X0 + ((X1 - X0) * k) / 5);
  xticks.forEach((v) => {
    const lab = Number.isInteger(v) ? v : Math.abs(X1 - X0) >= 20 ? Math.round(v) : niceNum(v);
    svg += `<text x="${sx(v)}" y="${pad.t + ih + 16}" text-anchor="middle" font-size="10" ${T}>${lab}</text>`;
  });
  pts.forEach((p, i) => {
    const s = series[i];
    if (!p.length) return;
    const d = p.map(([x, y], j) => `${j ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join('');
    svg += `<path d="${d}" fill="none" style="stroke:${s.color}" stroke-width="${s.width || 2.2}" ${s.dashed ? 'stroke-dasharray="6 4"' : ''} stroke-linejoin="round"/>`;
    if (s.dots) p.forEach(([x, y]) => { svg += `<circle cx="${sx(x)}" cy="${sy(y)}" r="3.5" style="fill:${s.color}"><title>${s.name}: ${niceNum(y)} @ ${x}</title></circle>`; });
  });
  if (marker != null) svg += `<line x1="${sx(marker)}" x2="${sx(marker)}" y1="${pad.t}" y2="${pad.t + ih}" style="stroke:var(--amber)" stroke-width="2"/>`;
  svg += `<line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${pad.t + ih}" ${AXIS}/><line x1="${pad.l}" x2="${w - pad.r}" y1="${pad.t + ih}" y2="${pad.t + ih}" ${AXIS}/>`;
  if (xLabel) svg += `<text x="${pad.l + iw / 2}" y="${height - 4}" text-anchor="middle" font-size="11" ${T2}>${esc(xLabel)}</text>`;
  if (yLabel) svg += `<text x="12" y="${pad.t + ih / 2}" text-anchor="middle" font-size="11" ${T2} transform="rotate(-90 12 ${pad.t + ih / 2})">${esc(yLabel)}</text>`;
  const legend = series.filter((s) => s.name).map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('');
  container.innerHTML = svg + '</svg>' + (legend ? `<div class="legend" style="margin-top:4px">${legend}</div>` : '');
}

/** Correlation / confusion style matrix. */
export function heatMatrix(container, rowLabels, colLabels, matrix, { diverging = true, onClick = null, fmt = (v) => v.toFixed(2), max = null } = {}) {
  const m = max ?? Math.max(1e-9, ...matrix.flat().filter((v) => v != null).map(Math.abs));
  const color = (v) => {
    if (v == null) return 'var(--surface-2)';
    const t = Math.min(1, Math.abs(v) / m);
    if (!diverging) return `color-mix(in srgb, var(--course) ${Math.round(12 + t * 80)}%, var(--surface))`;
    return v >= 0 ? `color-mix(in srgb, #e8590c ${Math.round(t * 85)}%, var(--surface))` : `color-mix(in srgb, #3b5bdb ${Math.round(t * 85)}%, var(--surface))`;
  };
  const cols = colLabels.length;
  let html = `<div class="heat" style="grid-template-columns:minmax(90px,auto) repeat(${cols}, minmax(44px,1fr))"><div></div>`;
  html += colLabels.map((c) => `<div class="hh" title="${esc(c)}">${esc(c.length > 12 ? c.slice(0, 11) + '…' : c)}</div>`).join('');
  rowLabels.forEach((r, i) => {
    html += `<div class="hn" title="${esc(r)}">${esc(r)}</div>`;
    matrix[i].forEach((v, j) => {
      const strong = v != null && Math.abs(v) / m > 0.55;
      html += `<div class="hc" data-i="${i}" data-j="${j}" style="background:${color(v)};${strong ? 'color:#fff;' : 'color:var(--text);'}${onClick ? 'cursor:pointer;' : ''}" title="${esc(r)} × ${esc(colLabels[j])}: ${v == null ? '—' : fmt(v)}">${v == null ? '·' : fmt(v)}</div>`;
    });
  });
  container.innerHTML = html + '</div>';
  if (onClick) container.querySelectorAll('.hc').forEach((c) => c.addEventListener('click', () => onClick(+c.dataset.i, +c.dataset.j)));
}

/** Horizontal bar chart. rows: [{label, value, color?, note?}] */
export function hbars(container, rows, { fmt = niceNum, max = null } = {}) {
  const m = max ?? Math.max(1e-9, ...rows.map((r) => Math.abs(r.value)));
  container.innerHTML = rows.map((r) => `<div class="prob-row"><b class="small" title="${esc(r.label)}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.label)}</b>
    <div class="bar"><span style="width:${(Math.abs(r.value) / m) * 100}%;${r.color ? `background:${r.color}` : ''}"></span></div><span class="mono small">${fmt(r.value)}${r.note ? ` <span class="faint">${esc(r.note)}</span>` : ''}</span></div>`).join('');
}

/** Circle-per-amplitude view (magnitude = fill, line = phase). */
export function amplitudeCircles(container, amps, n) {
  container.innerHTML = `<div class="amp-grid">${amps.map(([re, im], i) => {
    const mag = Math.hypot(re, im);
    const ph = Math.atan2(im, re);
    const col = phaseColor(ph, 50);
    const r = 26 * mag;
    const x2 = 32 + 26 * mag * Math.cos(-ph), y2 = 32 + 26 * mag * Math.sin(-ph);
    return `<div class="amp-cell" title="|${i.toString(2).padStart(n, '0')}⟩: ${(mag * mag * 100).toFixed(1)}%, phase ${(ph * 180 / Math.PI).toFixed(0)}°">
      <svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="none" style="stroke:var(--line-strong)"/>
      <circle cx="32" cy="32" r="${r.toFixed(2)}" fill="${col}" fill-opacity=".6"/>
      ${mag > 1e-3 ? `<line x1="32" y1="32" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" style="stroke:var(--text)" stroke-width="2" stroke-linecap="round"/>` : ''}</svg>
      |${i.toString(2).padStart(n, '0')}⟩</div>`;
  }).join('')}</div>`;
}

/** Radar chart for topic mastery. values: [{label, value|null}] 0..100 */
export function radar(container, values, { size = 300 } = {}) {
  const c = size / 2;
  const R = c - 54;
  const n = values.length;
  const pt = (i, v) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [c + Math.cos(a) * R * v, c + Math.sin(a) * R * v];
  };
  let svg = `<svg viewBox="0 0 ${size} ${size}" style="max-width:${size}px;margin:auto">`;
  [0.25, 0.5, 0.75, 1].forEach((f) => { svg += `<polygon points="${values.map((_, i) => pt(i, f).join(',')).join(' ')}" fill="none" style="stroke:var(--line-strong)" stroke-dasharray="${f === 1 ? '0' : '3 3'}"/>`; });
  values.forEach((v, i) => {
    const [x, y] = pt(i, 1);
    const [lx, ly] = pt(i, 1.22);
    svg += `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" style="stroke:var(--line)"/><text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="10.5" ${T2}>${esc(v.label)}</text>`;
  });
  const poly = values.map((v, i) => pt(i, (v.value ?? 0) / 100).join(',')).join(' ');
  svg += `<polygon points="${poly}" style="fill:var(--course);fill-opacity:.22;stroke:var(--course)" stroke-width="2"/>`;
  values.forEach((v, i) => {
    if (v.value == null) return;
    const [x, y] = pt(i, v.value / 100);
    svg += `<circle cx="${x}" cy="${y}" r="4.5" style="fill:${v.value < 70 ? 'var(--red)' : 'var(--course)'}"><title>${esc(v.label)}: ${v.value}%</title></circle>`;
  });
  container.innerHTML = svg + '</svg>';
}

/** Simple vertical bar series (e.g. activity per day). */
export function bars(container, rows, { height = 160, color = 'var(--course)', fmtLabel = (l) => l } = {}) {
  const w = width(container);
  const pad = { l: 28, r: 6, t: 10, b: 26 };
  const iw = w - pad.l - pad.r, ih = height - pad.t - pad.b;
  const max = Math.max(1, ...rows.map((r) => r.value));
  const bw = iw / rows.length;
  let svg = `<svg viewBox="0 0 ${w} ${height}">`;
  [0, max].forEach((t) => {
    const y = pad.t + ih - (t / max) * ih;
    svg += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y}" y2="${y}" ${GRID}/><text x="${pad.l - 6}" y="${y + 4}" text-anchor="end" font-size="10" ${T}>${t}</text>`;
  });
  rows.forEach((r, i) => {
    const h = (r.value / max) * ih;
    const x = pad.l + i * bw + bw * 0.18;
    svg += `<rect x="${x}" y="${pad.t + ih - h}" width="${bw * 0.64}" height="${Math.max(h, 1)}" rx="3" style="fill:${color};opacity:${r.value ? 0.9 : 0.25}"><title>${esc(r.label)}: ${r.value}</title></rect>`;
    if (i % Math.ceil(rows.length / 7) === 0) svg += `<text x="${x + bw * 0.32}" y="${height - 6}" text-anchor="middle" font-size="10" ${T}>${esc(fmtLabel(r.label))}</text>`;
  });
  container.innerHTML = svg + '</svg>';
}

/** Ring (donut) progress with centred text. */
export function ring(value, { size = 92, stroke = 9, color = 'var(--course)', label = '', sub = '' } = {}) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  return `<svg class="level-ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" style="stroke:var(--line)" stroke-width="${stroke}" fill="none"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" style="stroke:${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round"
      stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - Math.max(0, Math.min(1, value)))}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="${sub ? '46%' : '52%'}" text-anchor="middle" dominant-baseline="middle" style="fill:var(--text)" font-family="Fraunces, Georgia, serif" font-weight="700" font-size="${size / 4}">${esc(label)}</text>
    ${sub ? `<text x="50%" y="68%" text-anchor="middle" font-size="${size / 9}" ${T}>${esc(sub)}</text>` : ''}
  </svg>`;
}

/** Semicircle gauge for a 0..1 score. */
export function gauge(value, label = 'score') {
  const v = Math.max(0, Math.min(1, value));
  const a = Math.PI * (1 - v);
  const x = 70 + 56 * Math.cos(a), y = 72 - 56 * Math.sin(a);
  const col = v >= 0.99 ? 'var(--green)' : v > 0.6 ? 'var(--amber)' : 'var(--red)';
  return `<svg class="gauge" viewBox="0 0 140 84">
    <path d="M14 72 A56 56 0 0 1 126 72" style="stroke:var(--line)" stroke-width="10" fill="none" stroke-linecap="round"/>
    ${v > 0.001 ? `<path d="M14 72 A56 56 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}" style="stroke:${col}" stroke-width="10" fill="none" stroke-linecap="round"/>` : ''}
    <text x="70" y="66" text-anchor="middle" style="fill:var(--text)" font-family="Fraunces, Georgia, serif" font-weight="700" font-size="20">${(v * 100).toFixed(1)}%</text>
    <text x="70" y="81" text-anchor="middle" font-size="9" ${T}>${esc(label)}</text></svg>`;
}

/** Heat colour for a 0..100 score. */
export function heatColor(v) {
  if (v == null) return 'var(--surface-2)';
  const hue = (v / 100) * 130;
  return `hsl(${hue.toFixed(0)} 70% 62%)`;
}
