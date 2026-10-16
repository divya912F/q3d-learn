// Cyber lab: RSA workshop (keys, Euclid, encryption orbits on a modular clock) + Diffie–Hellman paint mixing.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, noGlow, label, loop, reducedMotion, TAU, lerp, rgba } from './neon.js';

export const meta = {
  howto: [
    'RSA: choose two different primes p and q and a public exponent e. The workshop derives n, φ(n) and the private key d.',
    'Each character m is encrypted as c = mᵉ mod n. Watch square-and-multiply hop around the modular clock.',
    'Decryption with d brings every character back — and the same keys sign and verify a message.',
    'Diffie–Hellman: Alice and Bob mix public paint with secret colours; Eve sees only the public mixes, yet both end with the same secret.',
  ],
};

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { tool: 'rsa', p: 61, q: 53, e: 17, message: 'HI', dp: 23, g: 5, a: 6, b: 15, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <button class="btn btn-course" data-run>${icon('play')} Compute</button>
      <div class="card card-tight sticky small" data-explain></div></div>
    <div class="stack" style="min-width:0" data-main></div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  controls($('[data-ctl]'), [
    { type: 'seg', key: 'tool', label: 'Workshop', options: [['rsa', 'RSA'], ['dh', 'Diffie–Hellman']] },
    { type: 'number', key: 'p', label: 'Prime p', show: (s) => s.tool === 'rsa' },
    { type: 'number', key: 'q', label: 'Prime q', show: (s) => s.tool === 'rsa' },
    { type: 'number', key: 'e', label: 'Public exponent e', show: (s) => s.tool === 'rsa' },
    { type: 'text', key: 'message', label: 'Message (short)', show: (s) => s.tool === 'rsa' },
    { type: 'number', key: 'dp', label: 'Public prime p', show: (s) => s.tool === 'dh' },
    { type: 'number', key: 'g', label: 'Public base g', show: (s) => s.tool === 'dh' },
    { type: 'number', key: 'a', label: 'Alice’s secret a', show: (s) => s.tool === 'dh' },
    { type: 'number', key: 'b', label: 'Bob’s secret b', show: (s) => s.tool === 'dh' },
  ], st, (k) => { if (k === 'tool') layout(); run(); }, { lock });

  let res = null, plot = null, stop = null, t0 = 0, tNow = 0, charIdx = 0;

  function layout() {
    plot?.dispose();
    if (st.tool === 'rsa') {
      $('[data-main]').innerHTML = `
        <div class="rsa-flow" data-flow></div>
        <div class="card board neon-card"><div class="card-head"><h3>${icon('lock')} Modular clock — encrypting “<span data-ch></span>”</h3><div class="legend"><span><i style="background:#ffd43b"></i>square</span><span><i style="background:#ff6b9d"></i>multiply</span></div></div><div data-plot></div></div>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
          <div class="card"><div class="card-head"><h3>Extended Euclid: finding d</h3></div><div data-euclid class="small"></div></div>
          <div class="card"><div class="card-head"><h3>Encrypt → decrypt → sign</h3></div><div data-blocks class="small"></div></div></div>`;
    } else {
      $('[data-main]').innerHTML = `
        <div class="card board neon-card"><div class="card-head"><h3>${icon('key')} Mixing secret paint in public</h3><span class="chip gray" data-match></span></div><div data-plot></div></div>
        <div class="card"><div class="card-head"><h3>The numbers</h3></div><div data-dh class="small"></div></div>`;
    }
    plot = new Plot($('[data-plot]'), { height: st.tool === 'rsa' ? 380 : 400 });
    hydrateIcons($('[data-main]'));
  }

  // ---------------------------------------------------------------- RSA drawing
  function drawRSA(t) {
    plot.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#c2255c', stars: 90, t, grid: false });
      if (!res) return;
      const b = res.blocks[charIdx % res.blocks.length];
      const cx = w / 2, cy = h / 2 + 6, R = Math.min(w, h) * 0.4;
      const ang = (v) => (v / res.n) * TAU - Math.PI / 2;
      const P = (v, r = R) => [cx + Math.cos(ang(v)) * r, cy + Math.sin(ang(v)) * r];
      // the clock face: a ring of faint dots (one per residue when small enough) + ticks
      ctx.save(); glow(ctx, '#f06595', 16); ctx.strokeStyle = 'rgba(240,101,149,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); ctx.restore();
      const dots = Math.min(res.n, 360);
      for (let i = 0; i < dots; i++) { const [x, y] = P((i * res.n) / dots); ctx.fillStyle = 'rgba(255,200,220,.25)'; ctx.fillRect(x - 0.7, y - 0.7, 1.4, 1.4); }
      label(ctx, `0`, cx, cy - R - 12, { align: 'center', size: 10, color: '#ffc9de' });
      label(ctx, `n = ${res.n}`, cx, cy, { align: 'center', size: 14, weight: 700, color: '#fff' });
      label(ctx, `${b.char}: m = ${b.m} → c = ${b.c}`, cx, cy + 20, { align: 'center', size: 12, color: '#ffc9de', font: 'JetBrains Mono, monospace' });
      // square-and-multiply orbit
      const steps = b.trace;
      const prog = reducedMotion() ? steps.length : Math.min(steps.length, ((t - t0) / 600) % (steps.length + 3));
      let prev = P(1, R * 0.92);
      for (let i = 0; i < Math.floor(prog); i++) {
        const s = steps[i];
        const sq = P(s.square, R * 0.78);
        const rr = P(s.result, R * 0.92);
        ctx.save(); glow(ctx, '#ffd43b', 12); ctx.strokeStyle = 'rgba(255,212,59,.6)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(...sq); ctx.stroke(); ctx.restore();
        if (s.bit) {
          ctx.save(); glow(ctx, '#ff6b9d', 18); ctx.strokeStyle = '#ff6b9d'; ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.moveTo(...prev); ctx.quadraticCurveTo(cx, cy, ...rr); ctx.stroke(); ctx.restore();
          prev = rr;
        }
        ctx.save(); glow(ctx, '#ffd43b', 14); ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(...sq, 3, 0, TAU); ctx.fill(); ctx.restore();
      }
      const [mx, my] = P(b.m, R * 0.92), [ccx, ccy] = P(b.c, R * 0.92);
      ctx.save(); glow(ctx, '#3bc9db', 22); ctx.fillStyle = '#3bc9db'; ctx.beginPath(); ctx.arc(mx, my, 6, 0, TAU); ctx.fill(); ctx.restore();
      label(ctx, `m=${b.m}`, mx + 9, my, { size: 10, color: '#99e9f2' });
      if (prog >= steps.length) {
        ctx.save(); glow(ctx, '#69db7c', 26); ctx.fillStyle = '#69db7c'; ctx.beginPath(); ctx.arc(ccx, ccy, 7 + Math.sin(t / 150), 0, TAU); ctx.fill(); ctx.restore();
        label(ctx, `c=${b.c}`, ccx + 10, ccy, { size: 11, weight: 700, color: '#b2f2bb' });
      }
      label(ctx, `exponent e = ${res.e} = ${res.e.toString(2)}₂ → ${steps.length} squarings, ${steps.filter((s) => s.bit).length} multiplies`, 12, h - 14, { size: 11, color: 'rgba(220,225,255,.75)' });
    });
  }

  // ---------------------------------------------------------------- DH drawing
  const hue = (v, p) => Math.round((v / p) * 330 + 15);
  function blob(ctx, x, y, r, h, lab, sub, t) {
    const g = ctx.createRadialGradient(x - r / 3, y - r / 3, 2, x, y, r);
    g.addColorStop(0, `hsl(${h} 90% 82%)`); g.addColorStop(0.6, `hsl(${h} 85% 58%)`); g.addColorStop(1, `hsla(${h} 85% 45% / .25)`);
    ctx.save(); glow(ctx, `hsl(${h} 90% 60%)`, 26); ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) { const a = (i / 40) * TAU; const rr = r * (1 + 0.06 * Math.sin(a * 5 + t / 400)); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.fill(); ctx.restore();
    label(ctx, lab, x, y - 2, { align: 'center', size: 13, weight: 800, color: '#0b0d1a' });
    if (sub) label(ctx, sub, x, y + r + 14, { align: 'center', size: 10.5, color: '#d0d7ff' });
  }
  function drawDH(t) {
    plot.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#7048e8', stars: 80, t, grid: false });
      if (!res) return;
      const p = res.p;
      const L = w * 0.18, Rx = w * 0.82, mid = w / 2;
      label(ctx, 'ALICE', L, 22, { align: 'center', size: 12, weight: 800, color: '#ffc9de' });
      label(ctx, 'PUBLIC CHANNEL (Eve is listening 👀)', mid, 22, { align: 'center', size: 11, weight: 700, color: '#ffd8a8' });
      label(ctx, 'BOB', Rx, 22, { align: 'center', size: 12, weight: 800, color: '#a5d8ff' });
      ctx.save(); ctx.setLineDash([6, 8]); ctx.strokeStyle = 'rgba(255,216,168,.25)'; ctx.strokeRect(mid - w * 0.17, 40, w * 0.34, h - 60); ctx.restore();
      const r = Math.min(30, w * 0.04);
      blob(ctx, mid, 80, r, hue(res.g, p), `g=${res.g}`, 'shared base (public)', t);
      blob(ctx, L, 90, r, hue(res.a, p), `a=${res.a}`, 'secret', t);
      blob(ctx, Rx, 90, r, hue(res.b, p), `b=${res.b}`, 'secret', t);
      // public mixes travel across
      const f = reducedMotion() ? 1 : ((t / 2600) % 1);
      blob(ctx, lerp(L, Rx, f), 190, r, hue(res.A, p), `A=${res.A}`, `gᵃ mod p`, t);
      blob(ctx, lerp(Rx, L, f), 270, r, hue(res.B, p), `B=${res.B}`, `gᵇ mod p`, t);
      // the shared secret appears on both sides
      const glowK = 0.6 + 0.4 * Math.sin(t / 300);
      blob(ctx, L, h - 70, r * (1 + 0.1 * glowK), hue(res.secret_alice, p), `${res.secret_alice}`, 'Bᵃ mod p', t);
      blob(ctx, Rx, h - 70, r * (1 + 0.1 * glowK), hue(res.secret_bob, p), `${res.secret_bob}`, 'Aᵇ mod p', t);
      label(ctx, res.match ? '🔑 same secret, never sent!' : 'secrets differ?!', mid, h - 70, { align: 'center', size: 14, weight: 800, color: res.match ? '#69db7c' : '#ff6b6b' });
    });
  }

  function frame(t) { tNow = t; if (!plot) return; st.tool === 'rsa' ? drawRSA(t) : drawDH(t); if (st.tool === 'rsa' && res && t - t0 > 600 * (res.blocks[charIdx % res.blocks.length].trace.length + 3)) { charIdx++; t0 = t; $('[data-ch]').textContent = res.blocks[charIdx % res.blocks.length].char; } }

  async function run() {
    try {
      if (st.tool === 'rsa') {
        res = await api.lab('cyber/rsa', { p: st.p, q: st.q, e: st.e, message: st.message }, store.user?.id);
        charIdx = 0; t0 = tNow;
        $('[data-ch]').textContent = res.blocks[0]?.char || '';
        const node = (lab, v, sub, cls = '') => `<div class="rsa-node ${cls}"><small>${lab}</small><b class="mono">${v}</b><span>${sub}</span></div>`;
        $('[data-flow]').innerHTML = node('primes', `${res.p} · ${res.q}`, 'keep secret') + '<i>→</i>' + node('modulus n', res.n, `${res.bits}-bit`) + '<i>→</i>' + node('φ(n)', res.phi, '(p−1)(q−1)')
          + '<i>→</i>' + node('public key', `(${res.e}, ${res.n})`, 'share with everyone', 'pub') + '<i>→</i>' + node('private key', `(${res.d}, ${res.n})`, `e·d mod φ = ${res.check}`, 'priv');
        $('[data-euclid]').innerHTML = `<table class="table"><thead><tr><th>q</th><th>r</th><th>s</th><th>t</th></tr></thead><tbody>${res.euclid.map((s) => `<tr><td class="mono">${s.q}</td><td class="mono">${s.r}</td><td class="mono">${s.s}</td><td class="mono">${s.t}</td></tr>`).join('')}</tbody></table>
          <p class="muted" style="margin:6px 0 0">gcd(e, φ) = 1, so d = e⁻¹ mod φ(n) = <b class="mono">${res.d}</b>.</p>`;
        $('[data-blocks]').innerHTML = `<table class="table"><thead><tr><th>char</th><th>m</th><th>c = mᵉ mod n</th><th>cᵈ mod n</th></tr></thead><tbody>${res.blocks.map((b) => `<tr><td><b>${esc(b.char)}</b></td><td class="mono">${b.m}</td><td class="mono">${b.c}</td><td class="mono">${b.decrypted} ✓</td></tr>`).join('')}</tbody></table>
          <p class="muted" style="margin:8px 0 0">Signature of SHA-256(message) mod n: <b class="mono">${res.signature.signature}</b> — verified with the public key: ${res.signature.verified ? '✅' : '❌'}</p>
          <p class="faint tiny" style="margin:6px 0 0">Tiny primes for learning only — real RSA uses 2048+ bit n and OAEP padding.</p>`;
        setLabContext('rsa', 'RSA workshop', [`p = ${res.p}, q = ${res.q}, n = ${res.n} (${res.bits} bits), φ(n) = ${res.phi}`, `Public key (e, n) = (${res.e}, ${res.n}); private key d = ${res.d} (e·d mod φ = ${res.check})`,
          `Message "${st.message}" encrypts to ${res.ciphertext.join(', ')} and decrypts back to "${res.plaintext}"`, `Signature verified: ${res.signature.verified}`]);
      } else {
        res = await api.lab('cyber/dh', { p: st.dp, g: st.g, a: st.a, b: st.b });
        $('[data-match]').textContent = res.match ? 'shared secret matches' : 'mismatch';
        $('[data-dh]').innerHTML = `<div class="metrics">${metric('A = gᵃ mod p', res.A)}${metric('B = gᵇ mod p', res.B)}${metric('Alice: Bᵃ mod p', res.secret_alice, 'good')}${metric('Bob: Aᵇ mod p', res.secret_bob, 'good')}</div>
          <p class="muted" style="margin:10px 0 0">Eve sees p = ${res.p}, g = ${res.g}, A = ${res.A} and B = ${res.B}. To get the secret she must solve gˣ ≡ A (mod p) — the <b>discrete logarithm</b> problem, infeasible for 2048-bit p.
          ${res.generator ? '' : `<br>⚠️ g = ${res.g} only generates ${res.order} of the ${res.p - 1} possible values — pick a generator.`}</p>`;
        setLabContext('rsa', 'Diffie–Hellman', [`p = ${res.p}, g = ${res.g}, secrets a = ${res.a}, b = ${res.b}`, `Public values A = ${res.A}, B = ${res.B}`, `Shared secret: ${res.secret_alice} (Alice) and ${res.secret_bob} (Bob)`]);
      }
    } catch (e) { toast(esc(e.message), 'error'); }
    $('[data-explain]').innerHTML = st.tool === 'rsa'
      ? 'Anyone can encrypt with the <b>public</b> key (e, n), but only the holder of <b>d</b> can decrypt. Finding d requires φ(n), which requires factoring n — easy for 3233, hopeless for a 2048-bit n.'
      : 'Diffie–Hellman lets two strangers agree on a secret over a public channel. Mixing paint is easy; un-mixing it is hard — just like computing gᵃ mod p is easy but recovering a is hard.';
  }
  $('[data-run]').addEventListener('click', run);
  layout();
  stop = loop(frame);
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { stop?.(); plot?.dispose(); } };
}
