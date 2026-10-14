"""Pydantic request/response models shared by the API routers."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class Operation(BaseModel):
    """One gate application. ``qubits`` is ``[controls..., target]`` for controlled gates."""

    name: str = Field(..., examples=["h"])
    qubits: list[int] = Field(..., examples=[[0]])
    params: list[float] = Field(default_factory=list)
    col: int | None = Field(None, description="Column in the visual builder (optional, for UI sync)")


class Circuit(BaseModel):
    num_qubits: int = Field(2, ge=1, le=10)
    operations: list[Operation] = Field(default_factory=list)


class SimulateRequest(Circuit):
    shots: int = Field(1024, ge=1, le=8192)
    backend: Literal["auto", "q3d", "qiskit"] = "auto"
    include_steps: bool = True
    seed: int | None = None
    user_id: int | None = None


class QasmImportRequest(BaseModel):
    qasm: str


class TutorRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    circuit: Circuit | None = None
    result: dict[str, Any] | None = None
    history: list[dict[str, str]] = Field(default_factory=list)
    lesson_id: str | None = None
    challenge_id: str | None = None
    user_id: int | None = None


class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    role: Literal["student", "instructor"] = "student"
    classroom_code: str | None = None


class LessonComplete(BaseModel):
    user_id: int
    lesson_id: str


class QuizSubmit(BaseModel):
    user_id: int | None = None
    answers: list[int]


class ChallengeCheck(Circuit):
    user_id: int | None = None


class SaveCircuit(Circuit):
    user_id: int
    title: str = Field("Untitled circuit", max_length=120)


class ClassroomCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    instructor_id: int


class AssignmentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=160)
    item_type: Literal["lesson", "challenge"]
    item_id: str
    due: str | None = None
