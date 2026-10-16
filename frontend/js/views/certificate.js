// Course certificate: earned by finishing every lesson with a solid quiz average. Printable, with a verify code.
import { api } from '../api.js';
import { store } from '../store.js';
import { esc, icon, hydrateIcons, confetti } from '../ui.js';
import { openProfile } from '../main.js';

export async function render(root, { params }) {
  if (params[0] === 'verify') return verify(root, params[1] || '');
  const course = params[0];
  const meta = store.courseMeta(course);
  if (!meta) { root.innerHTML = '<div class="card empty">Unknown course.</div>'; return; }
  if (!store.user) {
    root.innerHTML = `<div class="card empty" style="max-width:520px;margin:40px auto"><i data-icon="award"></i><h3 style="color:var(--text)">Earn a ${esc(meta.title)} certificate</h3>
      <p>Create a profile, finish every lesson and keep your quiz average at 60% or more.</p><button class="btn btn-primary" data-p>Create profile</button></div>`;
    hydrateIcons(root);
    root.querySelector('[data-p]').addEventListener('click', () => openProfile());
    return;
  }
  const c = await api.certificate(store.user.id, course);
  if (!c.eligible) {
    const lp = Math.round((100 * c.lessons_completed) / c.lessons_total);
    root.innerHTML = `<div class="card" style="max-width:640px;margin:20px auto;--course:var(--c-${course})">
      <div class="row" style="gap:14px"><div class="cert-seal small-seal">${icon('award')}</div><div><span class="hand" style="font-size:1.3rem;color:var(--pink)">almost there!</span><h2 style="margin:0">${esc(meta.title)} certificate</h2></div></div>
      <p class="muted">Finish these to unlock your certificate:</p>
      <div class="stack" style="gap:12px">
        <div><div class="row-between small"><span>${c.lessons_completed >= c.lessons_total ? '✅' : '⬜'} Complete every lesson</span><b>${c.lessons_completed}/${c.lessons_total}</b></div><div class="progress" style="margin-top:6px"><span style="width:${lp}%"></span></div></div>
        <div><div class="row-between small"><span>${(c.avg_quiz || 0) >= c.min_quiz ? '✅' : '⬜'} Quiz average of ${c.min_quiz}% or more</span><b>${c.avg_quiz ?? 0}%</b></div><div class="progress" style="margin-top:6px"><span style="width:${Math.min(100, c.avg_quiz || 0)}%"></span></div></div>
        <div class="faint small">Bonus (shown on the certificate): ${c.challenges_solved}/${c.challenges_total} challenges solved.</div>
      </div>
      <div class="row" style="margin-top:16px"><a class="btn btn-course" href="#/c/${course}/learn">${icon('book')} Continue the lessons</a><a class="btn btn-ghost" href="#/progress">${icon('chart')} My progress</a></div></div>`;
    hydrateIcons(root);
    return;
  }
  const date = new Date(c.date).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
  root.innerHTML = `
    <div class="row no-print" style="justify-content:center;margin-bottom:16px"><button class="btn btn-primary" data-print>${icon('download')} Print / save as PDF</button><a class="btn btn-ghost" href="#/progress">${icon('chart')} Back to progress</a></div>
    <div class="certificate" style="--course:var(--c-${course})">
      <div class="cert-border">
        <div class="cert-top"><span class="brand-text">Q-3D <b>Learn</b></span><span class="hand">certificate of completion</span></div>
        <p class="cert-small">This certifies that</p>
        <h1 class="cert-name">${esc(c.name)}</h1>
        <p class="cert-small">has completed the course</p>
        <h2 class="cert-course">${esc(c.course_title)}</h2>
        <p class="cert-detail">${c.lessons_total} lessons · quiz average ${c.avg_quiz}% · ${c.challenges_solved}/${c.challenges_total} challenges · ${c.xp} XP</p>
        <div class="cert-foot">
          <div><b>${date}</b><small>date</small></div>
          <div class="cert-seal">${icon('award')}</div>
          <div><b class="mono">${c.code}</b><small>verify: #/certificate/verify/${c.code}</small></div>
        </div>
      </div>
    </div>`;
  hydrateIcons(root);
  confetti();
  root.querySelector('[data-print]').addEventListener('click', () => window.print());
}

async function verify(root, code) {
  root.innerHTML = `<div class="card" style="max-width:520px;margin:30px auto"><h2>${icon('award')} Verify a certificate</h2>
    <form class="row" data-f><input class="input mono" name="code" placeholder="10-character code" value="${esc(code)}" style="flex:1"><button class="btn btn-primary">Check</button></form><div data-r style="margin-top:14px"></div></div>`;
  hydrateIcons(root);
  const f = root.querySelector('[data-f]');
  const check = async () => {
    const v = await api.verifyCertificate(f.code.value.trim());
    root.querySelector('[data-r]').innerHTML = v.valid ? `<div class="callout tip">✅ Valid — <b>${esc(v.name)}</b> completed <b>${esc(v.course)}</b>.</div>` : '<div class="callout warning">❌ No certificate matches this code.</div>';
  };
  f.addEventListener('submit', (e) => { e.preventDefault(); check(); });
  if (code) check();
}
