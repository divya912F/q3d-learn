"""Learning analytics across courses: XP, per-course topic mastery, recommendations and class overviews."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..courses import registry as R
from ..database import Assignment, ChallengeAttempt, Experiment, FocusSession, LessonProgress, QuizResult, ReviewLog, TutorMessage, User

XP_LESSON = 50
XP_PER_CORRECT = 10
XP_EXPERIMENT = 2
XP_EXPERIMENT_CAP = 100  # per course
XP_PER_LEVEL = 250
XP_REVIEW = 1          # per flashcard review
XP_REVIEW_CAP = 300
XP_FOCUS_PER_25 = 5    # per 25 focused minutes
XP_FOCUS_CAP = 200


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _avg(vals: list[float]) -> int | None:
    return round(sum(vals) / len(vals)) if vals else None


def user_stats(db: Session, user: User) -> dict:
    lessons_rows = db.scalars(select(LessonProgress).where(LessonProgress.user_id == user.id)).all()
    quizzes = db.scalars(select(QuizResult).where(QuizResult.user_id == user.id)).all()
    attempts = db.scalars(select(ChallengeAttempt).where(ChallengeAttempt.user_id == user.id)).all()
    experiments = db.scalars(select(Experiment).where(Experiment.user_id == user.id).order_by(Experiment.created_at.desc())).all()
    questions = db.scalar(select(func.count()).select_from(TutorMessage).where(TutorMessage.user_id == user.id)) or 0
    reviews = db.scalars(select(ReviewLog).where(ReviewLog.user_id == user.id)).all()
    focus = db.scalars(select(FocusSession).where(FocusSession.user_id == user.id)).all()

    courses: dict[str, dict] = {}
    total_xp = 0
    for cid in R.course_ids():
        done = {l.lesson_id for l in lessons_rows if (l.course or "quantum") == cid}
        best: dict[str, QuizResult] = {}
        for q in quizzes:
            if (q.course or "quantum") != cid:
                continue
            if q.lesson_id not in best or q.percent > best[q.lesson_id].percent:
                best[q.lesson_id] = q
        solved: dict[str, ChallengeAttempt] = {}
        attempted: set[str] = set()
        for a in attempts:
            if (a.course or "quantum") != cid:
                continue
            attempted.add(a.challenge_id)
            if a.solved and a.challenge_id not in solved:
                solved[a.challenge_id] = a
        exps = [e for e in experiments if (e.course or "quantum") == cid]
        xp = (XP_LESSON * len(done) + XP_PER_CORRECT * sum(q.score for q in best.values()) + sum(a.points for a in solved.values())
              + min(XP_EXPERIMENT_CAP, XP_EXPERIMENT * len(exps)))
        total_xp += xp

        topic_scores: dict[str, list[float]] = defaultdict(list)
        for q in best.values():
            topic_scores[q.topic].append(q.percent)
        for chid in attempted:
            ch = R.challenge(cid, chid)
            if ch:
                topic_scores[ch["topic"]].append(100.0 if chid in solved else 40.0)
        mastery = {t: _avg(topic_scores.get(t, [])) for t in R.topics(cid)}
        lessons_total = len(R.lessons(cid))
        challenges_total = len(R.challenges(cid))
        progress_pct = round(100 * (len(done) + len(solved)) / max(1, lessons_total + challenges_total))
        courses[cid] = {
            "lessons_completed": [l["id"] for l in R.lessons(cid) if l["id"] in done],
            "lessons_total": lessons_total,
            "quiz_best": {k: {"score": v.score, "total": v.total, "percent": v.percent} for k, v in best.items()},
            "challenges_solved": sorted(solved), "challenges_total": challenges_total,
            "experiments": len(exps), "mastery": mastery,
            "weak_topics": [t for t, m in mastery.items() if m is not None and m < 70],
            "xp": xp, "progress_pct": progress_pct,
            "avg_quiz": _avg([q.percent for q in best.values()]),
            "overall_mastery": _avg([m for m in mastery.values() if m is not None]),
            "started": bool(done or best or attempted or exps),
        }

    focus_minutes = sum(f.minutes for f in focus)
    study_xp = min(XP_REVIEW_CAP, XP_REVIEW * len(reviews)) + min(XP_FOCUS_CAP, XP_FOCUS_PER_25 * (focus_minutes // 25))
    total_xp += study_xp
    now = datetime.now(timezone.utc)
    stamps = ([_aware(e.created_at) for e in experiments] + [_aware(q.created_at) for q in quizzes] + [_aware(a.created_at) for a in attempts]
              + [_aware(r.created_at) for r in reviews] + [_aware(f.created_at) for f in focus])
    per_day: dict[str, int] = defaultdict(int)
    for ts in stamps:
        d = (now - ts).days
        if 0 <= d < 14:
            per_day[(now - timedelta(days=d)).date().isoformat()] += 1
    activity = [{"date": (now - timedelta(days=d)).date().isoformat(), "count": per_day.get((now - timedelta(days=d)).date().isoformat(), 0)}
                for d in range(13, -1, -1)]
    # study streak: consecutive days with activity ending today/yesterday
    streak = 0
    for d in range(0, 60):
        day = (now - timedelta(days=d)).date()
        if any(_aware(ts).date() == day for ts in stamps):
            streak += 1
        elif d > 0:
            break
    last_active = max(stamps) if stamps else _aware(user.created_at)
    return {
        "user": {"id": user.id, "name": user.name, "role": user.role, "classroom_code": user.classroom_code},
        "xp": total_xp, "level": total_xp // XP_PER_LEVEL + 1, "level_progress": round(100 * (total_xp % XP_PER_LEVEL) / XP_PER_LEVEL),
        "courses": courses,
        "experiments": len(experiments),
        "recent_experiments": [{"course": e.course or "quantum", "lab": e.lab, "num_qubits": e.num_qubits, "gate_count": e.gate_count,
                                "depth": e.depth, "backend": e.backend, "state": e.state_name, "date": _aware(e.created_at).isoformat()}
                               for e in experiments[:10]],
        "questions_asked": questions, "reviews_total": len(reviews), "focus_minutes": focus_minutes, "study_xp": study_xp,
        "activity": activity, "streak": streak, "last_active": last_active.isoformat(),
        "lessons_completed_total": sum(len(c["lessons_completed"]) for c in courses.values()),
        "challenges_solved_total": sum(len(c["challenges_solved"]) for c in courses.values()),
    }


def recommendations(stats: dict, course: str | None = None) -> list[dict]:
    recs: list[dict] = []
    order = [course] if course else [c for c in R.course_ids() if stats["courses"][c]["started"]] or ["quantum"]
    for cid in order:
        cs = stats["courses"][cid]
        title = R.course(cid)["short"]
        for t in cs["weak_topics"][:2]:
            lesson = next((l for l in R.lessons(cid) if l["topic"] == t), None)
            if lesson:
                recs.append({"type": "lesson", "course": cid, "id": lesson["id"], "title": f"Review: {lesson['title']}",
                             "reason": f"{title} · your {R.topics(cid)[t].lower()} score is {cs['mastery'][t]}%."})
        nxt = next((l for l in R.lessons(cid) if l["id"] not in cs["lessons_completed"]), None)
        if nxt:
            recs.append({"type": "lesson", "course": cid, "id": nxt["id"], "title": f"Next up: {nxt['title']}", "reason": f"{title} · {nxt['summary']}"})
        if cs["experiments"] == 0:
            lab = R.course(cid)["labs"][0]
            recs.append({"type": "lab", "course": cid, "id": lab["id"], "title": f"Try the {lab['title']}", "reason": lab["description"]})
        done_topics = {l["topic"] for l in R.lessons(cid) if l["id"] in cs["lessons_completed"]}
        for ch in R.challenges(cid):
            if ch["id"] not in cs["challenges_solved"] and (ch["topic"] in done_topics or ch["difficulty"] == "Easy"):
                recs.append({"type": "challenge", "course": cid, "id": ch["id"], "title": f"Challenge: {ch['title']}",
                             "reason": f"{title} · {ch['difficulty']} · {ch['points']} XP"})
                break
    if not course:
        unstarted = [c for c in R.course_ids() if not stats["courses"][c]["started"]]
        if unstarted:
            c = R.course(unstarted[0])
            recs.append({"type": "course", "course": c["id"], "id": c["id"], "title": f"Start a new course: {c['title']}", "reason": c["tagline"]})
    return recs[:5]


def classroom_overview(db: Session, code: str, course: str = "all") -> dict:
    students = db.scalars(select(User).where(User.classroom_code == code, User.role == "student")).all()
    if course != "all" and course not in R.course_ids():
        course = "all"
    columns = ({cid: R.course(cid)["short"] for cid in R.course_ids()} if course == "all" else R.topics(course))
    rows, acc = [], defaultdict(list)
    for s in students:
        st = user_stats(db, s)
        cs_list = list(st["courses"].values()) if course == "all" else [st["courses"][course]]
        quiz_vals = [v["percent"] for cs in cs_list for v in cs["quiz_best"].values()]
        if course == "all":
            heat = {cid: st["courses"][cid]["overall_mastery"] for cid in R.course_ids()}
            weak = [f"{cid}:{t}" for cid in R.course_ids() for t in st["courses"][cid]["weak_topics"]]
        else:
            heat = st["courses"][course]["mastery"]
            weak = [f"{course}:{t}" for t in st["courses"][course]["weak_topics"]]
        row = {
            "id": s.id, "name": s.name, "xp": st["xp"] if course == "all" else st["courses"][course]["xp"], "level": st["level"],
            "lessons_completed": sum(len(cs["lessons_completed"]) for cs in cs_list),
            "lessons_total": sum(cs["lessons_total"] for cs in cs_list),
            "avg_quiz": _avg(quiz_vals),
            "challenges_solved": sum(len(cs["challenges_solved"]) for cs in cs_list),
            "experiments": sum(cs["experiments"] for cs in cs_list), "questions_asked": st["questions_asked"],
            "weak_topics": weak, "heat": heat, "last_active": st["last_active"],
            "done_ids": [i for cs in st["courses"].values() for i in cs["lessons_completed"] + cs["challenges_solved"]],
        }
        rows.append(row)
        for k, v in heat.items():
            if v is not None:
                acc[k].append(v)
    class_heat = {k: _avg(acc.get(k, [])) for k in columns}
    weakest = sorted([k for k, v in class_heat.items() if v is not None], key=lambda k: class_heat[k])[:3]
    with_quiz = [r["avg_quiz"] for r in rows if r["avg_quiz"] is not None]
    return {
        "course": course, "columns": columns, "students": sorted(rows, key=lambda r: -r["xp"]),
        "class_heat": class_heat, "weakest": weakest,
        "totals": {"students": len(rows), "avg_quiz": _avg(with_quiz), "experiments": sum(r["experiments"] for r in rows),
                   "challenges_solved": sum(r["challenges_solved"] for r in rows)},
    }


def assignment_completion(assignment: Assignment, rows: list[dict]) -> int:
    if not rows:
        return 0
    return round(100 * sum(1 for r in rows if assignment.item_id in r["done_ids"]) / len(rows))
