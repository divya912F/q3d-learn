// Blockchain lab: Chain Builder & Miner — a 3D chain of glowing blocks with editable data and real proof-of-work.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, toast, hydrateIcons, debounce } from '../ui.js';
import { controls, setLabContext, metric } from './kit.js';

export const meta = {
  howto: [
    'Every block stores data, a nonce and the previous block’s hash. A block is valid only if its SHA-256 hash starts with enough zeros.',
    'Edit the data in any block: its hash changes, the zeros disappear and every later block turns red.',
    'Press ⛏ Mine on a block to search for a nonce that makes its hash valid again — then repair the blocks after it.',
    'Raise the difficulty: each extra zero means about 16× more attempts.',
  ],
};

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { difficulty: 3, ...preset };
  root.innerHTML = `<div class="lab-grid">
    <div class="stack"><div class="card controls" data-ctl></div>
      <div class="row"><button class="btn btn-course grow" data-mineall>⛏ Mine whole chain</button></div>
      <div class="row"><button class="btn btn-ghost grow" data-add>${icon('plus')} Add block</button><button class="icon-btn" data-reset title="Fresh chain">${icon('reset')}</button></div>
      <div class="card card-tight sticky small" data-explain>Changing history means redoing the proof of work for <b>every</b> block after the change — faster than the rest of the network. That's what makes a blockchain tamper-evident.</div>
    </div>
    <div class="stack" style="min-width:0">
      <div class="card board neon-card"><div class="card-head"><h3>${icon('cube')} The chain</h3><span class="chip gray" data-status></span></div>
        <div class="chain-stage" data-stage></div><p class="faint tiny" style="margin:8px 0 0">Drag to orbit · scroll to zoom</p></div>
      <div class="block-row" data-blocks></div>
      <div class="card"><div class="card-head"><h3>Mining log</h3></div><div class="metrics" data-metrics><div class="empty small">Mine a block to see how many hashes it took.</div></div></div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  controls($('[data-ctl]'), [
    { type: 'slider', key: 'difficulty', label: 'Difficulty (leading zeros)', min: 1, max: 4, help: 'Expected attempts = 16^difficulty' },
  ], st, (k, v, live) => { if (!live) recompute(); }, { lock });

  let scene = null;
  try {
    const { ChainScene } = await import('../three/chain3d.js');
    scene = new ChainScene($('[data-stage]'));
  } catch { $('[data-stage]').innerHTML = '<div class="empty small">3D view unavailable — the cards below still work.</div>'; }

  let chain = null;
  let blocks = (preset.blocks || []).map((b) => ({ data: b.data, nonce: b.nonce }));
  let busy = false;

  async function call(extra = {}) {
    const res = await api.lab('chain/ledger', { blocks: blocks.length ? blocks : null, difficulty: st.difficulty, ...extra }, store.user?.id);
    chain = res;
    blocks = res.blocks.map((b) => ({ data: b.data, nonce: b.nonce }));
    render();
    return res;
  }

  function render() {
    scene?.setBlocks(chain.blocks);
    $('[data-status]').innerHTML = chain.valid ? '✅ chain valid' : `❌ broken from block #${chain.first_invalid}`;
    $('[data-blocks]').innerHTML = chain.blocks.map((b) => {
      const zeros = '0'.repeat(chain.difficulty);
      const hh = b.hash.startsWith(zeros) ? `<b class="zeros">${zeros}</b>${b.hash.slice(chain.difficulty, 22)}…` : `${b.hash.slice(0, 22)}…`;
      return `<div class="block-card ${b.valid ? 'ok' : 'bad'}" data-i="${b.index}">
        <div class="row-between"><b>Block #${b.index}</b><span class="chip ${b.valid ? 'green' : 'red'}">${b.valid ? 'valid' : b.pow_ok ? 'after a broken block' : 'invalid hash'}</span></div>
        <label class="field">Data<textarea class="input mono" rows="2" data-data>${esc(b.data)}</textarea></label>
        <div class="kv-line"><span>nonce</span><b class="mono">${b.nonce}</b></div>
        <div class="kv-line"><span>prev</span><span class="mono tiny">${b.prev.slice(0, 18)}…</span></div>
        <div class="kv-line"><span>hash</span><span class="mono tiny hashline">${hh}</span></div>
        <button class="btn ${b.valid ? 'btn-ghost' : 'btn-course'} btn-sm" data-mine>⛏ Mine #${b.index}</button></div>`;
    }).join('');
    $('[data-blocks]').querySelectorAll('[data-i]').forEach((card) => {
      const i = +card.dataset.i;
      card.querySelector('[data-data]').addEventListener('input', debounce((e) => { blocks[i].data = e.target.value; recompute(); }, 400));
      card.querySelector('[data-mine]').addEventListener('click', () => mineOne(i, card));
    });
    setLabContext('ledger', 'Chain builder', [
      `Chain of ${chain.blocks.length} blocks at difficulty ${chain.difficulty} (hash must start with ${'0'.repeat(chain.difficulty)}; ~${chain.expected_attempts} attempts per block on average)`,
      chain.valid ? 'All blocks are valid' : `Block #${chain.first_invalid} is the first invalid block; every block after it is untrusted`,
      ...chain.blocks.map((b) => `Block #${b.index}: data "${b.data}", nonce ${b.nonce}, hash ${b.hash.slice(0, 16)}…, ${b.valid ? 'valid' : 'invalid'}`),
    ]);
  }

  const recompute = debounce(async () => { try { await call(); } catch (e) { toast(esc(e.message), 'error'); } }, 80);

  function scrambler(card) { // "unreal" hash rain while mining
    const line = card.querySelector('.hashline');
    const hex = '0123456789abcdef';
    const id = setInterval(() => { line.textContent = Array.from({ length: 22 }, () => hex[Math.floor(Math.random() * 16)]).join('') + '…'; }, 45);
    return () => clearInterval(id);
  }

  async function mineOne(i, card) {
    if (busy) return;
    busy = true;
    card.classList.add('mining');
    scene?.setMining(i);
    const stopScramble = scrambler(card);
    try {
      const res = await call({ mine_index: i });
      const m = res.mined[0];
      $('[data-metrics]').innerHTML = metric('Block', `#${m.index}`) + metric('Attempts', m.attempts.toLocaleString()) + metric('Time', `${m.seconds}s`) + metric('Expected', `~${res.expected_attempts.toLocaleString()}`)
        + metric('Found', m.found ? 'yes' : 'gave up', m.found ? 'good' : 'bad');
      toast(`Block #${i} mined in ${m.attempts.toLocaleString()} attempts`, 'success', 2000);
    } catch (e) { toast(esc(e.message), 'error'); }
    stopScramble();
    scene?.setMining(-1);
    busy = false;
  }

  $('[data-mineall]').addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    scene?.setMining(0);
    try {
      const res = await call({ mine_all: true });
      const total = res.mined.reduce((s, m) => s + m.attempts, 0);
      $('[data-metrics]').innerHTML = metric('Blocks mined', res.mined.length) + metric('Total attempts', total.toLocaleString()) + metric('Time', `${res.mined.reduce((s, m) => s + m.seconds, 0).toFixed(2)}s`) + metric('Difficulty', res.difficulty);
    } catch (e) { toast(esc(e.message), 'error'); }
    scene?.setMining(-1);
    busy = false;
  });
  $('[data-add]').addEventListener('click', () => {
    if (blocks.length >= 8) { toast('Up to 8 blocks in this lab.', 'info'); return; }
    blocks.push({ data: `Payment #${blocks.length}: ${['Tara', 'Neel', 'Ishita', 'Arjun'][blocks.length % 4]} pays 1 coin`, nonce: 0 });
    recompute();
  });
  $('[data-reset]').addEventListener('click', async () => { blocks = []; await call(); });

  await call(blocks.length ? {} : {});
  if (preset.tamper != null && blocks[preset.tamper]) {
    blocks[preset.tamper].data += ' (edited!)';
    await call();
    toast(`Block #${preset.tamper} was edited — look at the colours.`, 'info', 4000);
  }
  return { getConfig: () => ({ blocks, difficulty: st.difficulty }), destroy: () => scene?.dispose() };
}
