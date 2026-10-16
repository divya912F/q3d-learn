// Underline glossary terms inside lesson text; tap one to see its definition without leaving the page.
import { api } from '../api.js';
import { esc, markdown, icon } from '../ui.js';
import { popover } from './settings.js';

const cache = {};
export async function glossaryFor(course) {
  cache[course] ||= api.glossary(course).catch(() => []);
  return cache[course];
}

/** Wrap the first mention of each term inside `root` (skips formulas, code, links and buttons). */
export async function highlightTerms(root, course, { onOpenLesson } = {}) {
  const terms = await glossaryFor(course);
  if (!terms.length) return 0;
  const patterns = [];
  terms.forEach((g) => g.match.forEach((m) => patterns.push([m, g])));
  patterns.sort((a, b) => b[0].length - a[0].length); // longest phrase wins
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b(${patterns.map(([m]) => escRe(m)).join('|')})(?![\\w-])`, 'i');
  const byMatch = new Map(patterns.map(([m, g]) => [m, g]));
  const used = new Set();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement.closest('.formula, code, pre, a, button, .katex, .gloss, h1, h2, h3, h4') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  let count = 0;
  for (const node of nodes) {
    let text = node.nodeValue;
    let m;
    let cur = node;
    while ((m = re.exec(text))) {
      const g = byMatch.get(m[1].toLowerCase());
      if (!g || used.has(g.id)) { // already marked: keep scanning after this match
        const rest = cur.splitText(m.index + m[0].length);
        cur = rest; text = rest.nodeValue; continue;
      }
      used.add(g.id);
      const after = cur.splitText(m.index);
      const rest = after.splitText(m[0].length);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gloss';
      btn.dataset.term = g.id;
      btn.textContent = after.nodeValue;
      after.replaceWith(btn);
      btn.addEventListener('click', () => {
        const p = popover(btn, `<div class="pop-head"><b>${icon('abc')} ${esc(g.term)}</b><a class="tiny" href="#/glossary?q=${encodeURIComponent(g.term)}">glossary →</a></div>
          <div class="small gloss-def">${markdown(g.text)}</div>
          ${g.lesson && onOpenLesson ? `<button class="btn btn-ghost btn-sm" data-go>${icon('book')} Open the lesson</button>` : ''}`, { width: 320 });
        const r = btn.getBoundingClientRect();
        p.style.left = `${Math.max(8, Math.min(window.innerWidth - 328, r.left))}px`;
        p.querySelector('[data-go]')?.addEventListener('click', () => onOpenLesson(g.lesson));
      });
      count++;
      cur = rest; text = rest.nodeValue;
    }
  }
  return count;
}
