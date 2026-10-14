"""Learning analytics: XP, topic mastery, recommendations and instructor overviews."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..content.challenges import CHALLENGES
from ..content.lessons import LESSONS, TOPICS
from ..database import Assignment, ChallengeAttempt, Experiment, LessonProgress, QuizResult, TutorMessage, User

XP_LESSON = 50
XP_PER_CORRECT = 10
XP_EXPERIMENT = 2
XP_EXPERIMENT_CAP = 100
XP_PER_LEVEL = 250


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def user_stats(db: Session, user: User) -> dict:
    lessons_done = set(db.scalars(select(LessonProgress.lesson_id).where(LessonProgress.user_id == user.id)))
    quizzes = db.scalars(select(QuizResult).where(QuizResult.user_id == user.id)).all()
    attempts = db.scalars(select(ChallengeAttempt).where(ChallengeAttempt.user_id == user.id)).all()
    experiments = db.scalars(
        select(Experiment).where(Experiment.user_id == user.id).order_by(Experiment.created_at.desc())
    ).all()
    questions = db.scalar(select(func.count()).select_from(TutorMessage).where(TutorMessage.user_id == user.id)) or 0

    best_quiz: dict[str, QuizResult] = {}
    for q in quizzes:
        if q.lesson_id not in best_quiz or q.percent > best_quiz[q.lesson_id].percent:
            best_quiz[q.lesson_id] = q

    solved: dict[str, ChallengeAttempt] = {}
    attempted: set[str] = set()
    for a in attempts:
        attempted.add(a.challenge_id)
        if a.solved and a.challenge_id not in solved:
            solved[a.challenge_id] = a

    xp = (
        XP_LESSON * len(lessons_done)
        + XP_PER_CORRECT * sum(q.score for q in best_quiz.values())
        + sum(a.points for a in solved.values())
        + min(XP_EXPERIMENT_CAP, XP_EXPERIMENT * len(experiments))
    )

    # Topic mastery: average best-quiz percentage, nudged by challenge outcomes.
    topic_scores: dict[str, list[float]] = defaultdict(list)
    for q in best_quiz.values():
        topic_scores[q.topic].append(q.percent)
    for cid in attempted:
        ch = next((c for c in CHALLENGES if c["id"] == cid), None)
        if ch:
            topic_scores[ch["topic"]].append(100.0 if cid in solved else 40.0)
    mastery = {t: (round(sum(v) / len(v)) if (v := topic_scores.get(t)) else None) for t in TOPICS}
    weak = [t for t, m in mastery.items() if m is not None and m < 70]

    now = datetime.now(timezone.utc)
    activity = defaultdict(int)
    stamps = (
        [_aware(e.created_at) for e in experiments]
        + [_aware(q.created_at) for q in quizzes]
        + [_aware(a.created_at) for a in attempts]
    )
    for ts in stamps:
        day = (now - ts).days
        if 0 <= day < 14:
            activity[(now - timedelta(days=day)).date().isoformat()] += 1
    activity_series = [
        {"date": (now - timedelta(days=d)).date().isoformat(), "count": activity.get((now - timedelta(days=d)).date().isoformat(), 0)}
        for d in range(13, -1, -1)
    ]
    last_active = max(stamps) if stamps else _aware(user.created_at)

    return {
        "user": {"id": user.id, "name": user.name, "role": user.role, "classroom_code": user.classroom_code},
        "xp": xp,
        "level": xp // XP_PER_LEVEL + 1,
        "level_progress": round(100 * (xp % XP_PER_LEVEL) / XP_PER_LEVEL),
        "lessons_completed": sorted(lessons_done, key=lambda lid: next((l["order"] for l in LESSONS if l["id"] == lid), 99)),
        "lessons_total": len(LESSONS),
        "quiz_best": {k: {"score": v.score, "total": v.total, "percent": v.percent} for k, v in best_quiz.items()},
        "quiz_history": [
            {"lesson_id": q.lesson_id, "percent": q.percent, "date": _aware(q.created_at).isoformat()}
            for q in sorted(quizzes, key=lambda q: _aware(q.created_at))
        ][-20:],
        "challenges_solved": sorted(solved),
        "challenges_total": len(CHALLENGES),
        "experiments": len(experiments),
        "recent_experiments": [
            {"num_qubits": e.num_qubits, "gate_count": e.gate_count, "depth": e.depth, "backend": e.backend,
             "state": e.state_name, "date": _aware(e.created_at).isoformat()}
            for e in experiments[:8]
        ],
        "questions_asked": questions,
        "mastery": mastery,
        "weak_topics": weak,
        "activity": activity_series,
        "last_active": last_active.isoformat(),
    }


def recommendations(stats: dict) -> list[dict]:
    recs: list[dict] = []
    done = set(stats["lessons_completed"])
    for t in stats["weak_topics"]:
        lesson = next((l for l in LESSONS if l["topic"] == t), None)
        if lesson:
            recs.append({"type": "lesson", "id": lesson["id"], "title": f"Review: {lesson['title']}",
                         "reason": f"Your {TOPICS[t].lower()} score is {stats['mastery'][t]}% — a quick review will lock it in."})
    nxt = next((l for l in sorted(LESSONS, key=lambda l: l["order"]) if l["id"] not in done), None)
    if nxt:
        recs.append({"type": "lesson", "id": nxt["id"], "title": f"Next up: {nxt['title']}", "reason": nxt["summary"]})
    if stats["experiments"] == 0:
        recs.append({"type": "builder", "id": "bell", "title": "Run your first circuit",
                     "reason": "Load the Bell-state example in the Circuit Builder and press Run."})
    done_topics = {l["topic"] for l in LESSONS if l["id"] in done} | {"gates", "superposition"}
    for ch in CHALLENGES:
        if ch["id"] not in stats["challenges_solved"] and ch["topic"] in done_topics:
            recs.append({"type": "challenge", "id": ch["id"], "title": f"Challenge: {ch['title']}",
                         "reason": f"{ch['difficulty']} · {ch['points']} XP — {ch['description']}"})
            break
    if not recs:
        recs.append({"type": "algorithm", "id": "qft", "title": "Explore the Quantum Fourier Transform",
                     "reason": "You've finished the core path — time for advanced algorithms!"})
    return recs[:4]


def classroom_overview(db: Session, code: str) -> dict:
    students = db.scalars(select(User).where(User.classroom_code == code, User.role == "student")).all()
    rows = []
    topic_acc: dict[str, list[int]] = defaultdict(list)
    for s in students:
        st = user_stats(db, s)
        quiz_vals = [v["percent"] for v in st["quiz_best"].values()]
        rows.append({
            "id": s.id, "name": s.name, "xp": st["xp"], "level": st["level"],
            "lessons_completed": len(st["lessons_completed"]),
            "avg_quiz": round(sum(quiz_vals) / len(quiz_vals)) if quiz_vals else None,
            "challenges_solved": len(st["challenges_solved"]),
            "experiments": st["experiments"], "questions_asked": st["questions_asked"],
            "weak_topics": st["weak_topics"], "mastery": st["mastery"], "last_active": st["last_active"],
            "lessons_done_ids": st["lessons_completed"], "challenges_done_ids": st["challenges_solved"],
        })
        for t, m in st["mastery"].items():
            if m is not None:
                topic_acc[t].append(m)
    heat = {t: (round(sum(v) / len(v)) if (v := topic_acc.get(t)) else None) for t in TOPICS}
    weakest = sorted([t for t, v in heat.items() if v is not None], key=lambda t: heat[t])[:3]
    return {
        "students": sorted(rows, key=lambda r: -r["xp"]),
        "topic_mastery": heat,
        "weakest_topics": weakest,
        "totals": {
            "students": len(rows),
            "avg_quiz": round(sum(r["avg_quiz"] for r in rows if r["avg_quiz"] is not None) / max(1, sum(1 for r in rows if r["avg_quiz"] is not None))) if rows else None,
            "experiments": sum(r["experiments"] for r in rows),
            "challenges_solved": sum(r["challenges_solved"] for r in rows),
        },
    }


def assignment_completion(assignment: Assignment, rows: list[dict]) -> int:
    if not rows:
        return 0
    key = "lessons_done_ids" if assignment.item_type == "lesson" else "challenges_done_ids"
    done = sum(1 for r in rows if assignment.item_id in r[key])
    return round(100 * done / len(rows))
