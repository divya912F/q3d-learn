"""Course registry: one place that knows every course, its lessons, labs and challenges."""
from __future__ import annotations

from types import ModuleType

from .ai import content as ai
from .ds import content as ds
from .ml import content as ml
from .quantum import content as quantum

_MODULES: dict[str, ModuleType] = {m.COURSE["id"]: m for m in (quantum, ml, ds, ai)}
ORDER = ["quantum", "ml", "ds", "ai"]


def course_ids() -> list[str]:
    return list(ORDER)


def module(course_id: str) -> ModuleType | None:
    return _MODULES.get(course_id)


def courses() -> list[dict]:
    out = []
    for cid in ORDER:
        m = _MODULES[cid]
        out.append({**m.COURSE, "lessons": len(m.LESSONS), "challenges": len(m.CHALLENGES),
                    "minutes": sum(l["minutes"] for l in m.LESSONS)})
    return out


def course(course_id: str) -> dict | None:
    m = module(course_id)
    return None if m is None else {**m.COURSE, "lessons": len(m.LESSONS), "challenges": len(m.CHALLENGES),
                                   "minutes": sum(l["minutes"] for l in m.LESSONS)}


def lessons(course_id: str) -> list[dict]:
    m = module(course_id)
    return sorted(m.LESSONS, key=lambda l: l["order"]) if m else []


def lesson(course_id: str, lesson_id: str) -> dict | None:
    return next((l for l in lessons(course_id) if l["id"] == lesson_id), None)


def find_lesson(lesson_id: str) -> tuple[str, dict] | tuple[None, None]:
    for cid in ORDER:
        l = lesson(cid, lesson_id)
        if l:
            return cid, l
    return None, None


def topics(course_id: str) -> dict[str, str]:
    m = module(course_id)
    return dict(m.COURSE["topics"]) if m else {}


def challenges(course_id: str) -> list[dict]:
    m = module(course_id)
    return list(m.CHALLENGES) if m else []


def challenge(course_id: str, challenge_id: str) -> dict | None:
    return next((c for c in challenges(course_id) if c["id"] == challenge_id), None)


def find_challenge(challenge_id: str) -> tuple[str, dict] | tuple[None, None]:
    for cid in ORDER:
        c = challenge(cid, challenge_id)
        if c:
            return cid, c
    return None, None


HIDDEN_KEYS = {"target", "compute", "answer"}


def public_challenge(course_id: str, ch: dict) -> dict:
    return {**{k: v for k, v in ch.items() if k not in HIDDEN_KEYS}, "course": course_id}


def check_challenge(course_id: str, ch: dict, payload: dict) -> dict:
    return module(course_id).check_challenge(ch, payload)


def knowledge(course_id: str | None) -> dict[str, dict]:
    if course_id and course_id in _MODULES:
        return _MODULES[course_id].KNOWLEDGE
    merged: dict[str, dict] = {}
    for cid in ORDER:
        merged.update({f"{cid}:{k}": v for k, v in _MODULES[cid].KNOWLEDGE.items()})
    return merged


def public_lesson(course_id: str, l: dict, include_body: bool = True) -> dict:
    out = {k: v for k, v in l.items() if k not in ("quiz", "blocks")}
    out["course"] = course_id
    out["topic_label"] = topics(course_id).get(l["topic"], l["topic"])
    out["quiz_length"] = len(l["quiz"])
    if include_body:
        out["blocks"] = l["blocks"]
        out["quiz"] = [{"q": q["q"], "options": q["options"]} for q in l["quiz"]]
    return out


def grade_quiz(l: dict, answers: list[int]) -> dict:
    results, correct = [], 0
    for i, q in enumerate(l["quiz"]):
        given = answers[i] if i < len(answers) else None
        ok = given == q["answer"]
        correct += ok
        results.append({"correct": ok, "answer": q["answer"], "explain": q["explain"]})
    total = len(l["quiz"])
    return {"score": correct, "total": total, "percent": round(100 * correct / total), "results": results}
