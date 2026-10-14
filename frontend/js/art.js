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
    default:
      return '';
  }
}
