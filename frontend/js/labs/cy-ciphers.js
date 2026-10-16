// Cyber lab: Cipher Wheel — encrypt/decrypt classical ciphers on a glowing rotating wheel, then crack them.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons, debounce } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, noGlow, label, loop, reducedMotion, TAU, lerp, glowLine, rgba } from './neon.js';

export const meta = {
  howto: [
    'Choose a cipher and type a message (or paste a ciphertext and switch to Decrypt).',
    'The wheel shows how letters map: the outer ring is plain text, the inner ring is the cipher alphabet for the current key letter.',
    'Compare letter frequencies with English — that is the leak attackers use.',
    'The crack panel tries every Caesar shift (χ²) or estimates the Vigenère key length (index of coincidence) and recovers the key.',
  ],
};
const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DEFAULT_TEXT = 'Cryptography is the art of writing secret messages. For centuries people believed that a simple substitution of letters was unbreakable, until scholars noticed that some letters appear far more often than others.';

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { cipher: 'caesar', mode: 'encrypt', key: '3', text: DEFAULT_TEXT, ...preset };
  if (st.cipher === 'vigenere' && /^\d+$/.test(st.key)) st.key = 'srijan';
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <div class="card card-tight sticky small" data-explain></div>
    </div>
    <div class="stack" style="min-width:0">
      <div class="grid cipher-top">
        <div class="card board neon-card"><div class="card-head"><h3>${icon('key')} Cipher wheel</h3><span class="chip gray" data-keychip></span></div><div data-wheel></div></div>
        <div class="card board neon-card"><div class="card-head"><h3>${icon('lock')} <span data-outtitle>Ciphertext</span></h3><button class="btn btn-ghost btn-sm" data-swap title="Use the output as the new input">${icon('shuffle')} Use as input</button></div>
          <div class="cipher-out mono" data-out></div></div>
      </div>
      <div class="card board neon-card"><div class="card-head"><h3>${icon('chart')} Letter frequencies</h3><div class="legend"><span><i style="background:#3bc9db"></i>this text</span><span><i style="background:#ff6b9d"></i>typical English</span></div></div><div data-freq></div></div>
      <div class="card board neon-card"><div class="card-head"><h3>${icon('search')} Crack it</h3><span class="faint tiny" data-crackhint></span></div><div data-crack></div><div class="cipher-out mono small" data-crackout style="margin-top:10px"></div></div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  controls($('[data-ctl]'), [
    { type: 'seg', key: 'cipher', label: 'Cipher', options: [['caesar', 'Caesar'], ['vigenere', 'Vigenère'], ['atbash', 'Atbash'], ['xor', 'XOR']] },
    { type: 'seg', key: 'mode', label: 'Mode', options: [['encrypt', 'Encrypt'], ['decrypt', 'Decrypt']], show: (s) => !['atbash', 'xor'].includes(s.cipher) },
    { type: 'text', key: 'key', label: 'Key (shift number or keyword)', show: (s) => s.cipher !== 'atbash' },
    { type: 'custom', key: 'text', render: (box, s, set) => {
      box.innerHTML = `<label>Message</label><textarea class="input mono" rows="6" style="resize:vertical">${esc(s.text)}</textarea><span class="faint tiny">Letters only are enciphered; spaces and punctuation pass through.</span>`;
      box.querySelector('textarea').addEventListener('input', debounce((e) => set(e.target.value), 350));
    } },
  ], st, (k) => {
    if (k === 'cipher') {
      if (st.cipher === 'caesar' && !/^\d+$/.test(st.key)) st.key = '3';
      if (st.cipher === 'vigenere' && /^\d+$/.test(st.key)) st.key = 'srijan';
      if (st.cipher === 'xor' && /^\d+$/.test(st.key)) st.key = 'k3y';
      root.querySelector('[data-k="key"]') && (root.querySelector('[data-k="key"]').value = st.key);
    }
    run();
  }, { lock });

  const wheel = new Plot($('[data-wheel]'), { height: 300 });
  const freq = new Plot($('[data-freq]'), { height: 200 });
  const crack = new Plot($('[data-crack]'), { height: 190 });
  let res = null, angle = 0, target = 0, stop = null, keyIdx = 0, tPrev = 0, reveal = 0;

  const shiftFor = (i) => {
    if (!res) return 0;
    if (res.cipher === 'caesar') return res.key;
    if (res.cipher === 'vigenere') return A.indexOf(res.key[i % res.key.length].toUpperCase());
    return 0;
  };

  function drawWheel(t) {
    wheel.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#c2255c', stars: 50, t, grid: false });
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.42;
      const sh = res?.cipher === 'atbash' ? 0 : shiftFor(keyIdx);
      target = (-sh * TAU) / 26;
      angle = reducedMotion() ? target : lerp(angle, target, 0.12);
      // rings
      for (const [r, a] of [[R, 0.5], [R * 0.72, 0.35], [R * 0.44, 0.15]]) {
        ctx.save(); glow(ctx, '#f06595', 18); ctx.strokeStyle = rgba('#f06595', a); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); ctx.restore();
      }
      for (let i = 0; i < 26; i++) {
        const a0 = (i * TAU) / 26 - Math.PI / 2;
        label(ctx, A[i], cx + Math.cos(a0) * R * 0.86, cy + Math.sin(a0) * R * 0.86, { align: 'center', size: 13, weight: 700, color: '#fde2ec', font: 'JetBrains Mono, monospace' });
        const inner = res?.cipher === 'atbash' ? A[25 - i] : A[i];
        const a1 = a0 + angle + (res?.cipher === 'atbash' ? 0 : 0);
        const ia = res?.cipher === 'atbash' ? a0 : a1;
        label(ctx, inner, cx + Math.cos(ia) * R * 0.58, cy + Math.sin(ia) * R * 0.58, { align: 'center', size: 12, weight: 700, color: '#66d9e8', font: 'JetBrains Mono, monospace' });
      }
      // highlight the current letter mapping as a beam
      const letters = (res?.input || '').toUpperCase().replace(/[^A-Z]/g, '');
      if (letters.length && res.cipher !== 'xor') {
        const L = letters[keyIdx % letters.length];
        const i = A.indexOf(L);
        const a0 = (i * TAU) / 26 - Math.PI / 2;
        const pulse = 0.6 + 0.4 * Math.sin(t / 200);
        glowLine(ctx, [[cx + Math.cos(a0) * R * 0.95, cy + Math.sin(a0) * R * 0.95], [cx + Math.cos(a0) * R * 0.5, cy + Math.sin(a0) * R * 0.5]], rgba('#fff3bf', pulse), 3, 22);
        const mapped = res.cipher === 'atbash' ? A[25 - i] : A[(i + (res.mode === 'decrypt' ? -shiftFor(keyIdx) : shiftFor(keyIdx)) + 26 * 4) % 26];
        label(ctx, `${L} → ${mapped}`, cx, cy, { align: 'center', size: 22, weight: 800, color: '#fff', font: 'JetBrains Mono, monospace' });
        if (res.cipher === 'vigenere') label(ctx, `key letter “${res.key[keyIdx % res.key.length].toUpperCase()}” = shift ${shiftFor(keyIdx)}`, cx, cy + 26, { align: 'center', size: 11, color: '#ffc9de' });
      } else if (res?.cipher === 'xor') {
        label(ctx, 'XOR works on bits, not letters:', cx, cy - 10, { align: 'center', size: 12, color: '#ffc9de' });
        label(ctx, 'P ⊕ K = C,  C ⊕ K = P', cx, cy + 14, { align: 'center', size: 18, weight: 800, color: '#fff', font: 'JetBrains Mono, monospace' });
      }
    });
  }

  function frame(t) {
    const dt = (t - tPrev) / 1000; tPrev = t;
    if (res && Math.floor(t / 700) !== Math.floor((t - dt * 1000) / 700)) keyIdx++;
    if (res && reveal < res.output.length) {
      reveal = reducedMotion() ? res.output.length : Math.min(res.output.length, reveal + dt * 90);
      paintOutput();
    }
    drawWheel(t);
  }

  function paintOutput() {
    const out = res.output;
    const n = Math.floor(reveal);
    const scramble = (c) => (/[a-z]/i.test(c) ? A[Math.floor(Math.random() * 26)] : c);
    $('[data-out]').innerHTML = `<span>${esc(out.slice(0, n))}</span><span class="scramble">${esc([...out.slice(n, n + 24)].map(scramble).join(''))}</span>`;
  }

  function drawFreq() {
    freq.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#1098ad', stars: 20 });
      const src = res.cipher === 'xor' ? res.freq_in : (res.mode === 'encrypt' ? res.freq_out : res.freq_in);
      const max = Math.max(13, ...Object.values(src));
      const pad = 24, bw = (w - 2 * pad) / 26;
      A.toLowerCase().split('').forEach((ch, i) => {
        const x = pad + i * bw;
        const eh = ((h - 44) * res.english[ch]) / max, th = ((h - 44) * src[ch]) / max;
        ctx.save(); glow(ctx, '#3bc9db', 10); ctx.fillStyle = '#3bc9db'; ctx.fillRect(x + bw * 0.1, h - 22 - th, bw * 0.38, th); ctx.restore();
        ctx.save(); glow(ctx, '#ff6b9d', 8); ctx.fillStyle = 'rgba(255,107,157,.75)'; ctx.fillRect(x + bw * 0.52, h - 22 - eh, bw * 0.38, eh); ctx.restore();
        label(ctx, ch.toUpperCase(), x + bw / 2, h - 10, { align: 'center', size: 10, color: 'rgba(220,225,255,.7)', font: 'JetBrains Mono, monospace' });
      });
      label(ctx, res.mode === 'encrypt' && res.cipher !== 'xor' ? 'ciphertext letters' : 'input letters', 10, 12, { size: 10, color: 'rgba(220,225,255,.6)' });
    });
  }

  function drawCrack() {
    const c = res.crack;
    $('[data-crackout]').textContent = '';
    if (!c) {
      $('[data-crackhint]').textContent = res.cipher === 'vigenere' ? 'Need ≥ 40 letters to crack' : res.cipher === 'xor' ? 'XOR with a random, never-reused key is a one-time pad' : 'Atbash has no key at all — it is instantly reversible';
      crack.draw((ctx, w, h) => { space(ctx, w, h, { tint: '#c2255c', stars: 30 }); label(ctx, res.cipher === 'atbash' ? 'No key to find: A↔Z, B↔Y, …' : 'Nothing to crack here', w / 2, h / 2, { align: 'center', size: 14, color: '#ffc9de' }); });
      return;
    }
    if (res.cipher === 'caesar') {
      $('[data-crackhint]').textContent = 'χ² distance from English for every shift — lowest wins';
      crack.draw((ctx, w, h) => {
        space(ctx, w, h, { tint: '#c2255c', stars: 30 });
        const vals = c.chi2.map((v) => Math.log10(1 + v)), max = Math.max(...vals), pad = 26, bw = (w - 2 * pad) / 26;
        vals.forEach((v, s) => {
          const bh = ((h - 40) * v) / max, x = pad + s * bw;
          const best = s === c.shift;
          ctx.save(); glow(ctx, best ? '#69db7c' : '#f06595', best ? 20 : 6); ctx.fillStyle = best ? '#69db7c' : 'rgba(240,101,149,.55)';
          ctx.fillRect(x + 2, h - 20 - bh, bw - 4, bh); ctx.restore();
          label(ctx, String(s), x + bw / 2, h - 9, { align: 'center', size: 9, color: best ? '#69db7c' : 'rgba(220,225,255,.6)' });
        });
        label(ctx, `best shift = ${c.shift}`, w - 10, 14, { align: 'right', size: 12, weight: 700, color: '#69db7c' });
      });
      $('[data-crackout]').textContent = `Recovered: ${c.plaintext.slice(0, 220)}`;
    } else {
      $('[data-crackhint]').textContent = 'Index of coincidence for each key length — English ≈ 0.066, random ≈ 0.038';
      crack.draw((ctx, w, h) => {
        space(ctx, w, h, { tint: '#c2255c', stars: 30 });
        const pad = 30, bw = (w - 2 * pad) / c.ic.length, max = 0.08;
        const y066 = h - 22 - ((h - 40) * 0.066) / max;
        ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(105,219,124,.5)'; ctx.beginPath(); ctx.moveTo(pad, y066); ctx.lineTo(w - pad, y066); ctx.stroke(); ctx.restore();
        label(ctx, 'English', w - pad, y066 - 8, { align: 'right', size: 9, color: '#69db7c' });
        c.ic.forEach((v, i) => {
          const bh = ((h - 40) * v) / max, x = pad + i * bw, best = i + 1 === c.key_length;
          ctx.save(); glow(ctx, best ? '#69db7c' : '#3bc9db', best ? 20 : 6); ctx.fillStyle = best ? '#69db7c' : 'rgba(59,201,219,.6)';
          ctx.fillRect(x + 4, h - 22 - bh, bw - 8, bh); ctx.restore();
          label(ctx, `L=${i + 1}`, x + bw / 2, h - 9, { align: 'center', size: 9, color: 'rgba(220,225,255,.7)' });
        });
        label(ctx, `key = “${c.key}”`, 10, 14, { size: 13, weight: 700, color: '#69db7c', font: 'JetBrains Mono, monospace' });
      });
      $('[data-crackout]').textContent = `Recovered (key “${c.key}”): ${c.plaintext.slice(0, 220)}`;
    }
  }

  async function run() {
    try {
      res = await api.lab('cyber/cipher', { cipher: st.cipher, text: st.text, key: st.key, mode: st.mode }, store.user?.id);
    } catch (e) { toast(esc(e.message), 'error'); return; }
    reveal = 0; keyIdx = 0;
    $('[data-keychip]').textContent = res.cipher === 'caesar' ? `shift ${res.key}` : res.cipher === 'vigenere' ? `keyword “${res.key}”` : res.cipher === 'xor' ? `key “${res.key}”` : 'no key';
    $('[data-outtitle]').textContent = res.cipher === 'xor' ? 'Ciphertext (hex)' : res.mode === 'encrypt' ? 'Ciphertext' : 'Plaintext';
    drawFreq(); drawCrack(); explain();
    setLabContext('ciphers', 'Cipher wheel', [
      `Cipher ${res.cipher}, mode ${res.mode}, key ${res.key}`,
      `Input (first 120 chars): ${res.input.slice(0, 120)}`,
      `Output (first 120 chars): ${res.output.slice(0, 120)}`,
      res.crack?.shift != null ? `Caesar crack: best shift ${res.crack.shift} (lowest chi-squared)` : null,
      res.crack?.key ? `Vigenère crack: estimated key length ${res.crack.key_length}, recovered key "${res.crack.key}"` : null,
    ]);
  }

  function explain() {
    $('[data-explain]').innerHTML = {
      caesar: '<b>Caesar</b> shifts every letter by the same amount. Only 25 keys — and the letter frequencies keep their shape, just slid sideways.',
      vigenere: '<b>Vigenère</b> uses a keyword: each letter gets a different shift, flattening the frequency chart. But the key repeats — so columns spaced by the key length are just Caesar ciphers again.',
      atbash: '<b>Atbash</b> mirrors the alphabet (A↔Z). There is no key, so anyone who knows the trick can read it.',
      xor: '<b>XOR</b> is the core of modern ciphers. With a truly random key as long as the message, used once, it is a perfect one-time pad. A short repeating key is easy to break.',
    }[st.cipher];
  }

  $('[data-swap]').addEventListener('click', () => {
    if (!res || res.cipher === 'xor') return;
    st.text = res.output;
    st.mode = st.mode === 'encrypt' ? 'decrypt' : 'encrypt';
    root.querySelector('[data-custom="text"] textarea').value = st.text;
    root.querySelectorAll('[data-k="mode"] button').forEach((b) => b.classList.toggle('active', b.dataset.v === st.mode));
    run();
  });
  tPrev = 0;
  stop = loop(frame);
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { stop?.(); wheel.dispose(); freq.dispose(); crack.dispose(); } };
}
