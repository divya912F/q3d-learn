"""Learning endpoints: lessons, quizzes, challenges, progress, recommendations, saved circuits."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..content import challenges as ch_mod
from ..content import lessons as lesson_mod
from ..database import ChallengeAttempt, LessonProgress, QuizResult, SavedCircuit, User, get_session
from ..quantum.validation import CircuitError
from ..schemas import ChallengeCheck, LessonComplete, QuizSubmit, SaveCircuit
from ..services.progress import recommendations, user_stats
from .quantum import circuit_error

router = APIRouter(prefix="/api", tags=["learning"])


def _user(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user


@router.get("/lessons")
def list_lessons() -> list[dict]:
    return [lesson_mod.public_lesson(l, include_body=False) for l in sorted(lesson_mod.LESSONS, key=lambda l: l["order"])]


@router.get("/lessons/{lesson_id}")
def get_lesson(lesson_id: str) -> dict:
    lesson = lesson_mod.get_lesson(lesson_id)
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    return lesson_mod.public_lesson(lesson)


@router.post("/lessons/complete")
def complete_lesson(body: LessonComplete, db: Session = Depends(get_session)) -> dict:
    _user(db, body.user_id)
    if not lesson_mod.get_lesson(body.lesson_id):
        raise HTTPException(404, "Lesson not found")
    exists = db.scalar(select(LessonProgress).where(LessonProgress.user_id == body.user_id, LessonProgress.lesson_id == body.lesson_id))
    if not exists:
        db.add(LessonProgress(user_id=body.user_id, lesson_id=body.lesson_id))
        db.commit()
    return {"ok": True}


@router.post("/lessons/{lesson_id}/quiz")
def submit_quiz(lesson_id: str, body: QuizSubmit, db: Session = Depends(get_session)) -> dict:
    lesson = lesson_mod.get_lesson(lesson_id)
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    graded = lesson_mod.grade_quiz(lesson, body.answers)
    if body.user_id and db.get(User, body.user_id):
        db.add(QuizResult(user_id=body.user_id, lesson_id=lesson_id, topic=lesson["topic"], score=graded["score"],
                          total=graded["total"], percent=graded["percent"]))
        if graded["percent"] >= 67 and not db.scalar(
            select(LessonProgress).where(LessonProgress.user_id == body.user_id, LessonProgress.lesson_id == lesson_id)
        ):
            db.add(LessonProgress(user_id=body.user_id, lesson_id=lesson_id))
        db.commit()
    return graded


@router.get("/challenges")
def list_challenges() -> list[dict]:
    return [ch_mod.public_challenge(c) for c in ch_mod.CHALLENGES]


@router.post("/challenges/{challenge_id}/check")
def check_challenge(challenge_id: str, body: ChallengeCheck, db: Session = Depends(get_session)) -> dict:
    ch = ch_mod.get_challenge(challenge_id)
    if not ch:
        raise HTTPException(404, "Challenge not found")
    try:
        res = ch_mod.check_challenge(ch, body.num_qubits, body.operations)
    except CircuitError as exc:
        raise circuit_error(exc) from exc
    if body.user_id and db.get(User, body.user_id):
        db.add(ChallengeAttempt(user_id=body.user_id, challenge_id=challenge_id, topic=ch["topic"], solved=res["solved"],
                                fidelity=res["fidelity"], points=res["points"]))
        db.commit()
    return res


@router.get("/progress/{user_id}")
def progress(user_id: int, db: Session = Depends(get_session)) -> dict:
    stats = user_stats(db, _user(db, user_id))
    stats["recommendations"] = recommendations(stats)
    return stats


@router.get("/recommendations/{user_id}")
def get_recommendations(user_id: int, db: Session = Depends(get_session)) -> list[dict]:
    return recommendations(user_stats(db, _user(db, user_id)))


@router.post("/circuits")
def save_circuit(body: SaveCircuit, db: Session = Depends(get_session)) -> dict:
    _user(db, body.user_id)
    c = SavedCircuit(user_id=body.user_id, title=body.title, num_qubits=body.num_qubits,
                     operations=[op.model_dump() for op in body.operations])
    db.add(c)
    db.commit()
    return {"id": c.id, "title": c.title}


@router.get("/circuits/user/{user_id}")
def list_circuits(user_id: int, db: Session = Depends(get_session)) -> list[dict]:
    rows = db.scalars(select(SavedCircuit).where(SavedCircuit.user_id == user_id).order_by(SavedCircuit.created_at.desc())).all()
    return [{"id": c.id, "title": c.title, "num_qubits": c.num_qubits, "operations": c.operations,
             "created_at": c.created_at.isoformat()} for c in rows]


@router.delete("/circuits/{circuit_id}")
def delete_circuit(circuit_id: int, user_id: int, db: Session = Depends(get_session)) -> dict:
    c = db.get(SavedCircuit, circuit_id)
    if not c or c.user_id != user_id:
        raise HTTPException(404, "Circuit not found")
    db.delete(c)
    db.commit()
    return {"ok": True}
