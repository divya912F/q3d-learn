// Blockchain lab: Merkle tree explorer — hash transactions up to one root, highlight a proof, watch tampering cascade.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons, debounce } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, label, loop, reducedMotion, TAU, lerp, rgba } from './neon.js';

export const meta = {
  howto: [
    'Each transaction is hashed (bottom row); pairs of hashes are hashed together, level by level, up to one Merkle root.',
    'Pick a transaction to prove: the gold nodes are the only hashes a light client needs — log₂ N of them.',
    'Switch on tampering and change one transaction: red hashes spread all the way up to the root.',
  ],
};
const TXS = ['Aarav→Diya 5', 'Diya→Kabir 2', 'Kabir→Meera 1', 'Meera→Rohan 3', 'Rohan→Saanvi 4', 'Saanvi→Vihaan 1', 'Vihaan→Ishita 2', 'Ishita→Arjun 6',
  'Arjun→Ananya 3', 'Ananya→Tara 2', 'Tara→Neel 5', 'Neel→Aarav 1', 'Diya→Meera 7', 'Kabir→Rohan 2', 'Saanvi→Arjun 4', 'Ishita→Tara 1'];

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { count: 8, prove: 2, tamper: preset.tamper != null, tamperIdx: preset.tamper ?? 2, tamperText: 'Kabir→Meera 100', ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div><div class="card card-tight sticky small" data-explain></div></div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('tree')} Merkle tree</h3><div class="legend"><span><i style="background:#69db7c"></i>proven tx</span><span><i style="background:#ffd43b"></i>proof hashes</span><span><i style="background:#ff3b5c"></i>tampered</span></div></div><div data-plot></div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
        <div class="card"><div class="card-head"><h3>Proof for one transaction</h3></div><div class="metrics" data-metrics></div><div data-proof class="small" style="margin-top:10px"></div></div>
        <div class="card"><div class="card-head"><h3>Root</h3></div><div data-root class="small mono" style="word-break:break-all"></div></div>
      </div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  controls($('[data-ctl]'), [
    { type: 'slider', key: 'count', label: 'Transactions', min: 2, max: 16 },
    { type: 'custom', key: 'prove', render: (box, s, set) => {
      box.innerHTML = `<label>Prove transaction</label><select class="input">${TXS.slice(0, s.count).map((t, i) => `<option value="${i}" ${i === +s.prove ? 'selected' : ''}>#${i} ${esc(t)}</option>`).join('')}</select>`;
      box.querySelector('select').addEventListener('change', (e) => set(+e.target.value));
    } },
    { type: 'toggle', key: 'tamper', label: 'Tamper with a transaction' },
    { type: 'custom', key: 'tamperIdx', show: (s) => s.tamper, render: (box, s, set) => {
      box.innerHTML = `<label>Transaction to change</label><select class="input">${TXS.slice(0, s.count).map((t, i) => `<option value="${i}" ${i === +s.tamperIdx ? 'selected' : ''}>#${i} ${esc(t)}</option>`).join('')}</select>`;
      box.querySelector('select').addEventListener('change', (e) => set(+e.target.value));
    } },
    { type: 'text', key: 'tamperText', label: 'New text', show: (s) => s.tamper },
  ], st, (k, v, live) => { if (live && k === 'count') return; if (st.prove >= st.count) st.prove = 0; if (st.tamperIdx >= st.count) st.tamperIdx = 0; run(); }, { lock });

  const plot = new Plot($('[data-plot]'), { aspect: 0.5 });
  let res = null, stop = null, tTamper = 0, tNow = 0;

  function draw(t) {
    plot.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#d49b00', stars: 70, t });
      if (!res) return;
      const L = res.levels, depth = L.length;
      const pos = (lvl, i) => {
        const n = L[lvl].length;
        return [30 + ((i + 0.5) / n) * (w - 60), h - 40 - (lvl / Math.max(1, depth - 1)) * (h - 80)];
      };
      // proof bookkeeping
      const proofSet = new Set();
      let idx = res.prove;
      const pathSet = new Set();
      for (let l = 0; l < depth; l++) { pathSet.add(`${l}:${idx}`); if (l < depth - 1) proofSet.add(`${l}:${idx ^ 1}`); idx = Math.floor(idx / 2); }
      const changed = new Set();
      if (res.tamper) {
        const k = reducedMotion() ? 99 : (t - tTamper) / 450; // the red wave climbs one level every 0.45 s
        res.tamper.changed.forEach((ids, l) => { if (l <= k) ids.forEach((i) => changed.add(`${l}:${i}`)); });
      }
      // edges
      for (let l = 0; l < depth - 1; l++) {
        L[l].forEach((_, i) => {
          const [x1, y1] = pos(l, i), [x2, y2] = pos(l + 1, Math.floor(i / 2));
          const bad = changed.has(`${l}:${i}`);
          const onPath = pathSet.has(`${l}:${i}`);
          ctx.save(); glow(ctx, bad ? '#ff3b5c' : onPath ? '#ffffff' : '#ffd43b', bad || onPath ? 16 : 6);
          ctx.strokeStyle = bad ? '#ff3b5c' : onPath ? 'rgba(255,255,255,.9)' : 'rgba(255,212,59,.35)';
          ctx.lineWidth = bad || onPath ? 2.4 : 1.2;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(x1, (y1 + y2) / 2, x2, (y1 + y2) / 2, x2, y2); ctx.stroke(); ctx.restore();
        });
      }
      // energy climbing the proof path
      if (!reducedMotion()) {
        let pi = res.prove;
        for (let l = 0; l < depth - 1; l++) {
          const f = ((t / 900) - l * 0.25) % 1;
          if (f > 0) {
            const [x1, y1] = pos(l, pi), [x2, y2] = pos(l + 1, Math.floor(pi / 2));
            ctx.save(); glow(ctx, '#fff', 18); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(lerp(x1, x2, f), lerp(y1, y2, f), 3, 0, TAU); ctx.fill(); ctx.restore();
          }
          pi = Math.floor(pi / 2);
        }
      }
      // nodes
      const hashes = res.tamper && changed.size ? res.tamper.levels : L;
      L.forEach((row, l) => row.forEach((hsh, i) => {
        const [x, y] = pos(l, i);
        const key = `${l}:${i}`;
        const isRoot = l === depth - 1;
        let col = '#ffe066';
        if (pathSet.has(key) && l === 0) col = '#69db7c';
        if (proofSet.has(key)) col = '#ffd43b';
        if (changed.has(key)) col = '#ff3b5c';
        const r = isRoot ? 20 : l === 0 ? 13 : 11;
        ctx.save(); glow(ctx, col, proofSet.has(key) || isRoot || changed.has(key) ? 24 : 8);
        ctx.fillStyle = proofSet.has(key) || isRoot || changed.has(key) || (pathSet.has(key) && l === 0) ? col : rgba('#ffe066', 0.35);
        ctx.beginPath();
        if (isRoot) { for (let s = 0; s < 6; s++) { const a = (s / 6) * TAU + t / 2000; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
        else ctx.arc(x, y, r, 0, TAU);
        ctx.fill(); ctx.restore();
        const shown = (changed.has(key) ? hashes[l][i] : hsh).slice(0, 4);
        label(ctx, shown, x, y, { align: 'center', size: isRoot ? 10 : 8.5, weight: 700, color: '#1b1500', font: 'JetBrains Mono, monospace' });
        if (l === 0) label(ctx, `#${i}`, x, y + 22, { align: 'center', size: 9, color: 'rgba(255,240,200,.75)' });
      }));
      label(ctx, 'ROOT', pos(depth - 1, 0)[0], pos(depth - 1, 0)[1] - 30, { align: 'center', size: 11, weight: 800, color: changed.has(`${depth - 1}:0`) ? '#ff6b81' : '#fff3bf' });
    });
  }

  async function run() {
    try {
      res = await api.lab('chain/merkle', { transactions: TXS.slice(0, st.count), prove: st.prove, tamper: st.tamper ? st.tamperIdx : null, tamper_text: st.tamperText }, store.user?.id);
    } catch (e) { toast(esc(e.message), 'error'); return; }
    tTamper = tNow;
    $('[data-metrics]').innerHTML = metric('Proof hashes', res.proof_size, 'good') + metric('Transactions', res.transactions.length) + metric('Verified', res.proof_valid ? 'yes' : 'no', res.proof_valid ? 'good' : 'bad');
    $('[data-proof]').innerHTML = `<p class="muted" style="margin:0 0 6px">To prove <b>#${res.prove} “${esc(res.transactions[res.prove])}”</b>, send these ${res.proof_size} sibling hashes (not all ${res.transactions.length} transactions):</p>
      <ol class="mono tiny" style="margin:0;padding-left:18px">${res.proof.map((p) => `<li>${p.side} · ${p.hash.slice(0, 24)}…</li>`).join('')}</ol>`;
    $('[data-root]').innerHTML = res.tamper ? `<div>original: <span style="color:var(--green)">${res.root}</span></div><div style="margin-top:6px">after tampering: <span style="color:var(--red)">${res.tamper.root}</span></div>
      <p class="muted" style="font-family:var(--font-body);margin:8px 0 0">${res.tamper.changed.reduce((s, x) => s + x.length, 0)} hashes changed — one per level, all the way to the root.</p>` : res.root;
    $('[data-explain]').innerHTML = `With ${res.transactions.length} transactions a proof needs only <b>${res.proof_size}</b> hashes. For a block of 4,000 transactions it would be just 12 — that's how phone wallets verify payments.`;
    setLabContext('merkle', 'Merkle tree', [`${res.transactions.length} transactions, Merkle root ${res.root.slice(0, 20)}…`, `Proof for transaction #${res.prove} needs ${res.proof_size} sibling hashes; proof verifies: ${res.proof_valid}`,
      res.tamper ? `Transaction #${res.tamper.index} tampered to "${res.tamper.text}" → root changed to ${res.tamper.root.slice(0, 20)}…` : 'No tampering'].filter(Boolean));
  }
  stop = loop((t) => { tNow = t; draw(t); });
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { stop?.(); plot.dispose(); } };
}
