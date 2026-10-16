// DL lab: Attention Lens — glowing arcs show where each word looks; a heatmap shows the full attention matrix.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons, debounce } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, label, loop, reducedMotion, heatmap, cmap, TAU } from './neon.js';

export const meta = {
  howto: [
    'Type a sentence (up to 14 words). Each word becomes a token with query, key and value vectors.',
    'Choose a head: similar-word, previous-token or positional. Each learns a different way to look around.',
    'Click a word to see where it looks: arc thickness = attention weight (each word’s weights sum to 1).',
    'Lower the temperature for sharp focus, raise it to spread attention out. Causal masking is how GPT reads.',
  ],
};
const HEADS = [['similar', 'Similar-word head'], ['previous', 'Previous-token head'], ['local', 'Positional head']];

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { sentence: 'the cat sat on the mat because the cat was tired', head: 'similar', temperature: 1, causal: false, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div><div class="card card-tight sticky small" data-explain></div></div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('focus')} Where does “<span data-word></span>” look?</h3><span class="faint tiny">click a word</span></div><div data-arcs style="cursor:pointer"></div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">
        <div class="card board neon-card"><div class="card-head"><h3>${icon('grid')} Attention matrix</h3><span class="faint tiny">rows = query word · columns = key word</span></div><div data-matrix></div></div>
        <div class="card"><div class="card-head"><h3>This head</h3></div><div class="metrics" data-metrics></div><p class="small muted" data-desc style="margin:10px 0 0"></p></div>
      </div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  controls($('[data-ctl]'), [
    { type: 'custom', key: 'sentence', render: (box, s, set) => {
      box.innerHTML = `<label>Sentence</label><textarea class="input" rows="3">${esc(s.sentence)}</textarea>`;
      box.querySelector('textarea').addEventListener('input', debounce((e) => set(e.target.value), 400));
    } },
    { type: 'seg', key: 'head', label: 'Attention head', options: HEADS.map(([k, l]) => [k, l.split(' ')[0]]) },
    { type: 'slider', key: 'temperature', label: 'Temperature', min: 0.2, max: 3, step: 0.1, fmt: (v) => v.toFixed(1) },
    { type: 'toggle', key: 'causal', label: 'Causal mask (GPT-style: only look back)' },
  ], st, (k, v, live) => { if (live && k === 'temperature') return; if (k === 'head') { paint(); return; } run(); }, { lock });

  const arcs = new Plot($('[data-arcs]'), { height: 300 });
  const matrix = new Plot($('[data-matrix]'), { aspect: 0.85 });
  let res = null, sel = 0, stop = null;

  const tokenPos = (w, h) => {
    const n = res.tokens.length;
    return res.tokens.map((_, i) => [40 + (i / Math.max(1, n - 1)) * (w - 80), h - 60]);
  };

  function drawArcs(t) {
    arcs.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#ae3ec9', stars: 80, t, grid: false });
      if (!res) return;
      const P = tokenPos(w, h);
      const W = res.heads[st.head].weights;
      // faint web of every strong link
      W.forEach((row, i) => row.forEach((a, j) => {
        if (i === sel || a < 0.25 || i === j) return;
        const [x1, y1] = P[i], [x2, y2] = P[j], mx = (x1 + x2) / 2, top = y1 - Math.abs(x2 - x1) * 0.45 - 10;
        ctx.strokeStyle = `rgba(218,119,242,${a * 0.18})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, top, x2, y2); ctx.stroke();
      }));
      // selected word's attention
      W[sel].forEach((a, j) => {
        if (a < 0.01) return;
        const [x1, y1] = P[sel], [x2, y2] = P[j];
        const col = cmap('neon', 0.45 + 0.55 * a);
        if (j === sel) {
          ctx.save(); glow(ctx, col, 20); ctx.strokeStyle = col; ctx.lineWidth = 1 + 10 * a; ctx.beginPath(); ctx.arc(x1, y1 - 26, 14, 0, TAU); ctx.stroke(); ctx.restore();
          return;
        }
        const mx = (x1 + x2) / 2, top = y1 - Math.abs(x2 - x1) * 0.55 - 20;
        ctx.save(); glow(ctx, col, 10 + 20 * a); ctx.strokeStyle = col; ctx.lineWidth = 0.8 + 12 * a; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x1, y1 - 12); ctx.quadraticCurveTo(mx, top, x2, y2 - 12); ctx.stroke(); ctx.restore();
        if (!reducedMotion()) { // sparks flowing toward the attended word
          for (let s = 0; s < 3; s++) {
            const f = ((t / 1100) + s / 3) % 1;
            const bx = (1 - f) ** 2 * x1 + 2 * (1 - f) * f * mx + f * f * x2;
            const by = (1 - f) ** 2 * (y1 - 12) + 2 * (1 - f) * f * top + f * f * (y2 - 12);
            ctx.save(); glow(ctx, '#fff', 12); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, 1.2 + 2.5 * a, 0, TAU); ctx.fill(); ctx.restore();
          }
        }
        label(ctx, `${Math.round(a * 100)}%`, mx, top / 2 + y1 / 2 - 4, { align: 'center', size: 10, color: col });
      });
      // tokens
      res.tokens.forEach((tok, i) => {
        const [x, y] = P[i];
        const a = W[sel][i];
        ctx.save();
        if (i === sel) glow(ctx, '#ffffff', 26); else if (a > 0.1) glow(ctx, cmap('neon', 0.5 + a / 2), 16);
        ctx.fillStyle = i === sel ? '#ffffff' : a > 0.1 ? cmap('neon', 0.5 + a / 2) : 'rgba(220,210,255,.55)';
        ctx.font = `${i === sel ? 800 : 600} ${i === sel ? 16 : 14}px Inter, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(tok, x, y + 14);
        ctx.restore();
        ctx.fillStyle = `rgba(218,119,242,${0.25 + a * 0.75})`;
        ctx.fillRect(x - 14, y + 30, 28 * Math.max(0.05, a), 3);
      });
    });
  }

  function paint() {
    if (!res) return;
    sel = Math.min(sel, res.tokens.length - 1);
    const H = res.heads[st.head];
    $('[data-word]').textContent = res.tokens[sel];
    matrix.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#ae3ec9', stars: 0, grid: false });
      const n = res.tokens.length, pad = 70, size = Math.min(w - pad - 10, h - pad - 10), cs = size / n;
      heatmap(ctx, H.weights, pad, 10, size, size, { map: 'magma', min: 0, max: 1 });
      res.tokens.forEach((tok, i) => {
        label(ctx, tok, pad - 6, 10 + (i + 0.5) * cs, { align: 'right', size: Math.min(11, cs * 0.7), color: i === sel ? '#fff' : '#d0bfff' });
        ctx.save(); ctx.translate(pad + (i + 0.5) * cs, 16 + size); ctx.rotate(-Math.PI / 3);
        label(ctx, tok, 0, 0, { align: 'right', size: Math.min(11, cs * 0.7), color: '#d0bfff' }); ctx.restore();
      });
      ctx.save(); glow(ctx, '#fff', 12); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(pad, 10 + sel * cs, size, cs); ctx.restore();
    });
    const top = H.weights[sel].map((a, j) => [a, j]).sort((x, y) => y[0] - x[0]);
    $('[data-metrics]').innerHTML = metric('Top focus', `“${esc(res.tokens[top[0][1]])}”`) + metric('Weight', `${Math.round(top[0][0] * 100)}%`) + metric('Entropy', `${H.entropy[sel]} bits`) + metric('Tokens', res.tokens.length);
    $('[data-desc]').innerHTML = `${esc(H.description)}. Temperature ${res.temperature}${res.causal ? ' · causal mask on' : ''}.`;
    setLabContext('attention', 'Attention lens', [`Sentence tokens: ${res.tokens.join(' | ')}`, `Head: ${HEADS.find((x) => x[0] === st.head)[1]}, temperature ${res.temperature}, causal ${res.causal}`,
      `Selected word "${res.tokens[sel]}" attends most to: ${top.slice(0, 3).map(([a, j]) => `"${res.tokens[j]}" ${Math.round(a * 100)}%`).join(', ')}`,
      `Each head's focus per token: ${Object.entries(res.heads).map(([k, v]) => `${k}: ${v.focus.map((j) => res.tokens[j]).join(' ')}`).join(' / ')}`]);
  }

  async function run() {
    try { res = await api.lab('dl/attention', { sentence: st.sentence, temperature: st.temperature, causal: st.causal }, store.user?.id); } catch (e) { toast(esc(e.message), 'error'); return; }
    if (sel === 0 && res.tokens.length > 8) sel = res.tokens.lastIndexOf('cat') > 0 ? res.tokens.lastIndexOf('cat') : res.tokens.length - 1;
    paint();
    $('[data-explain]').innerHTML = 'Each word makes a <b>query</b> (“what am I looking for?”) and a <b>key</b> (“what do I contain?”). softmax(QKᵀ/√d) turns query–key matches into weights that sum to 1 — then the word mixes in the others’ values. Real models run dozens of heads in parallel.';
  }
  arcs.canvas.addEventListener('click', (e) => {
    if (!res) return;
    const [x] = arcs.local(e);
    const P = tokenPos(arcs.w, arcs.h);
    let best = 0, bd = Infinity;
    P.forEach(([px], i) => { const d = Math.abs(px - x); if (d < bd) { bd = d; best = i; } });
    sel = best; paint();
  });
  stop = loop(drawArcs);
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { stop?.(); arcs.dispose(); matrix.dispose(); } };
}
