// Blockchain lab: Elliptic curves — the dots that make a wallet. Point addition, a key, and an ECDSA signature.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, glowDot, glowLine, label, loop, reducedMotion, rgba, TAU } from './neon.js';

export const meta = {
  howto: [
    'A tiny elliptic curve over a prime field is just a scatter of dots. “Adding” two points is a geometric rule, wrapped around the field.',
    'Your private key is a secret number d; the public key is G added to itself d times. Easy forwards, practically impossible to reverse — that is the trapdoor.',
    'Sign a message: the signature (r, s) checks out only for the matching public key. Tamper with the message and verification fails.',
    'Turn on “reuse the nonce” to see the famous bug (PlayStation 3, early Bitcoin wallets): signing twice with the same k leaks the private key.',
  ],
};

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { curve: 'small', private_key: 7, message: 'Pay Kabir 5 coins', nonce: 11, reuse_nonce: false, second_message: 'Pay Diya 9 coins', add_a: 3, add_b: 10, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <button class="btn btn-course" data-run>${icon('key')} Make key & sign</button>
      <div class="card card-tight sticky small" data-explain></div></div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('sparkle')} The curve mod p</h3><span class="chip gray" data-eq></span></div><div data-plot></div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
        <div class="card"><div class="card-head"><h3>${icon('key')} Keys & address</h3></div><div data-keys class="small"></div></div>
        <div class="card"><div class="card-head"><h3>Signature (r, s)</h3></div><div class="metrics" data-metrics></div><div data-signote class="small" style="margin-top:8px"></div></div>
      </div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  const ctl = controls($('[data-ctl]'), [
    { type: 'seg', key: 'curve', label: 'Curve', options: [['tiny', 'tiny · p=97'], ['small', 'small · p=211'], ['medium', 'medium · p=409']] },
    { type: 'slider', key: 'private_key', label: 'Private key d', min: 1, max: 200 },
    { type: 'text', key: 'message', label: 'Message to sign' },
    { type: 'slider', key: 'nonce', label: 'Random nonce k', min: 1, max: 200 },
    { type: 'slider', key: 'add_a', label: 'Point P index', min: 0, max: 100 },
    { type: 'slider', key: 'add_b', label: 'Point Q index', min: 0, max: 100 },
    { type: 'toggle', key: 'reuse_nonce', label: 'Reuse the nonce for a 2nd message 💀' },
  ], st, (k, v, live) => { if (!live) run(); }, { lock });

  const plot = new Plot($('[data-plot]'), { height: 400 });
  let res = null, stop = null, anim = 0;

  function draw(t) {
    if (!reducedMotion()) anim = t;
    plot.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#d49b00', stars: 40, t });
      if (!res) return;
      const p = res.p, pad = 30, S = Math.min(w, h) - 2 * pad, ox = (w - S) / 2, oy = (h - S) / 2;
      const X = (x) => ox + (x / (p - 1)) * S, Y = (y) => oy + S - (y / (p - 1)) * S;
      // field grid dots
      ctx.fillStyle = 'rgba(255,255,255,.04)';
      // all curve points
      res.points.forEach(([x, y]) => { ctx.fillStyle = 'rgba(255,212,59,.35)'; ctx.fillRect(X(x) - 1.3, Y(y) - 1.3, 2.6, 2.6); });
      // generator G and public key Q
      const A = res.addition;
      // wrapped "line" through P and Q (the chord), drawn as dotted dots mod p
      if (A.line.length) A.line.forEach(([x, y]) => { ctx.fillStyle = 'rgba(64,240,255,.25)'; ctx.fillRect(X(x) - 1, Y(y) - 1, 2, 2); });
      const mark = (pt, color, name, big = 6) => { if (!pt) return; glowDot(ctx, X(pt[0]), Y(pt[1]), big, color, 20); label(ctx, name, X(pt[0]) + 8, Y(pt[1]) - 8, { size: 11, weight: 800, color }); };
      // addition P + Q = R (reflect third intersection)
      if (A.third && A.sum) { glowLine(ctx, [[X(A.third[0]), Y(A.third[1])], [X(A.sum[0]), Y(A.sum[1])]], 'rgba(255,255,255,.4)', 1, 4); }
      mark(A.A, '#40f0ff', 'P'); mark(A.B, '#63e6be', 'Q'); mark(A.sum, '#ff6b6b', 'P+Q');
      mark(res.G, '#ffd43b', 'G'); mark(res.public_key, '#f06595', 'public key', 7);
      // pulse the public key
      const pk = res.public_key; ctx.save(); glow(ctx, '#f06595', 30); ctx.strokeStyle = rgba('#f06595', 0.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(pk[0]), Y(pk[1]), 10 + 5 * Math.abs(Math.sin(anim / 500)), 0, TAU); ctx.stroke(); ctx.restore();
      label(ctx, `${res.points.length} points on the curve`, 12, 16, { size: 10, color: 'rgba(220,230,255,.7)' });
    });
  }

  async function run() {
    try { res = await api.lab('chain/ecc', { ...st }, store.user?.id); } catch (e) { toast(esc(e.message), 'error'); return; }
    $('[data-eq]').textContent = res.equation;
    const v = res.verify.valid;
    $('[data-keys]').innerHTML = `<div><span class="faint">Generator G</span> (${res.G.join(', ')})</div>
      <div><span class="faint">Private key d</span> <b>${res.private_key}</b> <span class="faint">(secret!)</span></div>
      <div><span class="faint">Public key Q = d·G</span> <b style="color:var(--c-chain-2,#fcc419)">(${res.public_key.join(', ')})</b></div>
      <div><span class="faint">Wallet address</span> <code>${esc(res.address)}</code></div>
      <div style="margin-top:6px" class="faint tiny">Group order ${res.order}${res.order_is_prime ? ' (prime)' : ''} · found Q in ${res.keygen_trace.length} doublings via square-and-multiply.</div>`;
    $('[data-metrics]').innerHTML = metric('r', res.signature.r) + metric('s', res.signature.s) + metric('Verifies', v ? 'valid ✓' : 'invalid', v ? 'good' : 'bad') + metric('Tampered msg', res.tampered_valid ? 'accepted!' : 'rejected ✓', res.tampered_valid ? 'bad' : 'good');
    let note = `The signature was made with private key d and nonce k. Anyone can verify it against the <b>public</b> key — without ever learning d. Changing one character of the message makes it <b>${res.tampered_valid ? 'still verify (bug!)' : 'fail to verify'}</b>.`;
    if (res.recovery) note += res.recovery.success
      ? `<div class="callout warning" style="margin-top:8px"><i data-icon="alert"></i><div>💀 <b>Nonce reused!</b> From the two signatures anyone solved for k = ${res.recovery.k_recovered} and then recovered your private key <b>d = ${res.recovery.d_recovered}</b>. Never reuse k.</div></div>`
      : '<div class="small" style="margin-top:8px">Nonce reused but the two messages hashed the same, so nothing leaked this time.</div>';
    $('[data-signote]').innerHTML = note;
    hydrateIcons($('[data-signote]'));
    $('[data-explain]').innerHTML = `Multiplying G by d is quick; going from Q back to d (the “discrete log”) means searching all ${res.order} points here — but real curves like Bitcoin’s secp256k1 have ~10⁷⁷ points, far more than there are atoms on Earth. That gap is what secures every wallet.`;
    setLabContext('ecc', 'Elliptic-curve keys & ECDSA', [`Curve ${res.curve}: ${res.equation}, order ${res.order}`, `Private key ${res.private_key}, public key (${res.public_key.join(', ')}), address ${res.address}`,
      `Signature r=${res.signature.r}, s=${res.signature.s}; verifies ${v}; tampered message accepted ${res.tampered_valid}`, res.recovery ? `Nonce reuse recovered d=${res.recovery.d_recovered} (success ${res.recovery.success})` : 'nonce not reused']);
  }
  $('[data-run]').addEventListener('click', run);
  stop = loop(draw);
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { stop?.(); plot.dispose(); } };
}
