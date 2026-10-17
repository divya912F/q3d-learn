// DL lab: Word embeddings — a galaxy of words where direction carries meaning. king − man + woman ≈ queen.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, glowDot, glowLine, label, loop, reducedMotion, project, orbit, hue, rgba } from './neon.js';

export const meta = {
  howto: [
    'Every word is a point in a high-dimensional space, squashed to 3-D here. Words with similar meaning sit close together — drag to orbit the galaxy.',
    'Click any word to see its nearest neighbours by cosine similarity.',
    'Analogies are directions: king − man + woman lands near queen. Set A, B, C and watch the arrows and the predicted answer.',
    'Colours group the words (people, animals, food, places…). Add noise to see meaning blur.',
  ],
};
const GROUP_C = { people: '#f06595', animals: '#ffa94d', food: '#69db7c', places: '#4dabf7', tech: '#b197fc', verbs: '#ffd43b', other: '#868e96' };

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { a: 'king', b: 'man', c: 'woman', noise: 0.06, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <button class="btn btn-course" data-solve>${icon('sigma')} Solve analogy</button>
      <div class="card card-tight sticky small" data-explain></div></div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('sphere')} Word galaxy</h3><span class="faint tiny">drag to orbit · click a word</span></div><div data-galaxy></div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
        <div class="card"><div class="card-head"><h3>Nearest to <span data-sel style="color:var(--course)"></span></h3></div><div data-near class="small"></div></div>
        <div class="card"><div class="card-head"><h3>${icon('sigma')} Analogy</h3></div><div data-analogy class="small"></div></div>
      </div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  let res = null, sel = 'king', stop = null;
  const view = { yaw: 0.5, pitch: 0.3 };
  const galaxy = new Plot($('[data-galaxy]'), { height: 420 });
  const detach = orbit(galaxy.canvas, view);

  const ctl = controls($('[data-ctl]'), [
    { type: 'select', key: 'a', label: 'A', options: [] },
    { type: 'select', key: 'b', label: '− B', options: [] },
    { type: 'select', key: 'c', label: '+ C', options: [] },
    { type: 'slider', key: 'noise', label: 'Embedding noise', min: 0, max: 0.5, step: 0.02 },
  ], st, (k, v, live) => { if (k === 'noise') { if (!live) run(); return; } solve(); }, { lock });

  function fillSelects() {
    ['a', 'b', 'c'].forEach((k) => {
      const seg = $(`[data-k="${k}"]`); if (!seg) return;
      seg.innerHTML = res.vocab.map((w) => `<option ${w === st[k] ? 'selected' : ''}>${w}</option>`).join('');
    });
  }

  let pts3 = [];
  function draw(t) {
    if (!view.dragging && !reducedMotion()) view.yaw += 0.0025;
    galaxy.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#7048e8', stars: 80, t });
      if (!res) return;
      const o = { yaw: view.yaw, pitch: view.pitch, scale: Math.min(w, h) * 0.34, cx: w / 2, cy: h / 2 };
      pts3 = res.words.map((wd) => { const [x, y, z] = project(wd.pos, o); return { ...wd, x, y, z }; }).sort((a, b) => b.z - a.z);
      // analogy arrows a→b and c→answer
      if (res.analogy) {
        const get = (name) => res.words.find((wd) => wd.word === name);
        const P = (name) => { const g = get(name); return g ? project(g.pos, o) : null; };
        const pa = P(res.analogy.a), pb = P(res.analogy.b), pc = P(res.analogy.c), pans = P(res.analogy.answer);
        if (pa && pb) glowLine(ctx, [[pb[0], pb[1]], [pa[0], pa[1]]], 'rgba(255,224,102,.7)', 2, 10);
        if (pc && pans) glowLine(ctx, [[pc[0], pc[1]], [pans[0], pans[1]]], 'rgba(105,230,190,.8)', 2.4, 14);
      }
      for (const p of pts3) {
        const depth = (p.z + 1.5) / 3, r = 2 + 3 * depth;
        const key = [st.a, st.b, st.c].includes(p.word) || p.word === sel || (res.analogy && p.word === res.analogy.answer);
        glowDot(ctx, p.x, p.y, key ? r + 2 : r, GROUP_C[p.group] || '#aaa', key ? 20 : 6);
        if (key || depth > 0.72) label(ctx, p.word, p.x + r + 3, p.y, { size: key ? 12 : 10, weight: key ? 800 : 600, color: key ? '#fff' : rgba('#dbe4ff', 0.4 + 0.5 * depth) });
      }
    });
  }

  galaxy.canvas.addEventListener('click', (e) => {
    if (view.dragging) return;
    const [mx, my] = galaxy.local(e);
    let best = null, bd = 400;
    for (const p of pts3) { const d = (p.x - mx) ** 2 + (p.y - my) ** 2; if (d < bd) { bd = d; best = p; } }
    if (best) selectWord(best.word);
  });

  async function selectWord(word) {
    sel = word;
    $('[data-sel]').textContent = word;
    let r;
    try { r = await api.lab('dl/embeddings', { word, a: st.a, b: st.b, c: st.c, noise: st.noise }, store.user?.id); } catch { return; }
    $('[data-near]').innerHTML = r.neighbours.map((n) => `<div class="row-between"><span>${esc(n.word)}</span><span class="faint">${n.cos.toFixed(2)}</span><div class="progress" style="flex:1;margin-left:8px;max-width:90px"><span style="width:${Math.max(0, n.cos) * 100}%"></span></div></div>`).join('');
  }

  function solve() {
    if (!res?.analogy) return;
    const an = res.analogy;
    $('[data-analogy]').innerHTML = `<div style="font-size:1.05rem"><b>${esc(an.a)}</b> − <b>${esc(an.b)}</b> + <b>${esc(an.c)}</b> ≈ <b style="color:var(--green)">${esc(an.answer)}</b></div>
      <div style="margin-top:8px">${an.results.map((r, i) => `<div class="row-between"><span>${i + 1}. ${esc(r.word)}</span><span class="faint">${r.cos.toFixed(3)}</span></div>`).join('')}</div>`;
    setLabContext('embeddings', 'Word embeddings', [`${res.words.length} words, noise ${res.noise}, 3-D view keeps ${(res.explained_3d * 100).toFixed(0)}% of variance`,
      `Analogy ${an.a} − ${an.b} + ${an.c} ≈ ${an.answer} (top: ${an.results.map((r) => r.word).join(', ')})`, `Selected word ${sel}`]);
  }

  async function run() {
    try { res = await api.lab('dl/embeddings', { word: sel, a: st.a, b: st.b, c: st.c, noise: st.noise }, store.user?.id); } catch (e) { toast(esc(e.message), 'error'); return; }
    fillSelects();
    solve();
    await selectWord(sel in Object.fromEntries(res.vocab.map((w) => [w, 1])) ? sel : res.vocab[0]);
    $('[data-explain]').innerHTML = `Meaning lives in <b>directions</b>, not positions. The step from “man” to “king” (add royalty) is roughly the same step as “woman” to “queen”, so arithmetic on the vectors solves analogies. Real models like word2vec learn these ${res.dims.length}-plus dimensions from billions of words; here they are hand-built so you can see them. This 3-D view keeps ${(res.explained_3d * 100).toFixed(0)}% of the structure.`;
  }
  $('[data-solve]').addEventListener('click', solve);
  stop = loop(draw);
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { stop?.(); detach(); galaxy.dispose(); } };
}
