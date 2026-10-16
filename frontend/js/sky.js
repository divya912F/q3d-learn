// Living Sky — an ambient, weather-aware backdrop for the study desk.
//
// The sky follows the learner's local time (dawn → day → golden hour → dusk → night) and, if they opt in,
// their real local weather from Open-Meteo (no API key, nothing stored on our server). Learners can also
// pick a mood by hand (rain, snow, storm, fog, aurora, "quantum night"). Colours are blended with the
// paper / night-study theme so text stays readable, and everything pauses when the tab is hidden or the
// learner prefers reduced motion.

const KEYS = [ // [hour, top, bottom] — a real-world sky over a day
  [0, '#0b1026', '#1c2541'], [4.5, '#141a3a', '#2c2f55'], [5.8, '#2e3b6e', '#c98579'], [7, '#5a86cf', '#f4cfa0'],
  [9.5, '#4a8fe0', '#a7d1f4'], [13, '#3c8ae0', '#b8dcf7'], [16, '#4a86d0', '#ead7ad'], [17.8, '#3d5596', '#f29a64'],
  [19, '#272c5a', '#a05f78'], [20.3, '#121836', '#2a2f5c'], [24, '#0b1026', '#1c2541'],
];
const WEATHER_TINT = { clear: null, cloudy: ['#9aa5b1', 0.32], rain: ['#66727f', 0.5], storm: ['#39414d', 0.66], snow: ['#cfd8e2', 0.42], fog: ['#c9cbc6', 0.6] };
export const MOODS = {
  auto: { label: 'Auto', icon: '✨', hint: 'Follows your time of day (and weather, if enabled)' },
  clear: { label: 'Clear', icon: '☀️' }, cloudy: { label: 'Cloudy', icon: '⛅' }, rain: { label: 'Rain', icon: '🌧️' },
  storm: { label: 'Storm', icon: '⛈️' }, snow: { label: 'Snow', icon: '❄️' }, fog: { label: 'Fog', icon: '🌫️' },
  aurora: { label: 'Aurora', icon: '🌌' }, quantum: { label: 'Quantum night', icon: '⚛️' },
};
const PHASES = [[5, 'Night'], [7, 'Dawn'], [11, 'Morning'], [16, 'Afternoon'], [18.3, 'Golden hour'], [20, 'Dusk'], [24, 'Night']];
const WMO = (c) => (c === 0 ? 'clear' : c <= 2 ? 'cloudy-light' : c === 3 ? 'cloudy' : c <= 48 ? 'fog' : c <= 67 ? 'rain'
  : c <= 77 ? 'snow' : c <= 82 ? 'rain' : c <= 86 ? 'snow' : 'storm');
const WEATHER_WORDS = { clear: 'clear skies', 'cloudy-light': 'a few clouds', cloudy: 'cloudy', fog: 'foggy', rain: 'raining', snow: 'snowing', storm: 'stormy' };

/* ------------------------------------------------------------------ colour helpers */
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const rgb = (c, a = 1) => `rgba(${c.map((v) => Math.round(v)).join(',')},${a})`;

function toHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const dd = mx - mn, s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn);
  const h = mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4;
  return [h / 6, s, l];
}
function fromHsl(h, s, l) {
  const f = (n) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); };
  return [f(0), f(8), f(4)];
}

function skyAt(hour) {
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [h0, t0, b0] = KEYS[i], [h1, t1, b1] = KEYS[i + 1];
    if (hour >= h0 && hour <= h1) { const t = (hour - h0) / (h1 - h0); return [mix(hex(t0), hex(t1), t), mix(hex(b0), hex(b1), t)]; }
  }
  return [hex(KEYS[0][1]), hex(KEYS[0][2])];
}
const dayness = (h) => Math.max(0, Math.min(1, Math.min((h - 5.5) / 2, (20 - h) / 2))); // 0 night … 1 day

/* ------------------------------------------------------------------ state */
const LS = 'q3d-sky:v1';
let cfg = { mood: 'auto', live: false, place: null, enabled: true, sound: 'off', volume: 0.35 };
try { cfg = { ...cfg, ...JSON.parse(localStorage.getItem(LS) || '{}') }; } catch { /* private mode */ }
let live = null; // {code, kind, temp, is_day, at}
try { live = JSON.parse(localStorage.getItem(`${LS}:wx`) || 'null'); } catch { /* ignore */ }
const listeners = new Set();
const save = () => { try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch { /* ignore */ } };
const emit = () => listeners.forEach((fn) => fn(info()));
export const onSkyChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const skyConfig = () => ({ ...cfg });

function hourNow() { const d = new Date(); return d.getHours() + d.getMinutes() / 60; }

export function weatherKind() {
  if (cfg.mood !== 'auto') return cfg.mood;
  if (cfg.live && live) return live.kind === 'cloudy-light' ? 'cloudy' : live.kind;
  return 'clear';
}

export function info() {
  const h = hourNow();
  const phase = PHASES.find(([end]) => h < end)?.[1] || 'Night';
  const kind = weatherKind();
  const night = dayness(h) < 0.35;
  const icon = { clear: night ? '🌙' : '☀️', cloudy: night ? '☁️' : '⛅', rain: '🌧️', storm: '⛈️', snow: '❄️', fog: '🌫️', aurora: '🌌', quantum: '⚛️' }[kind] || '✨';
  const usingLive = cfg.mood === 'auto' && cfg.live && live;
  return {
    phase, kind, icon, night, mood: cfg.mood, live: usingLive ? live : null, place: cfg.place, enabled: cfg.enabled,
    words: usingLive ? WEATHER_WORDS[live.kind] : null, temp: usingLive ? live.temp : null,
  };
}

export function setSky(patch) {
  cfg = { ...cfg, ...patch };
  save();
  if (patch.live === true || patch.place) refreshWeather(true);
  if ('sound' in patch || 'volume' in patch) sound.update();
  if ('enabled' in patch) canvas && (canvas.hidden = !cfg.enabled);
  rebuild();
  emit();
}

/* ------------------------------------------------------------------ live weather (Open-Meteo, keyless) */
export async function refreshWeather(force = false) {
  if (!cfg.live || !cfg.place) return;
  if (!force && live && Date.now() - live.at < 30 * 60e3) return;
  try {
    const { lat, lon } = cfg.place;
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`);
    const j = await r.json();
    live = { code: j.current.weather_code, kind: WMO(j.current.weather_code), temp: Math.round(j.current.temperature_2m), is_day: j.current.is_day, at: Date.now() };
    localStorage.setItem(`${LS}:wx`, JSON.stringify(live));
    rebuild();
    emit();
  } catch { /* offline — keep the time-of-day sky */ }
}

export async function findCity(name) {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=en&format=json`);
  const j = await r.json();
  return (j.results || []).map((x) => ({ name: [x.name, x.admin1, x.country_code].filter(Boolean).join(', '), lat: x.latitude, lon: x.longitude }));
}

export function useMyLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Location is not available in this browser')); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      const place = { name: 'your location', lat: +pos.coords.latitude.toFixed(3), lon: +pos.coords.longitude.toFixed(3) };
      setSky({ live: true, place });
      resolve(place);
    }, () => reject(new Error('Location permission was denied')), { timeout: 10000, maximumAge: 3600e3 });
  });
}

/* ------------------------------------------------------------------ rendering */
let canvas, ctx, W = 0, H = 0, dpr = 1, raf = 0, last = 0;
let parts = { clouds: [], drops: [], flakes: [], stars: [], fog: [], orbs: [] };
let flash = 0, nextFlash = 0;
const reduce = () => document.documentElement.dataset.motion === 'reduce'
  || (document.documentElement.dataset.motion !== 'full' && matchMedia('(prefers-reduced-motion: reduce)').matches);
const dark = () => document.documentElement.dataset.theme === 'dark';
const rand = (a, b) => a + Math.random() * (b - a);

function cloudSprite(w, tone, alpha) {
  const c = document.createElement('canvas');
  c.width = w; c.height = w * 0.55;
  const g = c.getContext('2d');
  const puffs = 7 + Math.floor(Math.random() * 4);
  for (let i = 0; i < puffs; i++) {
    const x = w * (0.18 + 0.64 * (i / (puffs - 1))) + rand(-w * 0.05, w * 0.05);
    const y = c.height * (0.58 - 0.22 * Math.sin((i / (puffs - 1)) * Math.PI)) + rand(-6, 6);
    const r = w * rand(0.12, 0.2);
    const grd = g.createRadialGradient(x, y, r * 0.15, x, y, r);
    grd.addColorStop(0, rgb(tone, alpha));
    grd.addColorStop(1, rgb(tone, 0));
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  return c;
}

function rebuild() {
  if (!canvas) return;
  const kind = weatherKind();
  const area = (W * H) / (1440 * 900);
  const cloudCount = { clear: 3, cloudy: 9, rain: 10, storm: 11, snow: 7, fog: 4, aurora: 2, quantum: 0 }[kind] ?? 3;
  const d = dark();
  const tone = kind === 'storm' ? (d ? [70, 78, 92] : [150, 158, 170]) : kind === 'rain' ? (d ? [86, 96, 112] : [205, 211, 220]) : (d ? [96, 108, 130] : [255, 255, 255]);
  const alpha = d ? 0.32 : (kind === 'clear' ? 0.75 : 0.85);
  parts.clouds = Array.from({ length: Math.round(cloudCount * Math.max(0.6, area)) }, (_, i) => {
    const w = rand(220, 420) * (kind === 'clear' ? 0.8 : 1);
    return { img: cloudSprite(w, tone, alpha), x: rand(-w, W), y: rand(-20, H * (kind === 'clear' ? 0.35 : 0.55)), v: rand(4, 12) * (kind === 'storm' ? 2.2 : 1), depth: 0.5 + (i % 3) * 0.25 };
  });
  parts.drops = (kind === 'rain' || kind === 'storm') ? Array.from({ length: Math.round((kind === 'storm' ? 260 : 170) * area) }, () => ({ x: rand(0, W), y: rand(-H, H), l: rand(10, 22), v: rand(520, 820) })) : [];
  parts.flakes = kind === 'snow' ? Array.from({ length: Math.round(150 * area) }, () => ({ x: rand(0, W), y: rand(-H, H), r: rand(1.2, 3.4), v: rand(18, 46), p: rand(0, 6.28) })) : [];
  parts.stars = Array.from({ length: Math.round(140 * area) }, () => ({ x: rand(0, W), y: rand(0, H * 0.75), r: rand(0.5, 1.6), p: rand(0, 6.28), s: rand(0.6, 2) }));
  parts.fog = kind === 'fog' ? Array.from({ length: 6 }, (_, i) => ({ y: H * (0.25 + i * 0.13), h: rand(80, 160), x: rand(0, W), v: rand(6, 16) })) : [];
  parts.orbs = kind === 'quantum' ? Array.from({ length: Math.round(16 * Math.max(0.6, area)) }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(18, 46), a: rand(0, 6.28), w: rand(0.15, 0.5), vx: rand(-6, 6), vy: rand(-4, 4) })) : [];
  if (reduce() || !raf) draw(0);
}

function resize() {
  dpr = Math.min(1.5, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  rebuild();
}

function palette() {
  const h = hourNow();
  let [top, bot] = skyAt(h);
  const kind = weatherKind();
  if (kind === 'aurora' || kind === 'quantum') { // these moods are always night-time skies
    [top, bot] = kind === 'aurora' ? [hex('#06141f'), hex('#103a3a')] : [hex('#0d0b2a'), hex('#1d1846')];
  } else if (WEATHER_TINT[kind]) {
    const [c, t] = WEATHER_TINT[kind];
    const t2 = t * (0.55 + 0.45 * dayness(h));
    top = mix(top, hex(c), t2); bot = mix(bot, hex(c), t2 * 0.9);
  }
  // keep the sky's hue but move it into a readable band for the theme (pastel on paper, deep at night study)
  const d = dark();
  const veil = (c) => {
    let [hh, ss, ll] = toHsl(c);
    if (d) { ll = Math.min(ll * 0.55, 0.13); ss = Math.min(ss, 0.55); }
    else { ll = 0.86 + 0.06 * ll; ss = Math.max(0.18, Math.min(0.62, ss * 0.9)); }
    return fromHsl(hh, ss, ll);
  };
  return { top: veil(top), bot: veil(bot), raw: [top, bot], h, kind, d };
}

function draw(t) {
  if (!ctx) return;
  const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
  last = t;
  const still = reduce();
  const { top, bot, h, kind, d } = palette();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, rgb(top)); g.addColorStop(1, rgb(bot));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  const day = dayness(h);
  const nightSky = kind === 'aurora' || kind === 'quantum' ? 1 : 1 - day;
  const clearish = ['clear', 'aurora', 'quantum'].includes(kind) ? 1 : kind === 'cloudy' ? 0.35 : 0.08;
  // stars
  if (nightSky > 0.15) {
    for (const s of parts.stars) {
      const tw = still ? 0.8 : 0.55 + 0.45 * Math.sin(t / 1000 * s.s + s.p);
      ctx.fillStyle = d ? `rgba(255,255,240,${0.75 * nightSky * clearish * tw})` : `rgba(70,80,140,${0.35 * nightSky * clearish * tw})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
    }
  }
  // sun / moon on an arc across the sky
  if (kind !== 'quantum') {
    const isDay = day > 0.35 && kind !== 'aurora';
    const p = isDay ? Math.max(0, Math.min(1, (h - 6) / 13)) : (((h + 24 - 19.5) % 24) / 10.5);
    const x = W * (0.12 + 0.76 * p), y = H * (0.5 - 0.38 * Math.sin(Math.PI * Math.max(0, Math.min(1, p))));
    const veilAmt = clearish < 0.5 ? 0.35 : 1;
    const r = isDay ? 46 : 30;
    const glow = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 5);
    const gc = isDay ? (h > 16.5 || h < 8 ? [255, 170, 110] : [255, 226, 150]) : [210, 220, 255];
    glow.addColorStop(0, rgb(gc, (d ? 0.32 : 0.55) * veilAmt)); glow.addColorStop(1, rgb(gc, 0));
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, r * 5, 0, 6.283); ctx.fill();
    ctx.fillStyle = rgb(isDay ? [255, 236, 190] : [238, 240, 252], (d ? 0.55 : 0.85) * veilAmt);
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    if (!isDay) { // crescent
      ctx.fillStyle = rgb(mix(top, bot, y / H), 0.92 * veilAmt);
      ctx.beginPath(); ctx.arc(x + r * 0.42, y - r * 0.18, r * 0.9, 0, 6.283); ctx.fill();
    }
  }
  // aurora ribbons
  if (kind === 'aurora') {
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 16) {
        const y = H * (0.22 + k * 0.07) + Math.sin(x / 210 + t / 2600 * (k + 1) + k) * 38 + Math.sin(x / 90 + t / 1700) * 12;
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.lineTo(W, 0); ctx.lineTo(0, 0); ctx.closePath();
      const ag = ctx.createLinearGradient(0, 0, 0, H * 0.5);
      const col = [[56, 217, 169], [151, 117, 250], [59, 201, 219]][k];
      ag.addColorStop(0, rgb(col, 0)); ag.addColorStop(1, rgb(col, d ? 0.16 : 0.12));
      ctx.fillStyle = ag; ctx.fill();
    }
  }
  // quantum night: drifting qubits with orbit rings, tinted by the current course
  if (kind === 'quantum') {
    const cc = getComputedStyle(document.documentElement).getPropertyValue('--course').trim();
    const course = /^#/.test(cc) ? hex(cc) : [107, 140, 255];
    for (const o of parts.orbs) {
      if (!still) { o.x += o.vx * dt; o.y += o.vy * dt; o.a += o.w * dt; }
      if (o.x < -60) o.x = W + 60; if (o.x > W + 60) o.x = -60; if (o.y < -60) o.y = H + 60; if (o.y > H + 60) o.y = -60;
      const og = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      og.addColorStop(0, rgb(course, d ? 0.35 : 0.28)); og.addColorStop(1, rgb(course, 0));
      ctx.fillStyle = og; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 6.283); ctx.fill();
      ctx.strokeStyle = rgb(course, d ? 0.35 : 0.3); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(o.x, o.y, o.r * 0.9, o.r * 0.32, o.a, 0, 6.283); ctx.stroke();
      ctx.fillStyle = rgb([255, 255, 255], d ? 0.7 : 0.9);
      ctx.beginPath(); ctx.arc(o.x + Math.cos(o.a * 3) * o.r * 0.9 * Math.cos(o.a) , o.y + Math.cos(o.a * 3) * o.r * 0.9 * Math.sin(o.a), 1.8, 0, 6.283); ctx.fill();
    }
  }
  // clouds
  for (const c of parts.clouds) {
    if (!still) { c.x += c.v * c.depth * dt; if (c.x > W + 20) { c.x = -c.img.width; c.y = rand(-20, H * 0.5); } }
    ctx.globalAlpha = 0.55 + 0.45 * c.depth;
    ctx.drawImage(c.img, c.x, c.y, c.img.width * c.depth, c.img.height * c.depth);
  }
  ctx.globalAlpha = 1;
  // fog bands
  for (const f of parts.fog) {
    if (!still) f.x = (f.x + f.v * dt) % W;
    const fg = ctx.createLinearGradient(0, f.y - f.h / 2, 0, f.y + f.h / 2);
    const fc = d ? [120, 126, 136] : [255, 255, 255];
    fg.addColorStop(0, rgb(fc, 0)); fg.addColorStop(0.5, rgb(fc, d ? 0.12 : 0.38)); fg.addColorStop(1, rgb(fc, 0));
    ctx.fillStyle = fg; ctx.fillRect(0, f.y - f.h / 2, W, f.h);
  }
  // rain
  if (parts.drops.length) {
    ctx.strokeStyle = d ? 'rgba(170,190,225,.28)' : 'rgba(70,92,128,.30)';
    ctx.lineWidth = 1.1; ctx.beginPath();
    for (const p of parts.drops) {
      if (!still) { p.y += p.v * dt; p.x -= p.v * 0.18 * dt; if (p.y > H) { p.y = rand(-60, -10); p.x = rand(0, W + 120); } }
      ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.l * 0.18, p.y - p.l);
    }
    ctx.stroke();
  }
  // snow
  for (const s of parts.flakes) {
    if (!still) { s.y += s.v * dt; s.p += dt; s.x += Math.sin(s.p) * 12 * dt; if (s.y > H) { s.y = -6; s.x = rand(0, W); } }
    ctx.fillStyle = d ? 'rgba(235,240,255,.7)' : 'rgba(255,255,255,.95)';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
    if (!d) { ctx.strokeStyle = 'rgba(120,140,170,.25)'; ctx.lineWidth = 0.6; ctx.stroke(); }
  }
  // lightning
  if (kind === 'storm' && !still) {
    if (t > nextFlash) { flash = 1; nextFlash = t + rand(5000, 12000); }
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * (d ? 0.18 : 0.35)})`; ctx.fillRect(0, 0, W, H); flash -= dt * 3.2; }
  }
}

function loop(t) {
  raf = requestAnimationFrame(loop);
  if (t - last < 33) return; // ~30 fps is plenty for a backdrop
  draw(t);
}

function start() {
  cancelAnimationFrame(raf); raf = 0;
  if (!cfg.enabled) return;
  if (reduce()) { draw(0); return; }
  raf = requestAnimationFrame(loop);
}

export function initSky() {
  canvas = document.createElement('canvas');
  canvas.className = 'sky-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.hidden = !cfg.enabled;
  document.body.prepend(canvas);
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 150); });
  document.addEventListener('visibilitychange', () => (document.hidden ? cancelAnimationFrame(raf) : start()));
  new MutationObserver(() => { rebuild(); start(); emit(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-motion'] });
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', start);
  setInterval(() => { emit(); refreshWeather(); if (reduce()) draw(0); }, 60e3); // time of day moves on
  start();
  refreshWeather();
  sound.update();
}
export function restartSky() { start(); }

/* ------------------------------------------------------------------ ambient sound (generated, no audio files) */
export const SOUNDS = { off: 'Off', rain: 'Soft rain', brown: 'Deep focus (brown noise)', waves: 'Ocean waves' };
const sound = {
  ctx: null, src: null, gain: null, lfo: null, kind: 'off',
  noise(type) {
    const ac = this.ctx;
    const len = ac.sampleRate * 4;
    const buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (type === 'white') data[i] = w * 0.5;
        else { last = (last + 0.02 * w) / 1.02; data[i] = last * 3.2; }
      }
    }
    return buf;
  },
  stop() { try { this.src?.stop(); this.lfo?.stop(); } catch { /* already stopped */ } this.src = this.lfo = null; this.kind = 'off'; },
  update() {
    const want = cfg.sound || 'off';
    if (this.gain) this.gain.gain.value = cfg.volume * (want === 'rain' ? 0.5 : 0.9);
    if (want === this.kind) return;
    this.stop();
    if (want === 'off') return;
    try {
      this.ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      this.ctx.resume?.();
      const ac = this.ctx;
      const src = ac.createBufferSource();
      src.buffer = this.noise(want === 'rain' ? 'white' : 'brown');
      src.loop = true;
      const filter = ac.createBiquadFilter();
      if (want === 'rain') { filter.type = 'bandpass'; filter.frequency.value = 2400; filter.Q.value = 0.6; }
      else if (want === 'waves') { filter.type = 'lowpass'; filter.frequency.value = 650; }
      else { filter.type = 'lowpass'; filter.frequency.value = 420; }
      const gain = ac.createGain();
      gain.gain.value = cfg.volume * (want === 'rain' ? 0.5 : 0.9);
      src.connect(filter);
      if (want === 'waves') { // slow swell like waves on a beach
        const swell = ac.createGain(); swell.gain.value = 0.55;
        const lfo = ac.createOscillator(); lfo.frequency.value = 0.09;
        const depth = ac.createGain(); depth.gain.value = 0.45;
        lfo.connect(depth).connect(swell.gain); lfo.start();
        filter.connect(swell).connect(gain);
        this.lfo = lfo;
      } else filter.connect(gain);
      gain.connect(ac.destination);
      src.start();
      Object.assign(this, { src, gain, kind: want });
    } catch { this.kind = 'off'; }
  },
};

/** One-liner for greetings: "Good evening" + optional weather sentence. */
export function greeting(name) {
  const h = hourNow();
  const part = h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Studying late';
  const i = info();
  let line = '';
  if (i.live) {
    const where = i.place?.name && i.place.name !== 'your location' ? ` in ${i.place.name.split(',')[0]}` : '';
    const vibe = { rain: 'perfect weather for a cosy study session ☔', storm: 'stay in and build some circuits ⛈️', snow: 'a calm day for deep focus ❄️',
      fog: 'a quiet, foggy day to think 🌫️', cloudy: 'good light for reading ⛅', 'cloudy-light': 'a lovely day to learn something new 🌤️', clear: i.night ? 'clear skies — the stars are out ✨' : 'bright and clear — great energy for practice ☀️' }[i.live.kind];
    line = `It’s ${i.temp}°C and ${WEATHER_WORDS[i.live.kind]}${where} — ${vibe}`;
  }
  return { hello: `${part}${name ? `, ${name}` : ''}!`, line, phase: i.phase };
}

