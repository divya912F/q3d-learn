"""Course endpoints: catalogue, lessons, quizzes, challenges, progress, recommendations, saved circuits."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..courses import registry as R
from ..database import ChallengeAttempt, LessonProgress, QuizResult, SavedCircuit, User, get_session
from ..quantum.validation import CircuitError
from ..schemas import LessonComplete, Operation, QuizSubmit, SaveCircuit
from ..services.progress import recommendations, user_stats
from .quantum import circuit_error

router = APIRouter(prefix="/api", tags=["learning"])


class ChallengeSubmit(BaseModel):
    user_id: int | None = None
    num_qubits: int | None = Field(None, ge=1, le=10)
    operations: list[Operation] | None = None
    config: dict[str, Any] | None = None
    answer: Any = None


def _user(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user


def _course(cid: str) -> dict:
    c = R.course(cid)
    if not c:
        raise HTTPException(404, f"Course '{cid}' not found")
    return c


@router.get("/courses")
def list_courses() -> list[dict]:
    return R.courses()


@router.get("/courses/{cid}")
def get_course(cid: str) -> dict:
    c = _course(cid)
    return {**c, "lesson_list": [R.public_lesson(cid, l, include_body=False) for l in R.lessons(cid)],
            "challenge_list": [R.public_challenge(cid, ch) for ch in R.challenges(cid)]}


@router.get("/courses/{cid}/lessons")
def list_lessons(cid: str) -> list[dict]:
    _course(cid)
    return [R.public_lesson(cid, l, include_body=False) for l in R.lessons(cid)]


@router.get("/courses/{cid}/lessons/{lesson_id}")
def get_lesson(cid: str, lesson_id: str) -> dict:
    l = R.lesson(cid, lesson_id)
    if not l:
        raise HTTPException(404, "Lesson not found")
    return R.public_lesson(cid, l)


@router.post("/lessons/complete")
def complete_lesson(body: LessonComplete, db: Session = Depends(get_session)) -> dict:
    _user(db, body.user_id)
    cid, l = R.find_lesson(body.lesson_id)
    if not l:
        raise HTTPException(404, "Lesson not found")
    if not db.scalar(select(LessonProgress).where(LessonProgress.user_id == body.user_id, LessonProgress.lesson_id == body.lesson_id)):
        db.add(LessonProgress(user_id=body.user_id, course=cid, lesson_id=body.lesson_id))
        db.commit()
    return {"ok": True}


@router.post("/courses/{cid}/lessons/{lesson_id}/quiz")
def submit_quiz(cid: str, lesson_id: str, body: QuizSubmit, db: Session = Depends(get_session)) -> dict:
    l = R.lesson(cid, lesson_id)
    if not l:
        raise HTTPException(404, "Lesson not found")
    graded = R.grade_quiz(l, body.answers)
    if body.user_id and db.get(User, body.user_id):
        db.add(QuizResult(user_id=body.user_id, course=cid, lesson_id=lesson_id, topic=l["topic"], score=graded["score"],
                          total=graded["total"], percent=graded["percent"]))
        if graded["percent"] >= 67 and not db.scalar(
            select(LessonProgress).where(LessonProgress.user_id == body.user_id, LessonProgress.lesson_id == lesson_id)
        ):
            db.add(LessonProgress(user_id=body.user_id, course=cid, lesson_id=lesson_id))
        db.commit()
    return graded


@router.get("/courses/{cid}/challenges")
def list_challenges(cid: str) -> list[dict]:
    _course(cid)
    return [R.public_challenge(cid, c) for c in R.challenges(cid)]


@router.post("/courses/{cid}/challenges/{challenge_id}/check")
async def check_challenge(cid: str, challenge_id: str, body: ChallengeSubmit, db: Session = Depends(get_session)) -> dict:
    ch = R.challenge(cid, challenge_id)
    if not ch:
        raise HTTPException(404, "Challenge not found")
    payload = body.model_dump()
    try:
        res = await run_in_threadpool(R.check_challenge, cid, ch, payload)
    except CircuitError as exc:
        raise circuit_error(exc) from exc
    except (ValueError, TypeError, KeyError) as exc:
        raise HTTPException(422, f"Could not check this submission: {exc}") from exc
    res = {**res, "points": ch["points"] if res["solved"] else 0}
    if body.user_id and db.get(User, body.user_id):
        db.add(ChallengeAttempt(user_id=body.user_id, course=cid, challenge_id=challenge_id, topic=ch["topic"], solved=bool(res["solved"]),
                                fidelity=float(res.get("fidelity", res.get("score", 0.0)) or 0.0), points=res["points"]))
        db.commit()
    return res


@router.get("/progress/{user_id}")
def progress(user_id: int, course: str | None = None, db: Session = Depends(get_session)) -> dict:
    stats = user_stats(db, _user(db, user_id))
    stats["recommendations"] = recommendations(stats, course if course in R.course_ids() else None)
    return stats


@router.post("/circuits")
def save_circuit(body: SaveCircuit, db: Session = Depends(get_session)) -> dict:
    _user(db, body.user_id)
    c = SavedCircuit(user_id=body.user_id, title=body.title, num_qubits=body.num_qubits, operations=[op.model_dump() for op in body.operations])
    db.add(c)
    db.commit()
    return {"id": c.id, "title": c.title}


@router.get("/circuits/user/{user_id}")
def list_circuits(user_id: int, db: Session = Depends(get_session)) -> list[dict]:
    rows = db.scalars(select(SavedCircuit).where(SavedCircuit.user_id == user_id).order_by(SavedCircuit.created_at.desc())).all()
    return [{"id": c.id, "title": c.title, "num_qubits": c.num_qubits, "operations": c.operations, "created_at": c.created_at.isoformat()} for c in rows]


@router.delete("/circuits/{circuit_id}")
def delete_circuit(circuit_id: int, user_id: int, db: Session = Depends(get_session)) -> dict:
    c = db.get(SavedCircuit, circuit_id)
    if not c or c.user_id != user_id:
        raise HTTPException(404, "Circuit not found")
    db.delete(c)
    db.commit()
    return {"ok": True}
