"""Quantum Computing course (the original Q-3D Learn course)."""
from __future__ import annotations

from . import challenges as _ch
from .knowledge import CONCEPTS as KNOWLEDGE  # noqa: F401  (re-exported for the registry)
from .lessons import LESSONS as _LESSONS
from .lessons import TOPICS

COURSE = {
    "id": "quantum",
    "title": "Quantum Computing",
    "short": "Quantum",
    "tagline": "Qubits, gates and algorithms — visualised on a 3D Bloch sphere.",
    "description": "From a single qubit to Grover's search: build circuits, simulate them exactly (or with Qiskit Aer) "
                   "and see every state in 3D.",
    "color": "#3b5bdb",
    "icon": "sphere",
    "level": "Beginner → Advanced",
    "labs": [
        {"id": "bloch", "title": "3D Bloch Lab", "icon": "sphere", "description": "Apply gates to one qubit and watch them rotate the Bloch sphere."},
        {"id": "builder", "title": "Circuit Builder", "icon": "circuit", "description": "Drag-and-drop circuits, real simulation, Q-sphere, OpenQASM and Qiskit code."},
        {"id": "algorithms", "title": "Algorithm Library", "icon": "flask", "description": "Bell, GHZ, teleportation, Deutsch–Jozsa, Grover, QFT — step by step."},
    ],
    "topics": TOPICS,
}

# Lessons keep their original ids; "try" blocks pointing at "lab"/"builder" map to the bloch/builder labs.
LESSONS = _LESSONS

CHALLENGES = [{**c, "kind": "circuit"} for c in _ch.CHALLENGES]


def public_challenge(c: dict) -> dict:
    return _ch.public_challenge(c)


def check_challenge(ch: dict, payload: dict) -> dict:
    return _ch.check_challenge(ch, int(payload.get("num_qubits") or ch["num_qubits"]), payload.get("operations") or [])
