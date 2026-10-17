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
        {"id": "walk", "title": "Quantum Walk", "icon": "wave", "description": "A quantum particle spreads by interference into two glowing horns — then decoherence melts it into a classical bell curve."},
        {"id": "interference", "title": "Mach–Zehnder Interferometer", "icon": "wave",
         "description": "One photon takes two paths at once — turn the phase to make detectors flip, or watch a which-path detector kill the interference."},
        {"id": "chsh", "title": "Bell Test (CHSH)", "icon": "entangle",
         "description": "Entangled pairs beat every classical strategy: push the CHSH number past 2 to 2√2 and win the quantum game."},
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


# --- v2.3 expanded curriculum (see extra.py) ---
from .extra import KNOWLEDGE_EXTRA, LESSONS_EXTRA, TOPICS_EXTRA  # noqa: E402

COURSE["topics"].update(TOPICS_EXTRA)
LESSONS = LESSONS + LESSONS_EXTRA
KNOWLEDGE.update(KNOWLEDGE_EXTRA)
