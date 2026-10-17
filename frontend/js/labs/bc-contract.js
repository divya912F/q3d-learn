// Blockchain lab: Smart contracts — run a token contract transaction by transaction, or watch the re-entrancy bug drain a bank.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { controls, Plot, Player, setLabContext, metric } from './kit.js';
import { space, glow, glowDot, glowLine, label, loop, reducedMotion, rgba, hue, TAU } from './neon.js';

export const meta = {
  howto: [
    'Token mode runs an ERC-20-style contract line by line. Each call updates balances, costs gas, and either succeeds or reverts (leaving state untouched).',
    'The supply invariant (sum of balances = total minted) must always hold — the contract enforces it.',
    'Switch to re-entrancy mode: a buggy Bank sends coins before marking you as paid, so the attacker’s fallback calls withdraw() again and again.',
    'Turn on “checks-effects-interactions” to apply the fix and watch the same attack revert on the second call.',
  ],
};
const DEFAULT = 'mint divya 100\ntransfer divya kabir 30\ntransfer kabir diya 10\ntransfer diya kabir 50\napprove divya shop 20\ntransferFrom shop divya diya 15\nburn kabir 5';

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { scenario: 'token', transactions: DEFAULT, fixed: false, bank_funds: 30, attacker_deposit: 5, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <div class="card card-tight" data-tokctl><b>Transactions</b><textarea class="input code-mini" data-tx rows="7" style="margin-top:6px;width:100%;font-size:12px">${esc(st.transactions)}</textarea><span class="faint tiny">mint · transfer · approve · transferFrom · burn</span></div>
      <button class="btn btn-course" data-run>${icon('play')} Deploy & run</button>
      <div class="card card-tight sticky small" data-explain></div></div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3><span data-title>Token balances</span></h3><span class="chip gray" data-head></span></div><div data-stage></div><div data-player style="margin-top:10px"></div></div>
      <div class="card"><div class="card-head"><h3>State</h3></div><div class="metrics" data-metrics></div><div data-log class="small" style="margin-top:8px;max-height:150px;overflow:auto"></div></div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  const ctl = controls($('[data-ctl]'), [
    { type: 'seg', key: 'scenario', label: 'Contract', options: [['token', 'ERC-20 token'], ['reentrancy', 'Re-entrancy attack']] },
    { type: 'toggle', key: 'fixed', label: 'Apply the fix (checks-effects-interactions)', show: (s) => s.scenario === 'reentrancy' },
    { type: 'slider', key: 'bank_funds', label: 'Honest funds in the bank', min: 5, max: 200, show: (s) => s.scenario === 'reentrancy' },
    { type: 'slider', key: 'attacker_deposit', label: 'Attacker deposit', min: 1, max: 50, show: (s) => s.scenario === 'reentrancy' },
  ], st, (k, v, live) => { if (k === 'scenario') $('[data-tokctl]').style.display = v === 'token' ? '' : 'none'; if (!live) run(); }, { lock });
  $('[data-tx]').addEventListener('change', (e) => { st.transactions = e.target.value; });
  $('[data-tokctl]').style.display = st.scenario === 'token' ? '' : 'none';

  const stage = new Plot($('[data-stage]'), { height: 360 });
  const player = new Player($('[data-player]'), { fps: 1.4, label: (i, n) => `step ${i + 1}/${n}` });
  let res = null, frame = 0, stop = null;

  function drawToken(t) {
    stage.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#d49b00', stars: 40, t });
      if (!res) return;
      const step = res.steps[Math.min(frame, res.steps.length - 1)];
      const accts = res.accounts.length ? res.accounts : Object.keys(step.balances);
      const bal = step.balances, max = Math.max(1, ...Object.values(bal));
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 60;
      accts.forEach((a, i) => {
        const ang = -Math.PI / 2 + (i / accts.length) * TAU, x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R;
        const v = bal[a] || 0, size = 14 + 26 * (v / max);
        const c = hue(i, accts.length);
        glowDot(ctx, x, y, size, c, 18);
        label(ctx, a, x, y - size - 8, { align: 'center', size: 11, weight: 800, color: c });
        label(ctx, String(v), x, y, { align: 'center', size: 13, weight: 800, color: '#1a1205' });
      });
      // animate the current transfer as a travelling coin
      (step.events || []).forEach((e) => {
        const from = accts.indexOf(e.from), to = accts.indexOf(e.to);
        const pa = from < 0 ? [cx, cy] : pos(from), pb = to < 0 ? [cx, cy] : pos(to);
        glowLine(ctx, [pa, pb], 'rgba(255,224,102,.5)', 1.5, 8);
        const f = reducedMotion() ? 0.5 : ((t / 900) % 1);
        glowDot(ctx, pa[0] + (pb[0] - pa[0]) * f, pa[1] + (pb[1] - pa[1]) * f, 5, '#ffe066', 20);
      });
      function pos(i) { const ang = -Math.PI / 2 + (i / accts.length) * TAU; return [cx + Math.cos(ang) * R, cy + Math.sin(ang) * R]; }
      label(ctx, `total supply ${step.supply}`, 12, 16, { size: 11, weight: 800, color: '#ffe066' });
      label(ctx, step.ok ? `✓ ${esc(step.tx)}` : `✗ reverted: ${esc(step.tx)}`, 12, h - 12, { size: 11, color: step.ok ? '#8ce99a' : '#ffa8a8' });
    });
  }

  function drawReentrancy(t) {
    stage.draw((ctx, w, h) => {
      space(ctx, w, h, { tint: '#d49b00', stars: 40, t });
      if (!res) return;
      const fr = res.frames.slice(0, Math.min(frame + 1, res.frames.length));
      const bankX = w * 0.26, attX = w * 0.74;
      // bank vault + attacker
      const cur = fr[fr.length - 1] || res.frames[0];
      const vh = Math.max(4, (cur.bank / res.bank_start) * (h * 0.4));
      ctx.save(); glow(ctx, '#63e6be', 16); ctx.fillStyle = 'rgba(99,230,190,.25)'; ctx.fillRect(bankX - 44, h - 50 - vh, 88, vh); ctx.strokeStyle = '#63e6be'; ctx.strokeRect(bankX - 44, h - 50 - (h * 0.4), 88, h * 0.4); ctx.restore();
      label(ctx, `Bank: ${cur.bank} ETH`, bankX, h - 36, { align: 'center', size: 12, weight: 800, color: '#c3fae8' });
      glowDot(ctx, attX, h * 0.3, 26, res.stolen > res.deposit ? '#ff6b6b' : '#ffa94d', 24);
      label(ctx, '😈 attacker', attX, h * 0.3 - 36, { align: 'center', size: 12, weight: 800, color: '#ffc9c9' });
      label(ctx, `stolen ${cur.stolen}`, attX, h * 0.3 + 2, { align: 'center', size: 12, weight: 800, color: '#fff' });
      // call stack as stacked frames
      fr.forEach((f, i) => {
        if (i === 0) return;
        const y = 24 + i * 26; if (y > h - 70) return;
        const re = f.call.includes('withdraw'), send = f.call.includes('send');
        const c = f.call.startsWith('revert') || f.call.startsWith('stop') ? '#868e96' : re ? '#ff8787' : send ? '#ffd43b' : '#74c0fc';
        ctx.fillStyle = rgba(c, 0.18); ctx.fillRect(w * 0.12 + f.depth * 16, y, w * 0.76 - f.depth * 16, 22);
        label(ctx, `${'→'.repeat(Math.min(6, f.depth))} ${esc(f.call)}`, w * 0.12 + f.depth * 16 + 6, y + 11, { size: 10.5, color: c });
      });
    });
  }

  function update() {
    if (st.scenario === 'token') {
      const step = res.steps[Math.min(frame, res.steps.length - 1)];
      $('[data-head]').textContent = `gas ${res.total_gas.toLocaleString()}`;
      $('[data-metrics]').innerHTML = metric('Total supply', step.supply) + metric('Invariant holds', res.invariant_holds ? 'yes ✓' : 'no', res.invariant_holds ? 'good' : 'bad') + metric('Reverted calls', res.reverted, res.reverted ? '' : 'good') + metric('Gas used', res.total_gas.toLocaleString());
      $('[data-log]').innerHTML = res.steps.map((s, i) => `<div style="opacity:${i <= frame ? 1 : 0.35}">${s.ok ? '✓' : '<span style="color:var(--red)">✗</span>'} <code>${esc(s.tx)}</code> ${s.ok ? `<span class="faint">${s.gas} gas</span>` : `<span class="faint">${esc(s.message)}</span>`}</div>`).join('');
    } else {
      const cur = res.frames[Math.min(frame, res.frames.length - 1)];
      $('[data-head]').textContent = `depth ${cur.depth}`;
      $('[data-metrics]').innerHTML = metric('Stolen', res.stolen, res.stolen > res.deposit ? 'bad' : 'good') + metric('Attacker profit', res.profit, res.profit > 0 ? 'bad' : 'good') + metric('Re-entries', res.max_depth, res.max_depth > 1 ? 'bad' : 'good') + metric('Honest users lost', res.honest_users_lost, res.honest_users_lost ? 'bad' : 'good');
    }
  }

  async function run() {
    const cfg = st.scenario === 'token' ? { scenario: 'token', transactions: $('[data-tx]').value } : { scenario: 'reentrancy', fixed: st.fixed, bank_funds: st.bank_funds, attacker_deposit: st.attacker_deposit };
    try { res = await api.lab('chain/contract', cfg, store.user?.id); } catch (e) { toast(esc(e.message), 'error'); return; }
    $('[data-title]').textContent = st.scenario === 'token' ? 'Token balances' : 'Bank vault & call stack';
    const n = st.scenario === 'token' ? res.steps.length : res.frames.length;
    player.load(n, (i) => { frame = i; update(); });
    if (st.scenario === 'token') {
      $('[data-explain]').innerHTML = `A smart contract is code that runs exactly as written on every node. This token enforces its rules automatically: a transfer bigger than your balance <b>reverts</b> (${res.reverted} did), and the total supply always equals the sum of balances (${res.invariant_holds ? '✓' : '✗'}). Each storage write costs <b>gas</b>.`;
    } else {
      $('[data-explain]').innerHTML = res.fixed
        ? `✅ Fixed: the bank sets your balance to 0 <b>before</b> sending (checks-effects-interactions). When the attacker’s fallback calls withdraw() again, there is nothing left to take — it reverts. Profit: ${res.profit}.`
        : `💀 The bank sends coins <b>before</b> recording the withdrawal, so the attacker’s fallback re-enters withdraw() ${res.max_depth} times on the same balance and drains <b>${res.stolen}</b> ETH (profit ${res.profit}). This is the 2016 “DAO” hack in miniature. Turn on the fix.`;
    }
    update();
  }
  $('[data-run]').addEventListener('click', run);
  stop = loop((t) => (st.scenario === 'token' ? drawToken(t) : drawReentrancy(t)));
  await run();
  return { getConfig: () => ({ ...st }), destroy: () => { stop?.(); player.pause(); stage.dispose(); } };
}
