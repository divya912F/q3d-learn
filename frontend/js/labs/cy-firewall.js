// Cyber lab: Firewall & IDS — packets fly at a glowing wall; your first-match rules decide who gets through.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { controls, Plot, setLabContext, metric } from './kit.js';
import { space, glow, glowDot, label, loop, reducedMotion, rgba, TAU } from './neon.js';

export const meta = {
  howto: [
    'Traffic arrives from customers, your office, a botnet and a port scanner. Each packet has a protocol and a destination port.',
    'Rules are checked top to bottom; the FIRST rule that matches decides. If none match, the default policy applies.',
    'Green packets pass the wall and reach a service; red ones shatter. Watch for malicious packets getting through and real users being blocked.',
    'Try the “wrong order” preset: a broad allow rule above a specific deny means the deny is never reached.',
  ],
};
const SRC_Y = { customer: 0.18, office: 0.4, botnet: 0.62, attacker: 0.84 };
const SRC_C = { customer: '#69db7c', office: '#74c0fc', botnet: '#ff922b', attacker: '#ff6b6b' };

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { preset: 'web_only', ids: true, rules: null, default: null, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <div class="card card-tight"><div class="row-between"><b>Rules (first match wins)</b><button class="btn btn-ghost btn-sm" data-add>${icon('plus')} Rule</button></div><div data-rules class="stack" style="gap:6px;margin-top:8px"></div>
        <div class="row" style="margin-top:8px;gap:6px"><span class="small">Default:</span><div class="seg" data-def><button data-v="allow">allow</button><button data-v="deny">deny</button></div></div>
        <button class="btn btn-course" data-run style="margin-top:10px;width:100%">${icon('wall')} Apply & replay traffic</button></div>
      <div class="card card-tight sticky small" data-explain></div></div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('wall')} Network edge</h3><span class="chip" data-score></span></div><div data-net></div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
        <div class="card"><div class="card-head"><h3>Result</h3></div><div class="metrics" data-metrics></div></div>
        <div class="card"><div class="card-head"><h3>${icon('alert')} IDS alerts & exposed services</h3></div><div class="small" data-alerts></div></div>
      </div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  const ctl = controls($('[data-ctl]'), [
    { type: 'select', key: 'preset', label: 'Start from preset', options: [['open', 'Wide open (no firewall)'], ['web_only', 'Web server only'], ['hardened', 'Hardened'], ['wrong_order', 'Wrong rule order']] },
    { type: 'toggle', key: 'ids', label: 'Intrusion detection (port-scan alerts)' },
  ], st, (k) => { if (k === 'preset') { st.rules = null; st.default = null; } run(); }, { lock });

  const net = new Plot($('[data-net]'), { height: 380 });
  let res = null, stop = null, t0 = 0, tNow = 0, rules = [];

  function renderRules() {
    $('[data-rules]').innerHTML = rules.map((r, i) => `<div class="fw-rule ${r.action}" data-i="${i}">
      <select class="input" data-f="action"><option ${r.action === 'allow' ? 'selected' : ''}>allow</option><option ${r.action === 'deny' ? 'selected' : ''}>deny</option></select>
      <select class="input" data-f="proto">${['any', 'tcp', 'udp'].map((p) => `<option ${r.proto === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
      <input class="input" data-f="port" value="${esc(r.port)}" title="Ports: any, 443, 80,443 or 1000-2000">
      <input class="input" data-f="src" value="${esc(r.src)}" title="Source: any or a CIDR like 10.1.0.0/16">
      <span class="faint tiny">${res?.rules?.[i]?.hits ?? 0} hits</span>
      <button class="icon-btn" data-up title="Move up">↑</button><button class="icon-btn" data-del title="Delete">${icon('trash')}</button></div>`).join('') || '<span class="faint small">No rules — the default policy decides everything.</span>';
    hydrateIcons($('[data-rules]'));
    $('[data-def]').querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.v === (st.default || res?.default)));
  }
  $('[data-rules]').addEventListener('change', (e) => { const row = e.target.closest('[data-i]'); if (row) { rules[+row.dataset.i][e.target.dataset.f] = e.target.value; st.rules = rules; } });
  $('[data-rules]').addEventListener('click', (e) => {
    const row = e.target.closest('[data-i]'); if (!row) return; const i = +row.dataset.i;
    if (e.target.closest('[data-del]')) rules.splice(i, 1);
    else if (e.target.closest('[data-up]') && i > 0) [rules[i - 1], rules[i]] = [rules[i], rules[i - 1]];
    else return;
    st.rules = rules; renderRules();
  });
  $('[data-add]').addEventListener('click', () => { rules.push({ action: 'deny', proto: 'tcp', port: '3306', src: 'any', note: '' }); st.rules = rules; renderRules(); });
  $('[data-def]').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { st.default = b.dataset.v; renderRules(); } });

  function drawNet(t) {
    net.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#c2255c', stars: 50, t });
      if (!res) return;
      const wx = w * 0.5, sx = 70, dx = w - 70;
      // sources
      Object.entries(SRC_Y).forEach(([k, fy]) => {
        const y = fy * h;
        ctx.save(); glow(ctx, SRC_C[k], 18); ctx.fillStyle = rgba(SRC_C[k], 0.18); ctx.beginPath(); ctx.ellipse(sx - 20, y, 46, 22, 0, 0, TAU); ctx.fill(); ctx.restore();
        label(ctx, res.sources[k], sx - 20, y, { align: 'center', size: 10, weight: 800, color: SRC_C[k] });
      });
      // the wall
      const bricks = 14;
      for (let i = 0; i < bricks; i++) {
        const y = 10 + (i * (h - 20)) / bricks, bh = (h - 20) / bricks - 3;
        ctx.save(); glow(ctx, '#f06595', 12 + 6 * Math.sin(t / 400 + i)); ctx.fillStyle = 'rgba(240,101,149,.22)'; ctx.strokeStyle = 'rgba(250,162,193,.8)'; ctx.fillRect(wx - 10 + (i % 2) * 4, y, 16, bh); ctx.strokeRect(wx - 10 + (i % 2) * 4, y, 16, bh); ctx.restore();
      }
      label(ctx, 'FIREWALL', wx, h - 4, { align: 'center', size: 10, weight: 800, color: '#fcc2d7' });
      // services
      const ports = [443, 80, 53, 22, 3389, 3306, 8080];
      ports.forEach((p, i) => {
        const y = 30 + (i * (h - 60)) / (ports.length - 1), open = res.exposed_ports.some((e) => e.port === p);
        ctx.save(); glow(ctx, open ? '#63e6be' : '#495057', open ? 16 : 0); ctx.fillStyle = open ? 'rgba(99,230,190,.25)' : 'rgba(73,80,87,.3)'; ctx.fillRect(dx - 22, y - 11, 64, 22); ctx.restore();
        label(ctx, `${p} ${{ 443: 'HTTPS', 80: 'HTTP', 53: 'DNS', 22: 'SSH', 3389: 'RDP', 3306: 'MySQL', 8080: 'Admin' }[p]}`, dx + 10, y, { align: 'center', size: 9, weight: 800, color: open ? '#c3fae8' : '#868e96' });
      });
      const portY = (p) => { const i = ports.indexOf(p); return i < 0 ? h - 30 : 30 + (i * (h - 60)) / (ports.length - 1); };
      // packets in flight
      const speed = 1 / 2200, spacing = 70;
      res.packets.forEach((p, i) => {
        const f = reducedMotion() ? 1.2 : (t - t0) * speed - i * (spacing / 1000) * 0.5;
        if (f < 0 || f > 1.3) return;
        const y0 = SRC_Y[p.src] * h + ((i * 37) % 30) - 15, yw = h * 0.1 + ((i * 53) % Math.round(h * 0.8));
        if (f < 0.5) {
          const u = f / 0.5, x = sx + 30 + (wx - 12 - sx - 30) * u, y = y0 + (yw - y0) * u;
          glowDot(ctx, x, y, 2.6, p.malicious ? '#ff8787' : '#8ce99a', 10);
        } else if (p.verdict === 'allow') {
          const u = Math.min(1, (f - 0.5) / 0.5), x = wx + 10 + (dx - 30 - wx - 10) * u, y = yw + (portY(p.port) - yw) * u;
          glowDot(ctx, x, y, 2.6, p.malicious ? '#ff6b6b' : '#69db7c', 14);
        } else {
          const u = (f - 0.5) / 0.8;
          for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + i; ctx.fillStyle = `rgba(255,107,107,${Math.max(0, 0.8 - u)})`; ctx.fillRect(wx - 14 - Math.cos(a) * u * 26, yw + Math.sin(a) * u * 26, 2.4, 2.4); }
        }
        if (p.alert && f > 0.5 && f < 0.9) label(ctx, '⚠ PORT SCAN', wx + 18, 18, { size: 11, weight: 800, color: '#ffe066' });
      });
    });
  }

  async function run() {
    const cfg = { preset: st.preset, ids: st.ids };
    if (st.rules) cfg.rules = st.rules;
    if (st.default) cfg.default = st.default;
    try { res = await api.lab('cyber/firewall', cfg, store.user?.id); } catch (e) { toast(esc(e.message), 'error'); return; }
    rules = res.rules.map((r) => ({ action: r.action, proto: r.proto, port: r.port, src: r.src, note: r.note || '' }));
    renderRules();
    t0 = tNow;
    const sc = $('[data-score]'); sc.textContent = `security score ${res.score}/100`; sc.className = `chip ${res.score >= 70 ? 'green' : res.score >= 40 ? 'amber' : 'red'}`;
    $('[data-metrics]').innerHTML = metric('Allowed', res.allowed) + metric('Blocked', res.blocked) + metric('Malicious let in', res.malicious_allowed, res.malicious_allowed ? 'bad' : 'good')
      + metric('Real users blocked', res.legit_blocked, res.legit_blocked ? 'bad' : 'good');
    $('[data-alerts]').innerHTML = `${res.alerts.length ? res.alerts.map((a) => `<div>🚨 ${esc(a)}</div>`).join('') : '<div class="faint">No alerts.</div>'}
      <div style="margin-top:8px"><b>Reachable services:</b> ${res.exposed_ports.map((p) => `<span class="chip ${[80, 443, 53].includes(p.port) ? 'gray' : 'red'}">${p.port} ${esc(p.service)}</span>`).join(' ') || 'none'}</div>`;
    $('[data-explain]').innerHTML = res.malicious_allowed
      ? `⚠️ ${res.malicious_allowed} malicious packets reached your servers. Databases (3306) and remote desktop (3389) should <b>never</b> face the internet. Follow <b>least privilege</b>: default deny, then allow only what you need.`
      : res.legit_blocked ? `No attacks got through, but ${res.legit_blocked} legitimate packets were blocked (e.g. office staff). Good security also keeps the business working.` : '✅ Clean: attacks blocked and real users served.';
    setLabContext('firewall', 'Firewall & IDS', [`Preset ${res.preset}, default ${res.default}, ${res.rules.length} rules: ${res.rules.map((r) => `${r.action} ${r.proto} ${r.port} from ${r.src} (${r.hits} hits)`).join('; ')}`,
      `${res.allowed} allowed, ${res.blocked} blocked, ${res.malicious_allowed} malicious allowed, ${res.legit_blocked} legitimate blocked, score ${res.score}`, `Exposed ports ${res.exposed_ports.map((p) => p.port).join(', ')}; alerts: ${res.alerts.join('; ') || 'none'}`]);
  }
  $('[data-run]').addEventListener('click', run);
  stop = loop((t) => { tNow = t; drawNet(t); });
  await run();
  return { getConfig: () => ({ ...st, rules }), destroy: () => { stop?.(); net.dispose(); } };
}
