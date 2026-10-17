// Cyber lab: Phishing spotter — judge fictional emails, then reveal the warning signs and dissect any link.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { Plot, setLabContext, metric } from './kit.js';
import { space, glow, label, loop, reducedMotion, TAU } from './neon.js';

export const meta = {
  howto: [
    'Pick an email from the inbox. All senders and domains are fictional (".example").',
    'Decide first: press “Phishing” or “Looks safe”. Then the warning signs light up and the risk meter fills.',
    'Hover the link to compare what it says with where it really goes.',
    'Paste any web address into the link dissector to see which part is the real (registered) domain.',
  ],
};

export async function mount(root, { preset = {} } = {}) {
  const st = { message: 'bank-alert', url: 'http://srijanbank.example.secure-login.example/verify', ...preset };
  const score = { right: 0, total: 0 };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card card-tight"><b>${icon('chat')} Inbox</b><div class="stack" style="gap:6px;margin-top:8px" data-inbox></div></div>
      <div class="card card-tight sticky small" data-explain>Read the email, make your call, then check the signals.</div></div>
    <div class="stack" style="min-width:0">
      <div class="card phish-mail" data-mail></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
        <div class="card board neon-card"><div class="card-head"><h3>${icon('alert')} Risk meter</h3></div><div data-meter></div></div>
        <div class="card"><div class="card-head"><h3>Warning signs</h3><span class="chip gray" data-score></span></div><div data-signals class="stack" style="gap:6px"></div></div>
      </div>
      <div class="card"><div class="card-head"><h3>${icon('link')} Link dissector</h3></div>
        <div class="row"><input class="input grow" data-url value="${esc(st.url)}" aria-label="Web address"><button class="btn btn-course" data-check>Dissect</button></div>
        <div data-parts class="url-parts" style="margin-top:12px"></div><div data-urlsig class="small" style="margin-top:8px"></div></div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  const meter = new Plot($('[data-meter]'), { height: 200 });
  let res = null, revealed = false, shown = 0, stop = null;

  function highlight(text, words) {
    let h = esc(text);
    (words || []).forEach((w) => { h = h.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark class="phish-hit">$1</mark>'); });
    return h;
  }

  function renderMail() {
    const m = res.message, words = revealed ? res.signals.flatMap((s) => s.words || []) : [];
    const flag = (where) => (revealed && res.signals.some((s) => s.where === where) ? ' phish-flag' : '');
    $('[data-mail]').innerHTML = `
      <div class="phish-head"><div class="${flag('from')}"><span class="faint">From</span> ${esc(m.from)}</div><div class="${flag('subject')}"><span class="faint">Subject</span> <b>${highlight(m.subject, words)}</b></div></div>
      <p>${highlight(m.body, words)}</p>
      ${m.link_href ? `<p><a class="phish-link${flag('link')}" href="#" title="Real destination: ${esc(m.link_href)}" data-link>${esc(m.link_text)}</a> <span class="faint tiny" data-real hidden>→ really goes to <code>${esc(m.link_href)}</code></span></p>` : ''}
      ${m.attachment ? `<p class="${flag('attachment')}">📎 ${esc(m.attachment)}</p>` : ''}
      <div class="row" style="margin-top:12px">${revealed ? `<span class="chip ${res.verdict === 'low' ? 'green' : 'red'}">${res.verdict === 'low' ? 'Probably safe' : res.verdict === 'medium' ? 'Suspicious' : 'Phishing'}</span>`
        : `<button class="btn btn-ghost" data-guess="phish">${icon('alert')} Phishing</button><button class="btn btn-ghost" data-guess="safe">${icon('check')} Looks safe</button>`}</div>`;
    hydrateIcons($('[data-mail]'));
    const link = $('[data-link]');
    link?.addEventListener('mouseenter', () => { $('[data-real]').hidden = false; });
    link?.addEventListener('click', (e) => { e.preventDefault(); $('[data-real]').hidden = false; toast('Good instinct — hover first, never click unknown links.'); });
    root.querySelectorAll('[data-guess]').forEach((b) => b.addEventListener('click', () => guess(b.dataset.guess)));
  }

  function guess(g) {
    const phish = res.verdict !== 'low';
    const ok = (g === 'phish') === phish;
    score.total++; if (ok) score.right++;
    toast(ok ? 'Correct! ✅' : 'Not quite — look at the signals.', ok ? 'success' : 'error');
    reveal();
  }

  function reveal() {
    revealed = true; shown = 0;
    renderMail();
    $('[data-score]').textContent = `your score ${score.right}/${score.total}`;
    $('[data-signals]').innerHTML = res.signals.length ? res.signals.map((s) => `<div class="phish-signal"><b>${esc(s.signal)}</b> <span class="chip red">+${s.weight}</span><div class="small muted">${esc(s.detail)}</div></div>`).join('')
      : '<div class="small">No warning signs. Still: if in doubt, contact the sender through a channel you already trust.</div>';
    $('[data-explain]').innerHTML = res.verdict === 'low' ? 'This one is legitimate: right sender domain, no pressure, no requests for secrets.' : `Risk <b>${res.risk}/100</b>. Phishing works by creating <b>urgency</b> and <b>trust</b> at the same time. Slow down, check the sender’s domain and the real link destination.`;
    setLabContext('phishing', 'Phishing spotter', [`Message “${res.message.subject}” from ${res.message.from}`, `Risk ${res.risk}/100 (${res.verdict}); signals: ${res.signals.map((s) => s.signal).join(', ') || 'none'}`, `Learner score ${score.right}/${score.total}`]);
  }

  function drawMeter(t) {
    meter.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#c2255c', stars: 20, t, grid: false });
      const cx = w / 2, cy = h / 2 + 6, R = Math.min(w, h) / 2 - 24, target = revealed ? res.risk : 0;
      shown += (target - shown) * (reducedMotion() ? 1 : 0.06);
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      const col = shown >= 50 ? '#ff6b6b' : shown >= 20 ? '#ffa94d' : '#69db7c';
      ctx.save(); glow(ctx, col, 26); ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * (shown / 100)); ctx.stroke(); ctx.restore();
      label(ctx, revealed ? `${Math.round(shown)}` : '?', cx, cy - 4, { align: 'center', size: 30, weight: 800, color: '#fff' });
      label(ctx, revealed ? 'risk / 100' : 'make your call', cx, cy + 22, { align: 'center', size: 11, color: 'rgba(255,255,255,.7)' });
    });
  }

  async function load(id) {
    try { res = await api.lab('cyber/phishing', { message: id }, store.user?.id); } catch (e) { toast(esc(e.message), 'error'); return; }
    st.message = id; revealed = false; shown = 0;
    $('[data-inbox]').innerHTML = res.messages.map((m) => `<button class="inbox-item ${m.id === id ? 'active' : ''}" data-id="${m.id}">${esc(m.subject)}</button>`).join('');
    root.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => load(b.dataset.id)));
    $('[data-signals]').innerHTML = '<div class="faint small">Decide first, then the signals appear.</div>';
    renderMail();
  }

  async function dissect() {
    const url = $('[data-url]').value.trim();
    if (!url) return;
    let r;
    try { r = await api.lab('cyber/phishing', { url }, store.user?.id); } catch (e) { toast(esc(e.message), 'error'); return; }
    const p = r.url_parts;
    $('[data-parts]').innerHTML = `<span class="up-scheme" title="protocol">${esc(p.scheme)}://</span>${p.subdomains ? `<span class="up-sub" title="sub-domains (chosen freely by the owner)">${esc(p.subdomains)}.</span>` : ''}<span class="up-reg" title="registered domain — who really owns the site">${esc(p.registered_domain)}</span><span class="up-path" title="path">${esc(p.path)}</span>`;
    $('[data-urlsig]').innerHTML = `<b>Owner:</b> <code>${esc(p.registered_domain)}</code> · risk <b>${r.risk}</b>/100<br>${r.signals.map((s) => `⚠️ ${esc(s.signal)} — ${esc(s.detail)}`).join('<br>') || '✅ No obvious warning signs (that alone does not make a site trustworthy).'}`;
  }
  $('[data-check]').addEventListener('click', dissect);
  $('[data-url]').addEventListener('keydown', (e) => { if (e.key === 'Enter') dissect(); });
  stop = loop(drawMeter);
  await load(st.message);
  await dissect();
  return { getConfig: () => ({ ...st }), destroy: () => { stop?.(); meter.dispose(); } };
}
