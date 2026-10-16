"""Seed a demo classroom (every course) so the instructor dashboard can be explored immediately."""
from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..courses import registry as R
from ..database import Assignment, ChallengeAttempt, Classroom, Experiment, LessonProgress, QuizResult, TutorMessage, User

DEMO_CODE = "DEMO42"
STUDENTS = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Saanvi", "Vihaan", "Ishita", "Arjun", "Ananya", "Tara", "Neel"]
# topics that the demo class finds harder (gives the heatmap something to show)
HARD = {"phase": 0.35, "entanglement": 0.3, "algorithms": 0.25, "bloch": 0.1, "neural": 0.3, "evaluation": 0.25, "trees": 0.1,
        "correlation": 0.2, "probability": 0.3, "heuristics": 0.25, "rl": 0.3, "games": 0.15,
        "recursion": 0.25, "graphs": 0.3, "publickey": 0.3, "consensus": 0.25, "attention": 0.35, "cnn": 0.2}
LABS = {"quantum": ["builder", "bloch"], "ml": ["regression", "classifier", "kmeans"], "ds": ["explorer", "pipeline", "stats"],
        "ai": ["search", "minimax", "rl", "nlp"], "dsa": ["sorting", "graphs", "trees"], "cyber": ["ciphers", "hashing", "rsa"],
        "chain": ["ledger", "merkle", "attack"], "dl": ["conv", "attention", "dream"]}


def seed_demo_classroom(db: Session, instructor_id: int | None = None) -> str:
    if db.scalar(select(Classroom).where(Classroom.code == DEMO_CODE)):
        return DEMO_CODE
    rng = random.Random(42)
    now = datetime.now(timezone.utc)
    if instructor_id is None:
        teacher = User(name="Demo Instructor", role="instructor", classroom_code=DEMO_CODE)
        db.add(teacher)
        db.flush()
        instructor_id = teacher.id
    room = Classroom(code=DEMO_CODE, name="Future Tech Studies (Demo)", instructor_id=instructor_id)
    db.add(room)
    db.flush()

    for i, name in enumerate(STUDENTS):
        skill = 0.3 + 0.6 * (i % 5) / 4 + rng.uniform(-0.1, 0.1)
        u = User(name=name, role="student", classroom_code=DEMO_CODE, created_at=now - timedelta(days=25))
        db.add(u)
        db.flush()
        for cid in R.course_ids():
            interest = rng.random()
            if interest < 0.2:  # not every student takes every course
                continue
            lessons = R.lessons(cid)
            n_lessons = max(1, min(len(lessons), int(round(skill * interest * len(lessons) * 1.3)) + rng.randint(-1, 1)))
            for lesson in lessons[:n_lessons]:
                when = now - timedelta(days=rng.randint(0, 13), hours=rng.randint(0, 23))
                db.add(LessonProgress(user_id=u.id, course=cid, lesson_id=lesson["id"], completed_at=when))
                p = max(0.1, skill - HARD.get(lesson["topic"], 0.0) + 0.05)
                score = sum(1 for _ in lesson["quiz"] if rng.random() < p)
                db.add(QuizResult(user_id=u.id, course=cid, lesson_id=lesson["id"], topic=lesson["topic"], score=score,
                                  total=len(lesson["quiz"]), percent=round(100 * score / len(lesson["quiz"])), created_at=when))
            for ch in R.challenges(cid):
                if rng.random() < skill * interest:
                    ok = rng.random() < skill
                    db.add(ChallengeAttempt(user_id=u.id, course=cid, challenge_id=ch["id"], topic=ch["topic"], solved=ok,
                                            fidelity=1.0 if ok else round(rng.uniform(0.2, 0.9), 2), points=ch["points"] if ok else 0,
                                            created_at=now - timedelta(days=rng.randint(0, 13))))
            for _ in range(rng.randint(1, int(4 + 18 * interest))):
                db.add(Experiment(user_id=u.id, course=cid, lab=rng.choice(LABS[cid]), num_qubits=rng.randint(1, 4) if cid == "quantum" else 0,
                                  gate_count=rng.randint(1, 12) if cid == "quantum" else 0, depth=rng.randint(1, 8) if cid == "quantum" else 0,
                                  backend="q3d" if cid == "quantum" else "numpy", state_name="",
                                  created_at=now - timedelta(days=rng.randint(0, 13), hours=rng.randint(0, 23))))
        for _ in range(rng.randint(0, 10)):
            db.add(TutorMessage(user_id=u.id, question="(demo question)", provider="offline"))

    soon = (now + timedelta(days=3)).date().isoformat()
    later = (now + timedelta(days=7)).date().isoformat()
    db.add_all([
        Assignment(classroom_id=room.id, course="quantum", title="Read: The Bloch Sphere", item_type="lesson", item_id="bloch", due=soon),
        Assignment(classroom_id=room.id, course="quantum", title="Prepare a Bell state", item_type="challenge", item_id="bell", due=later),
        Assignment(classroom_id=room.id, course="ml", title="Neural networks lesson", item_type="lesson", item_id="ml-neural", due=later),
        Assignment(classroom_id=room.id, course="ds", title="Data Janitor challenge", item_type="challenge", item_id="ds-clean", due=later),
        Assignment(classroom_id=room.id, course="ai", title="A* search lesson", item_type="lesson", item_id="ai-astar", due=soon),
    ])
    db.commit()
    return DEMO_CODE
