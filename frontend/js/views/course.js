// Course overview: banner, lesson path, labs and challenges for one course.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, hydrateIcons } from '../ui.js';
import { courseArt } from '../art.js';
import { openDrawer, refreshProgress } from '../main.js';

const DIFF = { Easy: 'green', Medium: 'amber', Hard: 'pink' };
const CNAME = { quantum: 'Quantum Computing', ml: 'Machine Learning', ds: 'Data Science', ai: 'Artificial Intelligence', dsa: 'Data Structures & Algorithms', cyber: 'Cybersecurity', chain: 'Blockchain', dl: 'Deep Learning' };
const BAND = { high: 'In high demand', mid: 'Solid demand' };

function roadmapSection(course, c) {
  const r = c.roadmap;
  return `
    <div class="roadmap" style="color:var(--course)">
      <div class="section-title"><h2>${icon('route')} Where this takes you</h2><span class="hand">your career roadmap</span></div>
      <p class="muted" style="max-width:68ch;margin:-6px 0 20px">${esc(r.tagline)}</p>

      <h3 class="rm-h">You could become…</h3>
      <div class="grid rm-roles" style="grid-template-columns:repeat(auto-fit,minmax(250px,1fr))">
        ${r.become.map((b) => `<div class="card rm-role">
          <div class="row-between"><b>${esc(b.role)}</b><span class="rm-band ${b.band}" title="${BAND[b.band] || ''}"></span></div>
          <p>${esc(b.blurb)}</p>
          <div class="rm-tags">${b.tags.map((t) => `<span class="rm-tag">${esc(t)}</span>`).join('')}</div>
        </div>`).join('')}
      </div>

      <h3 class="rm-h">The path, step by step</h3>
      <div class="rm-ladder">
        ${r.path.map((s, i) => `<div class="rm-step">
          <div class="rm-node">${i + 1}</div>
          <div class="rm-step-body"><b>${esc(s.stage)}</b><p>${esc(s.detail)}</p>
            ${s.lessons && s.lessons.length ? `<div class="rm-lessons">${s.lessons.map((lid) => { const l = c.lesson_list.find((x) => x.id === lid); return l ? `<a href="#/c/${course}/learn/${lid}">${esc(l.title)}</a>` : ''; }).join('')}</div>` : ''}
          </div></div>`).join('')}
      </div>

      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));margin-top:20px">
        <div class="card rm-build"><div class="card-head"><h3>${icon('hammer')} Build these to prove it</h3></div>
          <ul>${r.build.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></div>
        <div class="card rm-next"><div class="card-head"><h3>${icon('compass')} Where to go next</h3></div>
          <div class="stack" style="gap:8px">${(r.next || []).map(([id, why]) => `<a class="rec" href="#/c/${id}" style="text-decoration:none;color:inherit"><div class="ic" style="background:var(--surface-2)">${icon('book')}</div><div class="grow"><b>${esc(CNAME[id] || id)}</b><small>${esc(why)}</small></div>${icon('arrowRight')}</a>`).join('')}</div></div>
      </div>
    </div>`;
}

export async function render(root, { course }) {
  const [c, p] = await Promise.all([api.course(course), store.user ? refreshProgress() : Promise.resolve(null)]);
  const cp = p?.courses?.[course];
  const done = new Set(cp?.lessons_completed || []);
  const solved = new Set(cp?.challenges_solved || []);
  const next = c.lesson_list.find((l) => !done.has(l.id)) || c.lesson_list[0];
  root.innerHTML = `
    <div class="card course-banner">
      <div class="inner">
        <span class="hand" style="font-size:1.35rem;color:var(--course)">course notebook</span>
        <h1>${esc(c.title)}</h1>
        <p class="muted" style="font-size:1.05rem;max-width:62ch">${esc(c.description)}</p>
        <div class="row" style="margin:14px 0 16px"><span class="chip">${esc(c.level)}</span><span class="chip gray">${c.lessons} lessons · ~${c.minutes} min</span><span class="chip gray">${c.labs.length} labs</span><span class="chip gray">${c.challenges} challenges</span></div>
        <div class="row">
          <a class="btn btn-course btn-lg" href="#/c/${course}/learn/${next.id}">${icon('book')} ${done.size ? 'Continue' : 'Start'}: ${esc(next.title)}</a>
          <button class="btn btn-ghost" data-ask>${icon('bot')} Ask Q-Bot about ${esc(c.short)}</button>
        </div>
        ${cp ? `<div style="margin-top:18px;max-width:420px"><div class="row-between small"><span>Course progress</span><b>${cp.progress_pct}%</b></div><div class="progress" style="margin-top:6px"><span style="width:${cp.progress_pct}%"></span></div></div>` : ''}
      </div>
      <div class="art" style="color:var(--course)">${courseArt(course)}</div>
    </div>

    <div class="section-title"><h2>Visual labs</h2><span class="hand">play first, theory second</span></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
      ${c.labs.map((l) => `<a class="card lab-card" href="#/c/${course}/lab/${l.id}"><div class="ic"><i data-icon="${l.icon}"></i></div><div><b>${esc(l.title)}</b><p>${esc(l.description)}</p></div></a>`).join('')}
    </div>

    <div class="grid" style="grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);margin-top:28px" data-two>
      <div class="card paper-lines" style="padding-left:62px"><div class="card-head"><h3>${icon('book')} Lesson path</h3><a href="#/c/${course}/learn" class="small">open lessons →</a></div>
        <div class="path">${c.lesson_list.map((l) => {
          const st = done.has(l.id) ? 'done' : l.id === next.id ? 'next' : '';
          const q = cp?.quiz_best?.[l.id];
          return `<a class="path-item ${st}" href="#/c/${course}/learn/${l.id}" style="color:inherit;text-decoration:none"><span class="st">${st === 'done' ? '✓' : l.order}</span><span class="grow"><b style="font-weight:600">${esc(l.title)}</b><br><span class="faint tiny">${esc(l.topic_label)} · ${l.level} · ${l.minutes} min</span></span>${q ? `<span class="chip ${q.percent >= 67 ? 'green' : 'red'}">${q.percent}%</span>` : ''}</a>`;
        }).join('')}</div></div>
      <div class="card"><div class="card-head"><h3>${icon('trophy')} Challenges</h3><a href="#/c/${course}/challenges" class="small">all challenges →</a></div>
        <div class="stack" style="gap:8px">${c.challenge_list.map((ch) => `<a class="rec" href="#/c/${course}/challenges/${ch.id}" style="text-decoration:none;color:inherit">
          <div class="ic" style="background:${solved.has(ch.id) ? 'var(--hl-green)' : 'var(--surface-2)'};color:${solved.has(ch.id) ? 'var(--green)' : 'var(--text-3)'}">${icon(solved.has(ch.id) ? 'checkCircle' : 'target')}</div>
          <div class="grow"><b>${esc(ch.title)}</b><small>${esc(ch.description)}</small></div><span class="chip ${DIFF[ch.difficulty]}">${ch.points} XP</span></a>`).join('')}</div></div>
    </div>

    ${c.roadmap ? roadmapSection(course, c) : ''}`;
  hydrateIcons(root);
  if (innerWidth < 1080) root.querySelector('[data-two]').style.gridTemplateColumns = '1fr';
  root.querySelector('[data-ask]').addEventListener('click', () => openDrawer(`Give me a friendly overview of ${c.title}: what will I learn and why does it matter?`));
}
