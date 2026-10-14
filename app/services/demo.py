"""Seed a demo classroom so the instructor dashboard can be explored immediately."""
from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..content.challenges import CHALLENGES
from ..content.lessons import LESSONS
from ..database import (
    Assignment,
    ChallengeAttempt,
    Classroom,
    Experiment,
    LessonProgress,
    QuizResult,
    TutorMessage,
    User,
)

DEMO_CODE = "DEMO42"
STUDENTS = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Saanvi", "Vihaan", "Ishita", "Arjun", "Ananya"]
STATES = ["Bell |Φ+⟩", "|+⟩", "GHZ state (3 qubits)", "Superposition", "|1⟩", "Entangled state"]


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
    room = Classroom(code=DEMO_CODE, name="Quantum Computing 101 (Demo)", instructor_id=instructor_id)
    db.add(room)
    db.flush()

    for i, name in enumerate(STUDENTS):
        skill = 0.3 + 0.6 * (i % 5) / 4 + rng.uniform(-0.1, 0.1)  # mixed ability levels
        u = User(name=name, role="student", classroom_code=DEMO_CODE, created_at=now - timedelta(days=20))
        db.add(u)
        db.flush()
        n_lessons = max(1, min(len(LESSONS), int(round(skill * len(LESSONS))) + rng.randint(-1, 1)))
        for lesson in LESSONS[:n_lessons]:
            when = now - timedelta(days=rng.randint(0, 13), hours=rng.randint(0, 23))
            db.add(LessonProgress(user_id=u.id, lesson_id=lesson["id"], completed_at=when))
            hard = {"entanglement": 0.3, "phase": 0.35, "algorithms": 0.25, "bloch": 0.1}.get(lesson["topic"], 0.0)
            score = sum(1 for _ in lesson["quiz"] if rng.random() < max(0.1, skill - hard + 0.05))
            db.add(QuizResult(user_id=u.id, lesson_id=lesson["id"], topic=lesson["topic"], score=score,
                              total=len(lesson["quiz"]), percent=round(100 * score / len(lesson["quiz"])), created_at=when))
        for ch in CHALLENGES:
            if rng.random() < skill * 0.8:
                ok = rng.random() < skill
                db.add(ChallengeAttempt(user_id=u.id, challenge_id=ch["id"], topic=ch["topic"], solved=ok,
                                        fidelity=1.0 if ok else round(rng.uniform(0.2, 0.9), 2), points=ch["points"] if ok else 0,
                                        created_at=now - timedelta(days=rng.randint(0, 13))))
        for _ in range(rng.randint(3, 30)):
            nq = rng.randint(1, 4)
            db.add(Experiment(user_id=u.id, num_qubits=nq, gate_count=rng.randint(1, 12), depth=rng.randint(1, 8),
                              backend="q3d", state_name=rng.choice(STATES), created_at=now - timedelta(days=rng.randint(0, 13), hours=rng.randint(0, 23))))
        for _ in range(rng.randint(0, 8)):
            db.add(TutorMessage(user_id=u.id, question="(demo question)", provider="offline"))

    db.add(Assignment(classroom_id=room.id, title="Read: The Bloch Sphere", item_type="lesson", item_id="bloch", due=(now + timedelta(days=3)).date().isoformat()))
    db.add(Assignment(classroom_id=room.id, title="Prepare a Bell state", item_type="challenge", item_id="bell", due=(now + timedelta(days=7)).date().isoformat()))
    db.commit()
    return DEMO_CODE
