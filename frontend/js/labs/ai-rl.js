// AI lab: tabular Q-learning in a gridworld — values, policy arrows and reward curve over episodes.
import { api } from '../api.js';
import { store } from '../store.js';
import { icon, toast, hydrateIcons } from '../ui.js';
import { lineChart } from '../charts.js';
import { controls, Plot, Player, setLabContext, metric } from './kit.js';

export const meta = {
  howto: [
    'The agent starts at START and must reach the ★ GOAL (+10) without falling into a ✕ PIT (−10). Every step costs a little.',
    'Set the learning rate α, discount γ and exploration ε, then train.',
    'Scrub through episodes: cell colour = learned value, arrows = the current best action.',
    'Press “Watch the agent” to see the greedy policy walk to the goal.',
  ],
};

const ARROWS = ['↑', '→', '↓', '←'];

export async function mount(root, { preset = {}, lock = [] } = {}) {
  const st = { episodes: 300, alpha: 0.5, gamma: 0.95, epsilon: 0.3, epsilon_decay: 0.99, step_reward: -0.04, slip: 0, seed: 0, ...preset };
  let res = null;
  let snapIdx = 0;
  let agentPos = null;
  let walkTimer = null;
  root.innerHTML = `<div class="lab-grid three">
    <div class="stack"><div class="card controls" data-ctl></div>
      <button class="btn btn-course btn-lg" data-train>${icon('play')} Train agent</button>
      <button class="btn btn-ghost" data-walk>${icon('route')} Watch the agent</button></div>
    <div class="stack" style="min-width:0">
      <div class="board" style="padding:16px"><div class="row-between" style="margin-bottom:8px"><b>Gridworld</b><span class="chip gray" data-ep>—</span></div>
        <div data-plot></div><div data-player style="margin-top:10px;background:rgba(255,255,255,.06);border-color:var(--board-line)"></div></div>
      <div class="card"><div class="card-head"><h3>${icon('trend')} Reward per episode</h3></div><div data-curve></div></div>
    </div>
    <div class="stack"><div class="card"><div class="card-head"><h3>Results</h3></div><div class="metrics" data-metrics></div></div>
      <div class="card"><div class="card-head"><h3>The Q-learning update</h3></div><p class="small muted" style="margin:0">After every step:<br><code>Q(s,a) ← Q(s,a) + α·[r + γ·max Q(s′,·) − Q(s,a)]</code><br><br>α = how fast to learn · γ = how much the future matters · ε = how often to explore randomly.</p></div>
    </div></div>`;
  hydrateIcons(root);
  const $ = (s) => root.querySelector(s);
  controls($('[data-ctl]'), [
    { type: 'slider', key: 'episodes', label: 'Episodes', min: 10, max: 1500, step: 10 },
    { type: 'slider', key: 'alpha', label: 'Learning rate α', min: 0.01, max: 1, step: 0.01, fmt: (v) => v.toFixed(2) },
    { type: 'slider', key: 'gamma', label: 'Discount γ', min: 0.5, max: 0.99, step: 0.01, fmt: (v) => v.toFixed(2) },
    { type: 'slider', key: 'epsilon', label: 'Exploration ε', min: 0, max: 1, step: 0.01, fmt: (v) => v.toFixed(2) },
    { type: 'slider', key: 'epsilon_decay', label: 'ε decay per episode', min: 0.9, max: 1, step: 0.001, fmt: (v) => v.toFixed(3) },
    { type: 'slider', key: 'step_reward', label: 'Reward per step', min: -1, max: 0, step: 0.01, fmt: (v) => v.toFixed(2) },
    { type: 'slider', key: 'slip', label: 'Slippery floor', min: 0, max: 0.4, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%`, help: 'Chance an action goes in a random direction.' },
  ], st, (k, v, live) => { if (!live) train(); }, { lock });

  const plot = new Plot($('[data-plot]'), { aspect: 0.6 });
  const player = new Player($('[data-player]'), { fps: 6, label: (i) => (res ? `episode ${res.snapshots[i].episode}` : '—') });

  function draw() {
    plot.draw((ctx, w, h) => {
      if (!res) return;
      const W = res.world;
      const cs = Math.min(w / W.cols, h / W.rows);
      const ox = (w - cs * W.cols) / 2, oy = (h - cs * W.rows) / 2;
      const snap = res.snapshots[snapIdx];
      const walls = new Set(W.walls.map((p) => p.join())), pits = new Set(W.pits.map((p) => p.join()));
      const vals = snap.values.flat();
      const vmax = Math.max(1e-6, ...vals.map(Math.abs));
      for (let r = 0; r < W.rows; r++) for (let c = 0; c < W.cols; c++) {
        const x = ox + c * cs, y = oy + r * cs, k = `${r},${c}`;
        if (walls.has(k)) { ctx.fillStyle = '#5c4a38'; ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2); continue; }
        const v = snap.values[r][c] / vmax;
        ctx.fillStyle = v >= 0 ? `rgba(56,217,169,${0.08 + 0.6 * v})` : `rgba(255,107,107,${0.08 + 0.6 * -v})`;
        ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
        ctx.strokeStyle = 'rgba(233,241,238,.12)';
        ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
        const isGoal = k === W.goal.join(), isPit = pits.has(k);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (isGoal || isPit) {
          ctx.fillStyle = isGoal ? 'rgba(255,212,59,.9)' : 'rgba(224,49,49,.85)';
          ctx.fillRect(x + 4, y + 4, cs - 8, cs - 8);
          ctx.fillStyle = isGoal ? '#3b2f00' : '#fff';
          ctx.font = `800 ${cs * 0.22}px Inter, sans-serif`;
          ctx.fillText(isGoal ? '★ GOAL' : '✕ PIT', x + cs / 2, y + cs / 2);
        } else if (Math.abs(snap.values[r][c]) > 1e-6) {
          ctx.fillStyle = '#e9f1ee';
          ctx.font = `700 ${cs * 0.34}px Inter, sans-serif`;
          ctx.fillText(ARROWS[snap.policy[r][c]], x + cs / 2, y + cs * 0.42);
          ctx.font = `${cs * 0.17}px JetBrains Mono, monospace`;
          ctx.fillStyle = 'rgba(233,241,238,.7)';
          ctx.fillText(snap.values[r][c].toFixed(1), x + cs / 2, y + cs * 0.78);
        }
        if (k === W.start.join()) { ctx.font = `700 ${cs * 0.2}px Inter`; ctx.fillStyle = '#ffd43b'; ctx.fillText('START', x + cs / 2, y + cs * 0.12 + 4); }
      }
      if (agentPos) {
        const ax = ox + (agentPos[1] + 0.5) * cs, ay = oy + (agentPos[0] + 0.5) * cs;
        ctx.fillStyle = '#74c0fc';
        ctx.beginPath(); ctx.arc(ax, ay, cs * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#10171a';
        ctx.font = `800 ${cs * 0.28}px Inter, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('A', ax, ay + 1);
      }
    });
  }

  function show(i) {
    snapIdx = i;
    draw();
    $('[data-ep]').textContent = `episode ${res.snapshots[i].episode} · ε ${res.snapshots[i].epsilon}`;
    lineChart($('[data-curve]'), [
      { name: 'reward', color: 'var(--text-3)', values: res.rewards, width: 1 },
      { name: 'moving average (20)', color: 'var(--course)', values: res.rewards.map((_, j) => { const s = res.rewards.slice(Math.max(0, j - 19), j + 1); return s.reduce((a, b) => a + b, 0) / s.length; }) },
    ], { height: 180, xs: res.rewards.map((_, j) => j + 1), xLabel: 'episode', marker: res.snapshots[i].episode });
  }

  async function train() {
    clearInterval(walkTimer); agentPos = null;
    try {
      res = await api.lab('ai/qlearn', st, store.user?.id);
      player.load(res.snapshots.length, show);
      const f = res.final;
      $('[data-metrics]').innerHTML = metric('Success (last 50)', `${Math.round(f.success_rate_last50 * 100)}%`, f.success_rate_last50 >= 0.9 ? 'good' : f.success_rate_last50 < 0.5 ? 'bad' : '')
        + metric('Avg reward (last 50)', f.avg_reward_last50) + metric('Greedy reaches goal', res.greedy_reaches_goal ? 'yes ✓' : 'no ✗', res.greedy_reaches_goal ? 'good' : 'bad') + metric('Greedy path', `${f.greedy_steps} steps`);
      setLabContext('rl', 'Q-learning gridworld', [
        `Settings: ${st.episodes} episodes, α=${st.alpha}, γ=${st.gamma}, ε=${st.epsilon} (decay ${st.epsilon_decay}), step reward ${st.step_reward}, slip ${st.slip}`,
        `Success rate over the last 50 episodes: ${Math.round(f.success_rate_last50 * 100)}%, average reward ${f.avg_reward_last50}`,
        `Greedy policy ${res.greedy_reaches_goal ? `reaches the goal in ${f.greedy_steps} steps` : 'does NOT reach the goal yet'}`,
      ]);
    } catch (e) { toast(e.message, 'error'); }
  }

  $('[data-train]').addEventListener('click', () => { st.seed += 1; train(); });
  $('[data-walk]').addEventListener('click', () => {
    if (!res) return;
    player.show(res.snapshots.length - 1);
    clearInterval(walkTimer);
    let k = 0;
    walkTimer = setInterval(() => {
      if (!root.isConnected || k >= res.greedy_path.length) { clearInterval(walkTimer); if (root.isConnected) toast(res.greedy_reaches_goal ? 'The agent reached the goal! 🏁' : 'The agent got stuck — train longer or explore more.', res.greedy_reaches_goal ? 'success' : 'info'); return; }
      agentPos = res.greedy_path[k++];
      draw();
    }, 260);
  });
  train();
  return { getConfig: () => ({ ...st }), destroy: () => { clearInterval(walkTimer); plot.dispose(); player.pause(); } };
}
