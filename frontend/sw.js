// Q-3D Learn service worker: installable, offline-capable study desk.
// App shell -> cache first (refreshed in the background); API GETs -> network first with an offline fallback.
// Bump VERSION whenever the shell list changes (tests/test_pwa.py checks the list is complete).
const VERSION = 'q3d-v2.2.0';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/main.css',
  'assets/favicon.svg',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'vendor/three/three.module.min.js',
  'vendor/three/addons/OrbitControls.js',
  'js/api.js',
  'js/art.js',
  'js/charts.js',
  'js/circuit/code.js',
  'js/circuit/editor.js',
  'js/circuit/results.js',
  'js/components/chat.js',
  'js/labs/ai-minimax.js',
  'js/labs/ai-nlp.js',
  'js/labs/ai-rl.js',
  'js/labs/ai-search.js',
  'js/labs/bc-attack.js',
  'js/labs/bc-ledger.js',
  'js/labs/bc-merkle.js',
  'js/labs/cy-ciphers.js',
  'js/labs/cy-hashing.js',
  'js/labs/cy-rsa.js',
  'js/labs/dl-attention.js',
  'js/labs/dl-conv.js',
  'js/labs/dl-dream.js',
  'js/labs/ds-explorer.js',
  'js/labs/ds-pipeline.js',
  'js/labs/ds-stats.js',
  'js/labs/dsa-graphs.js',
  'js/labs/dsa-sorting.js',
  'js/labs/dsa-trees.js',
  'js/labs/kit.js',
  'js/labs/ml-classifier.js',
  'js/labs/ml-kmeans.js',
  'js/labs/ml-regression.js',
  'js/labs/neon.js',
  'js/labs/q-walk.js',
  'js/main.js',
  'js/quantum.js',
  'js/sky.js',
  'js/store.js',
  'js/study/focus.js',
  'js/study/glossary-tips.js',
  'js/study/notes.js',
  'js/study/palette.js',
  'js/study/settings.js',
  'js/three/bloch.js',
  'js/three/chain3d.js',
  'js/three/common.js',
  'js/three/landscape.js',
  'js/three/qsphere.js',
  'js/three/walk3d.js',
  'js/ui.js',
  'js/views/about.js',
  'js/views/algorithms.js',
  'js/views/builder.js',
  'js/views/certificate.js',
  'js/views/challenges.js',
  'js/views/course.js',
  'js/views/glossary.js',
  'js/views/home.js',
  'js/views/instructor.js',
  'js/views/lab.js',
  'js/views/labview.js',
  'js/views/learn.js',
  'js/views/notes.js',
  'js/views/progress.js',
  'js/views/review.js',
  'js/views/tutor.js',
];
const API_CACHE = `${VERSION}-api`;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // never cache writes
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(API_CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || new Response(JSON.stringify({ detail: 'You are offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } }))));
    return;
  }
  const sameOrigin = url.origin === location.origin;
  const cdn = /fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net/.test(url.host);
  if (!sameOrigin && !cdn) return; // e.g. live weather — always from the network
  e.respondWith(caches.match(req, { ignoreSearch: sameOrigin }).then((hit) => {
    const net = fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined));
    return hit || net;
  }));
});
