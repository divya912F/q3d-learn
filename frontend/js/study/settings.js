// Display & accessibility preferences, the ambience popover (Living Sky + sound) and a tiny popover helper.
import { esc, icon, toast, hydrateIcons } from '../ui.js';
import { MOODS, SOUNDS, setSky, skyConfig, findCity, useMyLocation, info as skyInfo, refreshWeather } from '../sky.js';

const LS = 'q3d-prefs:v1';
const DEFAULTS = { size: 'm', motion: 'system', contrast: false, readable: false };
let prefs = { ...DEFAULTS };
try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem(LS) || '{}') }; } catch { /* ignore */ }

export function applyPrefs() {
  const r = document.documentElement;
  r.dataset.size = prefs.size;
  r.dataset.motion = prefs.motion;
  r.dataset.contrast = prefs.contrast ? 'high' : '';
  r.dataset.font = prefs.readable ? 'readable' : '';
  if (prefs.readable && !document.getElementById('font-lexend')) {
    const l = document.createElement('link');
    l.id = 'font-lexend'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
  }
}
export const getPrefs = () => ({ ...prefs });
function setPref(k, v) { prefs[k] = v; try { localStorage.setItem(LS, JSON.stringify(prefs)); } catch { /* ignore */ } applyPrefs(); }

/* ------------------------------------------------------------------ popover helper */
let openPop = null;
let offHandler = null;
export function closePopover() {
  openPop?.remove(); openPop = null;
  if (offHandler) { document.removeEventListener('pointerdown', offHandler); offHandler = null; }
}
export function popover(anchor, html, { width = 340, cls = '' } = {}) {
  closePopover();
  const p = document.createElement('div');
  p.className = `popover ${cls}`;
  p.setAttribute('role', 'dialog');
  p.innerHTML = html;
  document.body.appendChild(p);
  hydrateIcons(p);
  const r = anchor.getBoundingClientRect();
  const w = Math.min(width, window.innerWidth - 16);
  p.style.width = `${w}px`;
  p.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w))}px`;
  p.style.top = `${r.bottom + 8}px`;
  p.style.maxHeight = `${window.innerHeight - r.bottom - 20}px`;
  openPop = p;
  setTimeout(() => {
    if (openPop !== p) return;
    offHandler = (e) => { if (!p.contains(e.target) && !anchor.contains(e.target)) closePopover(); };
    document.addEventListener('pointerdown', offHandler);
  });
  return p;
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopover(); });

/* ------------------------------------------------------------------ ambience popover */
export function openAmbience(anchor) {
  const cfg = skyConfig();
  const i = skyInfo();
  const p = popover(anchor, `
    <div class="pop-head"><b>${i.icon} Living sky</b><span class="faint tiny">${esc(i.phase)}${i.live ? ` · ${i.temp}°C ${esc(i.words)}` : ''}</span></div>
    <label class="toggle"><input type="checkbox" data-on ${cfg.enabled ? 'checked' : ''}> Show the sky behind your desk</label>
    <div class="mood-grid" data-moods>${Object.entries(MOODS).map(([k, m]) => `<button class="mood ${cfg.mood === k ? 'active' : ''}" data-mood="${k}" title="${esc(m.hint || m.label)}"><span>${m.icon}</span>${esc(m.label)}</button>`).join('')}</div>
    <div class="pop-sec">
      <div class="row-between"><b class="small">Real local weather</b><label class="toggle small"><input type="checkbox" data-live ${cfg.live ? 'checked' : ''}> on</label></div>
      <p class="faint tiny" style="margin:2px 0 8px">With <i>Auto</i>, the sky copies the weather outside (Open-Meteo, no account). Your location stays in this browser.</p>
      <div class="row" style="gap:6px"><button class="btn btn-ghost btn-sm" data-geo>${icon('target')} Use my location</button><span class="faint tiny">or</span></div>
      <form class="row" style="gap:6px;margin-top:6px" data-city><input class="input" name="q" placeholder="Search a city, e.g. Meerut" value="${esc(cfg.place && cfg.place.name !== 'your location' ? cfg.place.name.split(',')[0] : '')}" style="flex:1;padding:6px 10px"><button class="btn btn-sm">Set</button></form>
      <div data-cities class="stack" style="gap:4px;margin-top:6px"></div>
      ${cfg.place ? `<div class="faint tiny" style="margin-top:6px">📍 ${esc(cfg.place.name)}</div>` : ''}
    </div>
    <div class="pop-sec">
      <b class="small">Ambient sound</b>
      <div class="seg" data-sound style="margin-top:6px">${Object.entries(SOUNDS).map(([k, l]) => `<button class="${cfg.sound === k ? 'active' : ''}" data-s="${k}">${esc(l.split(' (')[0])}</button>`).join('')}</div>
      <input type="range" min="0" max="1" step="0.05" value="${cfg.volume}" data-vol style="margin-top:10px;--p:${cfg.volume * 100}%" aria-label="Volume">
    </div>`, { width: 360, cls: 'ambience' });
  const q = (s) => p.querySelector(s);
  q('[data-on]').addEventListener('change', (e) => setSky({ enabled: e.target.checked }));
  p.querySelectorAll('[data-mood]').forEach((b) => b.addEventListener('click', () => {
    setSky({ mood: b.dataset.mood, enabled: true });
    p.querySelectorAll('[data-mood]').forEach((x) => x.classList.toggle('active', x === b));
    q('[data-on]').checked = true;
  }));
  q('[data-live]').addEventListener('change', (e) => {
    if (e.target.checked && !skyConfig().place) { toast('Pick your city or use your location first.', 'info'); }
    setSky({ live: e.target.checked, ...(e.target.checked ? { mood: 'auto' } : {}) });
  });
  q('[data-geo]').addEventListener('click', async () => {
    try { await useMyLocation(); setSky({ mood: 'auto' }); toast('Sky now follows your local weather', 'success'); openAmbience(anchor); } catch (e) { toast(esc(e.message), 'error'); }
  });
  q('[data-city]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = e.target.q.value.trim();
    if (!name) return;
    const box = q('[data-cities]');
    box.innerHTML = '<span class="faint tiny">Searching…</span>';
    try {
      const list = await findCity(name);
      box.innerHTML = list.length ? list.map((c, k) => `<button class="city" data-c="${k}">📍 ${esc(c.name)}</button>`).join('') : '<span class="faint tiny">No match — check the spelling.</span>';
      box.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', async () => {
        setSky({ place: list[+b.dataset.c], live: true, mood: 'auto' });
        await refreshWeather(true);
        toast(`Sky now follows the weather in ${esc(list[+b.dataset.c].name.split(',')[0])}`, 'success');
        openAmbience(anchor);
      }));
    } catch { box.innerHTML = '<span class="faint tiny">Weather search needs an internet connection.</span>'; }
  });
  p.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => {
    setSky({ sound: b.dataset.s });
    p.querySelectorAll('[data-s]').forEach((x) => x.classList.toggle('active', x === b));
  }));
  q('[data-vol]').addEventListener('input', (e) => { e.target.style.setProperty('--p', `${e.target.value * 100}%`); setSky({ volume: +e.target.value }); });
}

/* ------------------------------------------------------------------ settings modal */
let installEvent = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; });

export function openSettings() {
  const m = document.getElementById('modal');
  m.hidden = false;
  const seg = (key, opts) => `<div class="seg" data-pref="${key}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" class="${String(prefs[key]) === String(v) ? 'active' : ''}">${l}</button>`).join('')}</div>`;
  m.innerHTML = `<div class="modal-card stack" style="width:min(520px,100%)">
    <div class="row-between"><div><span class="hand" style="font-size:1.3rem;color:var(--pink)">make it yours</span><h2>Study settings</h2></div><button class="icon-btn" data-close aria-label="Close">${icon('x')}</button></div>
    <div class="set-row"><div><b>Text size</b><small>Makes every page easier to read</small></div>${seg('size', [['s', 'A−'], ['m', 'A'], ['l', 'A+'], ['xl', 'A++']])}</div>
    <div class="set-row"><div><b>Motion</b><small>Animations, sky and 3D auto-rotation</small></div>${seg('motion', [['system', 'System'], ['reduce', 'Reduce'], ['full', 'Full']])}</div>
    <div class="set-row"><div><b>High contrast</b><small>Darker text and stronger lines</small></div><label class="switch"><input type="checkbox" data-bool="contrast" ${prefs.contrast ? 'checked' : ''}><span></span></label></div>
    <div class="set-row"><div><b>Readable font</b><small>Lexend — designed to reduce reading effort</small></div><label class="switch"><input type="checkbox" data-bool="readable" ${prefs.readable ? 'checked' : ''}><span></span></label></div>
    <div class="set-row"><div><b>Living sky & sound</b><small>Weather, time of day and ambient sound</small></div><button class="btn btn-ghost btn-sm" data-amb>${icon('cloud')} Open</button></div>
    <div class="set-row"><div><b>Install as an app</b><small>Works offline on phones and laptops</small></div><button class="btn btn-ghost btn-sm" data-install>${icon('download')} Install</button></div>
    <div class="set-row"><div><b>Keyboard shortcuts</b><small><span class="kbd">Ctrl</span> + <span class="kbd">K</span> search · <span class="kbd">F</span> focus timer · <span class="kbd">R</span> review cards</small></div></div>
  </div>`;
  hydrateIcons(m);
  const close = () => { m.hidden = true; m.innerHTML = ''; };
  m.querySelector('[data-close]').addEventListener('click', close);
  m.addEventListener('click', (e) => { if (e.target === m) close(); }, { once: true });
  m.querySelectorAll('[data-pref]').forEach((g) => g.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => {
    setPref(g.dataset.pref, b.dataset.v);
    g.querySelectorAll('[data-v]').forEach((x) => x.classList.toggle('active', x === b));
  })));
  m.querySelectorAll('[data-bool]').forEach((c) => c.addEventListener('change', () => setPref(c.dataset.bool, c.checked)));
  m.querySelector('[data-amb]').addEventListener('click', (e) => { close(); openAmbience(document.getElementById('sky-chip') || e.target); });
  m.querySelector('[data-install]').addEventListener('click', async () => {
    if (installEvent) { installEvent.prompt(); await installEvent.userChoice; installEvent = null; }
    else if (matchMedia('(display-mode: standalone)').matches) toast('Q-3D Learn is already installed 🎉', 'success');
    else toast('Use your browser menu → “Install app” / “Add to Home screen”.', 'info', 5000);
  });
}
