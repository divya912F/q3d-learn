"""Users, AI tutor, classrooms and the instructor dashboard."""
from __future__ import annotations

import secrets
import string

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..ai import tutor
from ..courses import registry as R
from ..database import Assignment, Classroom, Material, TutorMessage, User, get_session
from ..schemas import AssignmentCreate, ClassroomCreate, MaterialCreate, TutorRequest, UserCreate
from ..services.demo import seed_demo_classroom
from ..services.progress import assignment_completion, classroom_overview

router = APIRouter(prefix="/api", tags=["community"])


# ----------------------------------------------------------------------------- users
@router.post("/users")
def create_user(body: UserCreate, db: Session = Depends(get_session)) -> dict:
    code = body.classroom_code.strip().upper() if body.classroom_code else None
    if code and not db.scalar(select(Classroom).where(Classroom.code == code)):
        raise HTTPException(404, f"Classroom '{code}' does not exist")
    user = User(name=body.name.strip(), role=body.role, classroom_code=code)
    db.add(user)
    db.commit()
    return {"id": user.id, "name": user.name, "role": user.role, "classroom_code": user.classroom_code}


@router.get("/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_session)) -> dict:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return {"id": user.id, "name": user.name, "role": user.role, "classroom_code": user.classroom_code}


@router.post("/users/{user_id}/join/{code}")
def join_classroom(user_id: int, code: str, db: Session = Depends(get_session)) -> dict:
    user = db.get(User, user_id)
    code = code.strip().upper()
    if not user:
        raise HTTPException(404, "User not found")
    if not db.scalar(select(Classroom).where(Classroom.code == code)):
        raise HTTPException(404, f"Classroom '{code}' does not exist")
    user.classroom_code = code
    db.commit()
    return {"ok": True, "classroom_code": code}


# -------------------------------------------------------------------------- AI tutor
@router.get("/tutor/status")
def tutor_status() -> dict:
    return {"provider": tutor.active_provider()}


@router.post("/tutor/ask")
async def tutor_ask(req: TutorRequest, db: Session = Depends(get_session)) -> dict:
    circuit = req.circuit.model_dump() if req.circuit else None
    lab = req.lab.model_dump() if req.lab else None
    answer = await run_in_threadpool(
        tutor.ask, req.question, circuit, req.result, req.history, req.lesson_id, req.challenge_id, req.course, lab
    )
    if req.user_id and db.get(User, req.user_id):
        db.add(TutorMessage(user_id=req.user_id, question=req.question[:2000], provider=answer["provider"]))
        db.commit()
    return answer


# ------------------------------------------------------------------------ classrooms
def _code(db: Session) -> str:
    alphabet = string.ascii_uppercase + string.digits
    while True:
        code = "".join(secrets.choice(alphabet) for _ in range(6))
        if not db.scalar(select(Classroom).where(Classroom.code == code)):
            return code


@router.post("/classrooms")
def create_classroom(body: ClassroomCreate, db: Session = Depends(get_session)) -> dict:
    teacher = db.get(User, body.instructor_id)
    if not teacher or teacher.role != "instructor":
        raise HTTPException(403, "Only instructors can create classrooms")
    room = Classroom(code=_code(db), name=body.name.strip(), instructor_id=teacher.id)
    db.add(room)
    db.commit()
    return {"code": room.code, "name": room.name}


@router.get("/classrooms/instructor/{instructor_id}")
def my_classrooms(instructor_id: int, db: Session = Depends(get_session)) -> list[dict]:
    rooms = db.scalars(select(Classroom).where(Classroom.instructor_id == instructor_id)).all()
    return [{"code": r.code, "name": r.name} for r in rooms]


@router.post("/classrooms/demo")
def demo_classroom(instructor_id: int | None = None, db: Session = Depends(get_session)) -> dict:
    try:
        code = seed_demo_classroom(db, instructor_id)
    except IntegrityError:
        # two "Load demo class" clicks can race to create DEMO42 — the loser just reuses it
        db.rollback()
        code = "DEMO42"
    room = db.scalar(select(Classroom).where(Classroom.code == code))
    return {"code": code, "name": room.name if room else code}


@router.get("/classrooms/{code}/overview")
def overview(code: str, course: str = "all", db: Session = Depends(get_session)) -> dict:
    code = code.upper()
    room = db.scalar(select(Classroom).where(Classroom.code == code))
    if not room:
        raise HTTPException(404, "Classroom not found")
    data = classroom_overview(db, code, course)
    q = select(Assignment).where(Assignment.classroom_id == room.id)
    if data["course"] != "all":
        q = q.where(Assignment.course == data["course"])
    assignments = db.scalars(q.order_by(Assignment.created_at)).all()
    data["classroom"] = {"code": room.code, "name": room.name}
    data["assignments"] = [
        {"id": a.id, "title": a.title, "course": a.course, "item_type": a.item_type, "item_id": a.item_id, "due": a.due,
         "completion": assignment_completion(a, data["students"])}
        for a in assignments
    ]
    return data


@router.post("/classrooms/{code}/assignments")
def add_assignment(code: str, body: AssignmentCreate, db: Session = Depends(get_session)) -> dict:
    room = db.scalar(select(Classroom).where(Classroom.code == code.upper()))
    if not room:
        raise HTTPException(404, "Classroom not found")
    cid = R.find_lesson(body.item_id)[0] if body.item_type == "lesson" else R.find_challenge(body.item_id)[0]
    if not cid:
        raise HTTPException(404, f"Unknown {body.item_type} '{body.item_id}'")
    a = Assignment(classroom_id=room.id, course=cid, title=body.title, item_type=body.item_type, item_id=body.item_id, due=body.due)
    db.add(a)
    db.commit()
    return {"id": a.id}


@router.get("/classrooms/{code}/assignments")
def list_assignments(code: str, db: Session = Depends(get_session)) -> list[dict]:
    room = db.scalar(select(Classroom).where(Classroom.code == code.upper()))
    if not room:
        raise HTTPException(404, "Classroom not found")
    rows = db.scalars(select(Assignment).where(Assignment.classroom_id == room.id)).all()
    return [{"id": a.id, "title": a.title, "course": a.course, "item_type": a.item_type, "item_id": a.item_id, "due": a.due} for a in rows]


# ----------------------------------------------------------------------- study materials
def _material_dict(m: Material) -> dict:
    return {"id": m.id, "title": m.title, "body": m.body, "link": m.link, "course": m.course,
            "created_at": m.created_at.isoformat() if m.created_at else None}


@router.post("/classrooms/{code}/materials")
def add_material(code: str, body: MaterialCreate, db: Session = Depends(get_session)) -> dict:
    room = db.scalar(select(Classroom).where(Classroom.code == code.upper()))
    if not room:
        raise HTTPException(404, "Classroom not found")
    if room.instructor_id != body.instructor_id:
        raise HTTPException(403, "Only this classroom's instructor can add study material")
    if not body.body.strip() and not (body.link or "").strip():
        raise HTTPException(422, "Add some notes or a link")
    m = Material(classroom_id=room.id, title=body.title.strip(), body=body.body.strip(),
                 link=(body.link or "").strip() or None, course=body.course)
    db.add(m)
    db.commit()
    db.refresh(m)
    return _material_dict(m)


@router.get("/classrooms/{code}/materials")
def list_materials(code: str, db: Session = Depends(get_session)) -> list[dict]:
    room = db.scalar(select(Classroom).where(Classroom.code == code.upper()))
    if not room:
        raise HTTPException(404, "Classroom not found")
    rows = db.scalars(select(Material).where(Material.classroom_id == room.id).order_by(Material.created_at.desc())).all()
    return [_material_dict(m) for m in rows]


@router.delete("/classrooms/{code}/materials/{material_id}")
def delete_material(code: str, material_id: int, instructor_id: int, db: Session = Depends(get_session)) -> dict:
    room = db.scalar(select(Classroom).where(Classroom.code == code.upper()))
    if not room:
        raise HTTPException(404, "Classroom not found")
    if room.instructor_id != instructor_id:
        raise HTTPException(403, "Only this classroom's instructor can remove study material")
    m = db.scalar(select(Material).where(Material.id == material_id, Material.classroom_id == room.id))
    if not m:
        raise HTTPException(404, "Material not found")
    db.delete(m)
    db.commit()
    return {"ok": True}
