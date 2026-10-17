"""Study-tool endpoints: spaced-repetition review, glossary, focus sessions, notes and certificates."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..courses import registry as R
from ..database import FocusSession, LessonProgress, Note, ReviewCard, ReviewLog, User, get_session
from ..services import study as S
from ..services.progress import user_stats

router = APIRouter(prefix="/api", tags=["study tools"])

NEW_PER_SESSION = 10


def _user(db: Session, uid: int) -> User:
    u = db.get(User, uid)
    if not u:
        raise HTTPException(404, "User not found")
    return u


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _course_or_none(course: str | None) -> str | None:
    if course in (None, "", "all"):
        return None
    if course not in R.course_ids():
        raise HTTPException(404, f"Course '{course}' not found")
    return course


# ------------------------------------------------------------------ glossary & deck
@router.get("/glossary")
def get_glossary(course: str | None = None) -> list[dict]:
    c = _course_or_none(course)
    return [g for g in S.glossary() if c is None or g["course"] == c]


@router.get("/review/deck")
def get_deck(course: str | None = None) -> dict:
    c = _course_or_none(course)
    cards = [x for x in S.deck() if c is None or x["course"] == c]
    return {"total": len(cards), "by_course": {cid: sum(1 for x in S.deck() if x["course"] == cid) for cid in R.ORDER}, "cards": cards}


# ------------------------------------------------------------------ spaced repetition
def _state(row: ReviewCard | None) -> S.CardState:
    return S.CardState(row.ease, row.interval, row.reps, row.lapses) if row else S.CardState()


def _review_stats(db: Session, uid: int, course: str | None) -> dict:
    now = S.now_utc()
    rows = db.scalars(select(ReviewCard).where(ReviewCard.user_id == uid)).all()
    if course:
        rows = [r for r in rows if r.course == course]
    index = S.card_index()
    rows = [r for r in rows if r.card_id in index]
    total = sum(1 for c in S.deck() if course is None or c["course"] == course)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    q = select(func.count()).select_from(ReviewLog).where(ReviewLog.user_id == uid, ReviewLog.created_at >= start)
    if course:
        q = q.where(ReviewLog.course == course)
    return {
        "due": sum(1 for r in rows if _aware(r.due) <= now),
        "learning": sum(1 for r in rows if r.reps == 0 or r.interval < 1),
        "young": sum(1 for r in rows if 1 <= r.interval < 21),
        "mature": sum(1 for r in rows if r.interval >= 21),
        "seen": len(rows), "unseen": total - len(rows), "total": total,
        "reviewed_today": db.scalar(q) or 0,
    }


@router.get("/review/{uid}/due")
def due_cards(uid: int, course: str | None = None, limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_session)) -> dict:
    """Cards to study now: everything due, then new cards (lessons you finished first)."""
    _user(db, uid)
    c = _course_or_none(course)
    now = S.now_utc()
    index = S.card_index()
    rows = {r.card_id: r for r in db.scalars(select(ReviewCard).where(ReviewCard.user_id == uid)).all()}
    due = sorted((r for r in rows.values() if r.card_id in index and _aware(r.due) <= now and (c is None or r.course == c)),
                 key=lambda r: _aware(r.due))
    queue = [index[r.card_id] | {"state": "review" if r.reps else "learning", "preview": S.preview(_state(r))} for r in due]
    if len(queue) < limit:
        done = {lp.lesson_id for lp in db.scalars(select(LessonProgress).where(LessonProgress.user_id == uid)).all()}
        fresh = [x for x in S.deck() if x["id"] not in rows and (c is None or x["course"] == c)]
        fresh.sort(key=lambda x: (x["lesson_id"] not in done, R.ORDER.index(x["course"]), x["order"], x["kind"] != "quiz"))
        queue += [x | {"state": "new", "preview": S.preview(S.CardState())} for x in fresh[:min(NEW_PER_SESSION, limit - len(queue))]]
    return {"cards": queue[:limit], "stats": _review_stats(db, uid, c)}


class GradeBody(BaseModel):
    card_id: str = Field(..., max_length=96)
    grade: str = Field(..., pattern="^(again|hard|good|easy)$")


@router.post("/review/{uid}/grade")
def grade_card(uid: int, body: GradeBody, db: Session = Depends(get_session)) -> dict:
    _user(db, uid)
    card = S.card_index().get(body.card_id)
    if not card:
        raise HTTPException(404, "Card not found")
    row = db.scalar(select(ReviewCard).where(ReviewCard.user_id == uid, ReviewCard.card_id == body.card_id))
    new, delay = S.schedule(_state(row), S.GRADES[body.grade])
    now = S.now_utc()
    if row is None:
        row = ReviewCard(user_id=uid, card_id=body.card_id, course=card["course"])
        db.add(row)
    row.ease, row.interval, row.reps, row.lapses = new.ease, new.interval, new.reps, new.lapses
    row.due, row.updated_at = now + delay, now
    db.add(ReviewLog(user_id=uid, card_id=body.card_id, course=card["course"], grade=S.GRADES[body.grade]))
    db.commit()
    return {"card_id": body.card_id, "ease": new.ease, "interval_days": new.interval, "reps": new.reps,
            "due": row.due.isoformat(), "next_in_minutes": round(delay.total_seconds() / 60)}


@router.get("/review/{uid}/stats")
def review_stats(uid: int, course: str | None = None, db: Session = Depends(get_session)) -> dict:
    _user(db, uid)
    return _review_stats(db, uid, _course_or_none(course))


def _memory_status(row: ReviewCard | None, now: datetime) -> str:
    """Traffic-light memory state for one concept."""
    if row is None:
        return "new"                       # never studied (grey)
    if _aware(row.due) <= now:
        return "forgetting"                # due now — most likely to be forgotten (red)
    if row.interval >= 21:
        return "mastered"                  # long, stable interval (green)
    return "practice"                      # learned but still young (yellow)


@router.get("/review/{uid}/memory")
def memory_map(uid: int, db: Session = Depends(get_session)) -> dict:
    """Memory Radar: per-course / per-topic retention (mastered / practice / forgetting / new),
    plus the exact concepts to revise today."""
    _user(db, uid)
    now = S.now_utc()
    rows = {r.card_id: r for r in db.scalars(select(ReviewCard).where(ReviewCard.user_id == uid)).all()}
    courses, totals, revise = [], {"mastered": 0, "practice": 0, "forgetting": 0, "new": 0}, []
    for cid in R.ORDER:
        meta = R.course(cid)
        topic_labels = R.topics(cid)
        by_topic: dict[str, list[dict]] = {}
        cc = {"mastered": 0, "practice": 0, "forgetting": 0, "new": 0}
        for card in (c for c in S.deck() if c["course"] == cid):
            status = _memory_status(rows.get(card["id"]), now)
            cc[status] += 1
            totals[status] += 1
            t = card.get("topic") or "general"
            by_topic.setdefault(t, []).append({"id": card["id"], "front": card["front"], "status": status, "kind": card["kind"]})
            if status == "forgetting":
                revise.append({"id": card["id"], "front": card["front"], "course": cid, "topic": topic_labels.get(t, t)})
        topics = []
        for t, items in by_topic.items():
            n = {"mastered": 0, "practice": 0, "forgetting": 0, "new": 0}
            for it in items:
                n[it["status"]] += 1
            # a topic's colour: red if anything is being forgotten, green if all mastered, grey if untouched, else yellow
            if n["forgetting"]:
                status = "forgetting"
            elif n["new"] == len(items):
                status = "new"
            elif n["mastered"] == len(items):
                status = "mastered"
            else:
                status = "practice"
            seen = len(items) - n["new"]
            score = round(100 * (n["mastered"] + 0.5 * n["practice"]) / len(items)) if items else 0
            topics.append({"topic": t, "label": topic_labels.get(t, t.title()), "status": status,
                           "score": score, "seen": seen, "total": len(items), "counts": n})
        total = sum(cc.values())
        courses.append({"course": cid, "title": meta["title"], "short": meta["short"], "counts": cc,
                        "total": total, "topics": topics,
                        "score": round(100 * (cc["mastered"] + 0.5 * cc["practice"]) / total) if total else 0})
    return {"courses": courses, "totals": {**totals, "due": len(revise)}, "revise_today": revise[:40]}


# ------------------------------------------------------------------ focus sessions
class FocusBody(BaseModel):
    user_id: int
    minutes: int = Field(..., ge=1, le=240)
    course: str | None = None
    label: str = Field("", max_length=120)


@router.post("/focus")
def log_focus(body: FocusBody, db: Session = Depends(get_session)) -> dict:
    _user(db, body.user_id)
    course = body.course if body.course in R.course_ids() else None
    db.add(FocusSession(user_id=body.user_id, minutes=body.minutes, course=course, label=body.label.strip()))
    db.commit()
    return focus_summary(body.user_id, db)


@router.get("/focus/{uid}")
def focus_summary(uid: int, db: Session = Depends(get_session)) -> dict:
    _user(db, uid)
    now = S.now_utc()
    rows = db.scalars(select(FocusSession).where(FocusSession.user_id == uid)).all()
    today = now.date()
    week = [r for r in rows if (now - _aware(r.created_at)) < timedelta(days=7)]
    days = []
    for d in range(6, -1, -1):
        day = (now - timedelta(days=d)).date()
        days.append({"date": day.isoformat(), "minutes": sum(r.minutes for r in rows if _aware(r.created_at).date() == day)})
    return {
        "today_minutes": sum(r.minutes for r in rows if _aware(r.created_at).date() == today),
        "week_minutes": sum(r.minutes for r in week), "total_minutes": sum(r.minutes for r in rows),
        "sessions": len(rows), "days": days,
    }


# ------------------------------------------------------------------ notes
class NoteBody(BaseModel):
    text: str = Field("", max_length=20000)


def _find_lesson(lesson_id: str) -> tuple[str, dict]:
    cid, lesson = R.find_lesson(lesson_id)
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    return cid, lesson


@router.get("/notes/{uid}")
def list_notes(uid: int, db: Session = Depends(get_session)) -> list[dict]:
    _user(db, uid)
    out = []
    for n in db.scalars(select(Note).where(Note.user_id == uid).order_by(Note.updated_at.desc())).all():
        if not n.text.strip():
            continue
        cid, lesson = R.find_lesson(n.lesson_id)
        out.append({"lesson_id": n.lesson_id, "course": n.course, "lesson_title": lesson["title"] if lesson else n.lesson_id,
                    "order": lesson.get("order", 0) if lesson else 0, "text": n.text, "updated_at": _aware(n.updated_at).isoformat()})
    return out


@router.get("/notes/{uid}/{lesson_id}")
def get_note(uid: int, lesson_id: str, db: Session = Depends(get_session)) -> dict:
    _user(db, uid)
    _find_lesson(lesson_id)
    n = db.scalar(select(Note).where(Note.user_id == uid, Note.lesson_id == lesson_id))
    return {"lesson_id": lesson_id, "text": n.text if n else "", "updated_at": _aware(n.updated_at).isoformat() if n else None}


@router.put("/notes/{uid}/{lesson_id}")
def put_note(uid: int, lesson_id: str, body: NoteBody, db: Session = Depends(get_session)) -> dict:
    _user(db, uid)
    cid, _ = _find_lesson(lesson_id)
    n = db.scalar(select(Note).where(Note.user_id == uid, Note.lesson_id == lesson_id))
    if n is None:
        n = Note(user_id=uid, lesson_id=lesson_id, course=cid)
        db.add(n)
    n.text, n.updated_at = body.text, S.now_utc()
    db.commit()
    return {"lesson_id": lesson_id, "text": n.text, "updated_at": n.updated_at.isoformat()}


# ------------------------------------------------------------------ certificates
@router.get("/certificate/{uid}/{course}")
def certificate(uid: int, course: str, db: Session = Depends(get_session)) -> dict:
    user = _user(db, uid)
    if course not in R.course_ids():
        raise HTTPException(404, "Course not found")
    status = S.certificate_status(user_stats(db, user), course)
    meta = R.course(course)
    out = {"course": course, "course_title": meta["title"], "name": user.name, **status}
    if status["eligible"]:
        last = db.scalar(select(func.max(LessonProgress.completed_at)).where(LessonProgress.user_id == uid, LessonProgress.course == course))
        out["date"] = _aware(last or S.now_utc()).date().isoformat()
        out["code"] = S.certificate_code(uid, course, user.name)
    return out


@router.get("/certificates/verify/{code}")
def verify_certificate(code: str, db: Session = Depends(get_session)) -> dict:
    code = code.strip().upper()
    for user in db.scalars(select(User)).all():
        for cid in R.course_ids():
            if S.certificate_code(user.id, cid, user.name) == code:
                status = S.certificate_status(user_stats(db, user), cid)
                return {"valid": status["eligible"], "name": user.name, "course": R.course(cid)["title"]}
    return {"valid": False}
