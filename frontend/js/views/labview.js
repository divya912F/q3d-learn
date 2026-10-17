// Generic page wrapper for the ML / Data Science / AI visual labs.
import { store } from '../store.js';
import { esc, icon, hydrateIcons } from '../ui.js';
import { openDrawer, takeLabPreset } from '../main.js';

export const LAB_MODULES = {
  ml: { regression: () => import('../labs/ml-regression.js'), classifier: () => import('../labs/ml-classifier.js'), kmeans: () => import('../labs/ml-kmeans.js'), pca: () => import('../labs/ml-pca.js'), metrics: () => import('../labs/ml-metrics.js') },
  ds: { explorer: () => import('../labs/ds-explorer.js'), pipeline: () => import('../labs/ds-pipeline.js'), stats: () => import('../labs/ds-stats.js'), abtest: () => import('../labs/ds-abtest.js'), timeseries: () => import('../labs/ds-timeseries.js') },
  ai: { search: () => import('../labs/ai-search.js'), minimax: () => import('../labs/ai-minimax.js'), rl: () => import('../labs/ai-rl.js'), nlp: () => import('../labs/ai-nlp.js'), genetic: () => import('../labs/ai-genetic.js'), nqueens: () => import('../labs/ai-nqueens.js') },
  quantum: { walk: () => import('../labs/q-walk.js'), interference: () => import('../labs/q-interference.js'), chsh: () => import('../labs/q-chsh.js') },
  dsa: { sorting: () => import('../labs/dsa-sorting.js'), graphs: () => import('../labs/dsa-graphs.js'), trees: () => import('../labs/dsa-trees.js'), dp: () => import('../labs/dsa-dp.js'), recursion: () => import('../labs/dsa-recursion.js') },
  cyber: { ciphers: () => import('../labs/cy-ciphers.js'), hashing: () => import('../labs/cy-hashing.js'), rsa: () => import('../labs/cy-rsa.js'), firewall: () => import('../labs/cy-firewall.js'), phishing: () => import('../labs/cy-phishing.js') },
  chain: { ledger: () => import('../labs/bc-ledger.js'), merkle: () => import('../labs/bc-merkle.js'), attack: () => import('../labs/bc-attack.js'), ecc: () => import('../labs/bc-ecc.js'), contract: () => import('../labs/bc-contract.js') },
  dl: { conv: () => import('../labs/dl-conv.js'), attention: () => import('../labs/dl-attention.js'), dream: () => import('../labs/dl-dream.js'), diffusion: () => import('../labs/dl-diffusion.js'), embeddings: () => import('../labs/dl-embeddings.js') },
};

export async function render(root, { params, course }) {
  const labId = params[0];
  const meta = store.courseMeta(course);
  const lab = meta?.labs.find((l) => l.id === labId);
  const loader = LAB_MODULES[course]?.[labId];
  if (!lab || !loader) {
    root.innerHTML = '<div class="card empty">This lab does not exist.</div>';
    return undefined;
  }
  const mod = await loader();
  root.innerHTML = `
    <div class="lab-head">
      <div><span class="hand" style="font-size:1.3rem;color:var(--course)">${esc(meta.title)} lab</span><h2>${esc(lab.title)}</h2><p>${esc(lab.description)}</p></div>
      <div class="row"><button class="btn btn-violet" data-ask>${icon('bot')} Ask Q-Bot about my result</button></div>
    </div>
    <details class="card card-tight" style="margin-bottom:16px" ${sessionStorage.getItem(`q3d-howto-${course}-${labId}`) ? '' : 'open'} data-howto>
      <summary style="cursor:pointer;font-weight:600">${icon('bulb')} How to use this lab</summary>
      <ol class="howto" style="margin-top:12px">${mod.meta.howto.map((h) => `<li>${esc(h)}</li>`).join('')}</ol>
    </details>
    <div data-lab></div>`;
  hydrateIcons(root);
  root.querySelector('[data-howto]').addEventListener('toggle', (e) => { if (!e.target.open) sessionStorage.setItem(`q3d-howto-${course}-${labId}`, '1'); });
  root.querySelector('[data-ask]').addEventListener('click', () => openDrawer(`Explain my latest result in the ${lab.title} — what does it show and what should I try next?`));
  const inst = await mod.mount(root.querySelector('[data-lab]'), { preset: takeLabPreset(course, labId) });
  return () => inst?.destroy?.();
}
