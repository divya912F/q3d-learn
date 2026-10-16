// Cyber lab: Hash avalanche (256 glowing bits flipping) + password strength with a spinning vault dial.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons, debounce } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, noGlow, label, loop, reducedMotion, TAU, rgba, cmap } from './neon.js';

export const meta = {
  howto: [
    'Hash avalanche: type two inputs that differ by one character — about half of the 256 output bits flip.',
    'Pink cells are the bits that changed. That is why a hash makes a perfect fingerprint.',
    'Password strength: type a password (it is never stored or logged) and see its entropy, warnings and crack times.',
    'Every 10 bits of entropy add a ring to the vault — and multiply the attacker’s work by about 1000.',
  ],
};

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { mode: preset.password ? 'password' : 'hash', text: 'Q-3D Learn', compare: 'Q-3D Learm', algorithm: 'sha256', password: 'Password@123', ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div><div class="card card-tight sticky small" data-explain></div></div>
    <div class="stack" style="min-width:0" data-main></div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  const ctl = controls($('[data-ctl]'), [
    { type: 'seg', key: 'mode', label: 'Experiment', options: [['hash', 'Hash avalanche'], ['password', 'Password strength']] },
    { type: 'text', key: 'text', label: 'Input A', show: (s) => s.mode === 'hash' },
    { type: 'text', key: 'compare', label: 'Input B (change one character)', show: (s) => s.mode === 'hash' },
    { type: 'seg', key: 'algorithm', label: 'Hash function', options: [['sha256', 'SHA-256'], ['sha1', 'SHA-1'], ['md5', 'MD5']], show: (s) => s.mode === 'hash' },
    { type: 'custom', key: 'password', show: (s) => s.mode === 'password', render: (box, s, set) => {
      box.innerHTML = `<label>Password <span class="faint tiny">never stored</span></label><div class="row" style="flex-wrap:nowrap;gap:6px"><input class="input mono" type="password" autocomplete="off" spellcheck="false" value="${esc(s.password)}" style="flex:1"><button class="icon-btn" type="button" title="Show / hide">${icon('eye')}</button></div>`;
      const inp = box.querySelector('input');
      box.querySelector('button').addEventListener('click', () => { inp.type = inp.type === 'password' ? 'text' : 'password'; });
      inp.addEventListener('input', debounce(() => set(inp.value), 250));
    } },
  ], st, (k) => { if (k === 'mode') layout(); run(); }, { lock });

  let res = null, prevBits = null, flipT = 0, stop = null, plots = [], dial = null, tNow = 0;

  function layout() {
    plots.forEach((p) => p.dispose()); plots = []; dial = null;
    if (st.mode === 'hash') {
      $('[data-main]').innerHTML = `
        <div class="card board neon-card"><div class="card-head"><h3>${icon('hash')} 256-bit fingerprints</h3><div class="legend"><span><i style="background:#3bc9db"></i>1-bit</span><span><i style="background:#ff4d8d"></i>changed</span></div></div>
          <div class="hash-grids"><div><div class="tiny faint" style="margin-bottom:4px">hash(A)</div><div data-ga></div></div><div><div class="tiny faint" style="margin-bottom:4px">hash(B)</div><div data-gb></div></div><div><div class="tiny faint" style="margin-bottom:4px">A ⊕ B — flipped bits</div><div data-gd></div></div></div>
          <div class="hash-hex mono small" data-hex></div></div>
        <div class="card"><div class="card-head"><h3>Avalanche</h3></div><div class="metrics" data-metrics></div><p class="small muted" data-note style="margin:10px 0 0"></p></div>`;
      for (const k of ['ga', 'gb', 'gd']) plots.push(new Plot($(`[data-${k}]`), { aspect: 1 }));
    } else {
      $('[data-main]').innerHTML = `
        <div class="card board neon-card"><div class="card-head"><h3>${icon('lock')} The vault</h3><span class="chip gray" data-label></span></div><div data-dial></div></div>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
          <div class="card"><div class="card-head"><h3>Strength</h3></div><div class="metrics" data-metrics></div><div class="pw-meter"><span data-bar></span></div><ul class="warn-list small" data-warn></ul></div>
          <div class="card"><div class="card-head"><h3>Time to crack (average)</h3></div><div data-times class="small"></div></div>
        </div>`;
      dial = new Plot($('[data-dial]'), { height: 300 });
      plots.push(dial);
    }
    hydrateIcons($('[data-main]'));
  }

  function drawGrid(plot, bits, other, diffMode, t) {
    plot.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#c2255c', stars: 0, grid: false });
      const n = 16, gap = 2, cs = (Math.min(w, h) - 16) / n, ox = (w - cs * n) / 2, oy = (h - cs * n) / 2;
      for (let i = 0; i < 256; i++) {
        const r = Math.floor(i / n), c = i % n;
        const on = diffMode ? bits[i] !== other[i] : bits[i] === 1;
        const fresh = prevBits && diffMode === false && prevBits[i] !== bits[i];
        const k = Math.max(0, 1 - (t - flipT) / 900);
        let col = diffMode ? (on ? '#ff4d8d' : 'rgba(255,255,255,.05)') : on ? '#3bc9db' : 'rgba(255,255,255,.05)';
        if (!diffMode && fresh && k > 0) col = `rgba(255,255,255,${0.4 + 0.6 * k})`;
        ctx.save();
        if (on) glow(ctx, col, 8 + 6 * Math.sin(t / 300 + i));
        ctx.fillStyle = col;
        ctx.fillRect(ox + c * cs + gap / 2, oy + r * cs + gap / 2, cs - gap, cs - gap);
        ctx.restore();
      }
    });
  }

  function drawDial(t) {
    dial?.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: res ? ['#e03131', '#f76707', '#fab005', '#40c057', '#12b886'][res.score] : '#c2255c', stars: 70, t, grid: false });
      if (!res) return;
      const cx = w / 2, cy = h / 2;
      const rings = Math.max(1, Math.min(14, Math.round(res.entropy / 10)));
      for (let i = 0; i < rings; i++) {
        const r = 20 + i * Math.min(w, h) * 0.032;
        const col = cmap(res.score >= 3 ? 'ice' : res.score === 2 ? 'fire' : 'magma', 0.35 + (0.6 * i) / rings);
        const rot = (t / (900 + i * 260)) * (i % 2 ? -1 : 1);
        ctx.save(); glow(ctx, col, 14); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.setLineDash([10 + i * 2, 6 + i]);
        ctx.beginPath(); ctx.arc(cx, cy, r, rot, rot + TAU * 0.92); ctx.stroke(); ctx.restore();
      }
      label(ctx, `${res.entropy} bits`, cx, cy - 6, { align: 'center', size: 22, weight: 800, color: '#fff' });
      label(ctx, res.label, cx, cy + 18, { align: 'center', size: 12, color: '#d0d7ff' });
      label(ctx, `≈ 2^${Math.round(res.entropy)} guesses`, 12, h - 14, { size: 11, color: 'rgba(220,225,255,.7)' });
    });
  }

  let lastDraw = -1e9;
  function frame(t) {
    tNow = t;
    if (!res || t - lastDraw < 50) return; // ~20 fps is plenty for glowing bits
    lastDraw = t;
    if (st.mode === 'hash' && plots.length === 3) {
      drawGrid(plots[0], res.bits, res.bits2, false, t);
      drawGrid(plots[1], res.bits2, res.bits, false, t);
      drawGrid(plots[2], res.bits, res.bits2, true, t);
    } else if (st.mode === 'password') drawDial(t);
  }

  async function run() {
    try {
      if (st.mode === 'hash') {
        const r = await api.lab('cyber/hash', { text: st.text, compare: st.compare, algorithm: st.algorithm }, store.user?.id);
        prevBits = res?.bits || null;
        res = r;
        flipT = tNow;
        const hx = (a, b) => [...a].map((c, i) => `<span class="${c !== b[i] ? 'diff' : ''}">${c}</span>`).join('');
        $('[data-hex]').innerHTML = `<div>A: ${hx(res.hash, res.hash2)}</div><div>B: ${hx(res.hash2, res.hash)}</div>`;
        $('[data-metrics]').innerHTML = metric('Bits changed', `${res.changed}/${res.total_bits}`) + metric('Avalanche', `${(res.avalanche * 100).toFixed(1)}%`, Math.abs(res.avalanche - 0.5) < 0.1 ? 'good' : '')
          + metric('Status', res.broken ? 'broken' : 'secure', res.broken ? 'bad' : 'good');
        $('[data-note]').textContent = res.note;
        setLabContext('hashing', 'Hash avalanche', [`${res.algorithm} of "${res.text}" = ${res.hash}`, `${res.algorithm} of "${res.compare}" = ${res.hash2}`,
          `${res.changed} of ${res.total_bits} bits differ (avalanche ${(res.avalanche * 100).toFixed(1)}%)`, res.note]);
      } else {
        res = await api.lab('cyber/password', { password: st.password });
        $('[data-label]').textContent = res.label;
        $('[data-metrics]').innerHTML = metric('Entropy', `${res.entropy} bits`, res.score >= 3 ? 'good' : res.score <= 1 ? 'bad' : '') + metric('Length', res.length) + metric('Character set', res.charset);
        $('[data-bar]').style.width = `${Math.min(100, res.entropy / 1.2)}%`;
        $('[data-bar]').style.background = ['#e03131', '#f76707', '#fab005', '#40c057', '#12b886'][res.score];
        $('[data-warn]').innerHTML = res.warnings.length ? res.warnings.map((w) => `<li>⚠️ ${esc(w)}</li>`).join('') : '<li>✅ No common patterns found.</li>';
        $('[data-times]').innerHTML = `<table class="table"><tbody>${Object.entries(res.crack_times).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="mono"><b>${esc(v)}</b></td></tr>`).join('')}</tbody></table>
          <p class="faint tiny" style="margin:8px 0 0">Estimates assume a random-looking password; real attackers try leaked lists and patterns first.</p>`;
        setLabContext('hashing', 'Password strength', [`A password of length ${res.length} using ${res.classes.join(', ') || 'no'} characters`, `Estimated entropy ${res.entropy} bits → ${res.label}`,
          `Warnings: ${res.warnings.join(' ') || 'none'}`, `Crack time with a fast offline GPU attack: ${res.crack_times['offline fast hash (10¹⁰/s GPU)']}`]);
      }
    } catch (e) { toast(esc(e.message), 'error'); }
    explain();
  }
  function explain() {
    $('[data-explain]').innerHTML = st.mode === 'hash'
      ? 'A cryptographic hash is a one-way fingerprint. Change <b>one</b> character and about <b>half</b> the bits flip, so similar inputs give unrelated hashes. MD5 and SHA-1 are broken for collisions — use SHA-256.'
      : 'Entropy ≈ length × log₂(character-set size). Each extra bit doubles the guesses. <b>Length beats symbols</b>: four random words beat <code>P@ssw0rd!</code>. Sites should store passwords with slow, salted hashes (bcrypt, Argon2).';
  }
  layout();
  stop = loop(frame);
  await run();
  return { getConfig: () => ({ password: st.password, mode: st.mode }), destroy: () => { stop?.(); plots.forEach((p) => p.dispose()); } };
}
