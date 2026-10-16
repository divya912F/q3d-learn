// Small hand-drawn-style illustrations for each course (inherit currentColor).
const S = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';

export function courseArt(id) {
  switch (id) {
    case 'quantum':
      return `<svg viewBox="0 0 140 110" aria-hidden="true"><g ${S} stroke-width="2.4">
        <circle cx="70" cy="55" r="40"/><ellipse cx="70" cy="55" rx="40" ry="13" stroke-dasharray="5 5" opacity=".8"/>
        <path d="M70 10v90" stroke-dasharray="3 5" opacity=".7"/><path d="M70 55 98 26" stroke-width="3.4"/><circle cx="98" cy="26" r="5" fill="currentColor"/>
        <text x="64" y="8" font-size="10" fill="currentColor" stroke="none" font-family="monospace">|0⟩</text>
        <path d="M14 96c10-6 18 6 28 0" opacity=".7"/></g></svg>`;
    case 'ml':
      return `<svg viewBox="0 0 140 110" aria-hidden="true"><g ${S} stroke-width="2.2">
        ${[[20, 30], [20, 55], [20, 80]].map(([x, y]) => [[62, 22], [62, 48], [62, 74], [62, 98]].map(([a, b]) => `<path d="M${x} ${y}L${a} ${b}" opacity=".45"/>`).join('')).join('')}
        ${[[62, 22], [62, 48], [62, 74], [62, 98]].map(([x, y]) => [[104, 42], [104, 70]].map(([a, b]) => `<path d="M${x} ${y}L${a} ${b}" opacity=".45"/>`).join('')).join('')}
        ${[[20, 30], [20, 55], [20, 80], [62, 22], [62, 48], [62, 74], [62, 98], [104, 42], [104, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5" fill="currentColor" fill-opacity=".25"/>`).join('')}
        <path d="M118 30c8 10 8 40 0 52" stroke-dasharray="4 4"/></g></svg>`;
    case 'ds':
      return `<svg viewBox="0 0 140 110" aria-hidden="true"><g ${S} stroke-width="2.4">
        <path d="M12 96h112M12 96V14"/><rect x="22" y="62" width="14" height="34" fill="currentColor" fill-opacity=".25"/><rect x="42" y="40" width="14" height="56" fill="currentColor" fill-opacity=".25"/>
        <rect x="62" y="52" width="14" height="44" fill="currentColor" fill-opacity=".25"/><rect x="82" y="28" width="14" height="68" fill="currentColor" fill-opacity=".25"/>
        <path d="M18 70 49 44l20 10 32-30" stroke-width="2.8"/><circle cx="110" cy="26" r="13"/><path d="m119 35 12 12" stroke-width="4"/></g></svg>`;
    case 'ai':
      return `<svg viewBox="0 0 140 110" aria-hidden="true"><g ${S} stroke-width="2.4">
        <rect x="40" y="30" width="60" height="46" rx="12" fill="currentColor" fill-opacity=".18"/><path d="M70 30V16"/><circle cx="70" cy="13" r="4" fill="currentColor"/>
        <circle cx="56" cy="50" r="5" fill="currentColor"/><circle cx="84" cy="50" r="5" fill="currentColor"/><path d="M58 64q12 8 24 0"/>
        <path d="M40 54H28M100 54h12"/><path d="M14 98l18-10 18 6 20-12 20 8 18-10 18 6" stroke-dasharray="1 0" opacity=".8"/>
        ${[[14, 98], [32, 88], [50, 94], [70, 82], [90, 90], [108, 80], [126, 86]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="currentColor"/>`).join('')}</g></svg>`;
    case 'dsa':
      return `<svg viewBox="0 0 140 110" aria-hidden="true"><g ${S} stroke-width="2.4">
        ${[12, 30, 20, 44, 36, 58, 50, 70].map((hh, i) => `<rect x="${10 + i * 15}" y="${100 - hh}" width="10" height="${hh}" rx="2" fill="currentColor" fill-opacity="${0.15 + i * 0.08}"/>`).join('')}
        <circle cx="100" cy="18" r="6" fill="currentColor" fill-opacity=".3"/><circle cx="84" cy="34" r="5"/><circle cx="116" cy="34" r="5"/><path d="M96 22l-8 8M104 22l8 8"/></g></svg>`;
    case 'cyber':
      return `<svg viewBox="0 0 140 110" aria-hidden="true"><g ${S} stroke-width="2.4">
        <path d="M70 10l34 13v26c0 24-15 38-34 46-19-8-34-22-34-46V23z" fill="currentColor" fill-opacity=".16"/>
        <rect x="56" y="48" width="28" height="22" rx="4" fill="currentColor" fill-opacity=".3"/><path d="M61 48v-6a9 9 0 0 1 18 0v6"/><circle cx="70" cy="59" r="3" fill="currentColor"/>
        <text x="10" y="102" font-size="10" fill="currentColor" stroke="none" font-family="monospace" opacity=".8">KHOOR</text><text x="98" y="102" font-size="10" fill="currentColor" stroke="none" font-family="monospace" opacity=".8">0x7f</text></g></svg>`;
    case 'chain':
      return `<svg viewBox="0 0 140 110" aria-hidden="true"><g ${S} stroke-width="2.4">
        ${[[14, 52], [52, 36], [90, 52]].map(([x, y]) => `<path d="M${x} ${y + 8}l16-8 16 8v18l-16 8-16-8z" fill="currentColor" fill-opacity=".2"/><path d="M${x} ${y + 8}l16 8 16-8M${x + 16} ${y + 16}v18"/>`).join('')}
        <path d="M46 66h8M84 66h8" stroke-width="3.4"/><text x="40" y="104" font-size="10" fill="currentColor" stroke="none" font-family="monospace">0000a3f…</text></g></svg>`;
    case 'dl':
      return `<svg viewBox="0 0 140 110" aria-hidden="true"><g ${S} stroke-width="2.2">
        <rect x="10" y="20" width="44" height="44" rx="3" fill="currentColor" fill-opacity=".12"/>
        ${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${16 + c * 9}" y="${26 + r * 9}" width="9" height="9" fill="currentColor" fill-opacity="${0.15 + ((r + c) % 3) * 0.2}"/>`).join('')).join('')}
        <path d="M54 34l26-8M54 50l26 6" stroke-dasharray="3 4"/><rect x="80" y="18" width="22" height="22" rx="2" fill="currentColor" fill-opacity=".3"/><rect x="80" y="46" width="22" height="22" rx="2" fill="currentColor" fill-opacity=".2"/>
        <circle cx="122" cy="44" r="9" fill="currentColor" fill-opacity=".3"/><path d="M102 29l11 10M102 57l11-8"/>
        <path d="M10 92c14-14 26 10 40-4s26 10 40-4 26 10 40-4" opacity=".8"/></g></svg>`;
    default:
      return '';
  }
}
