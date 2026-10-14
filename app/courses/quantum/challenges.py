"""Hands-on challenges. A challenge is solved when the learner's circuit prepares the
target state (fidelity ≥ 0.99, global phase ignored) within the stated constraints."""
from __future__ import annotations

import numpy as np

from ...quantum.analysis import fidelity
from ...quantum.simulator import StatevectorSimulator, normalize_ops
from ...quantum.validation import validate_circuit

S = 1 / np.sqrt(2)


def _vec(n: int, amps: dict[str, complex]) -> list[list[float]]:
    v = np.zeros(2 ** n, dtype=complex)
    for bits, a in amps.items():
        v[int(bits, 2)] = a
    v = v / np.linalg.norm(v)
    return [[float(a.real), float(a.imag)] for a in v]


CHALLENGES: list[dict] = [
    {
        "id": "flip", "title": "Flip the Bit", "difficulty": "Easy", "points": 50, "topic": "gates",
        "num_qubits": 1, "description": "Turn |0⟩ into |1⟩.",
        "hint": "The quantum NOT gate is a half-turn about the X axis.",
        "target": _vec(1, {"1": 1}), "target_label": "|1⟩",
        "allowed_gates": None, "max_gates": None,
    },
    {
        "id": "coin", "title": "Fair Quantum Coin", "difficulty": "Easy", "points": 50, "topic": "superposition",
        "num_qubits": 1, "description": "Prepare |+⟩ = (|0⟩+|1⟩)/√2 so both outcomes are equally likely.",
        "hint": "One gate is enough.",
        "target": _vec(1, {"0": 1, "1": 1}), "target_label": "|+⟩",
        "allowed_gates": None, "max_gates": 1,
    },
    {
        "id": "minus", "title": "Negative Vibes", "difficulty": "Easy", "points": 75, "topic": "phase",
        "num_qubits": 1, "description": "Prepare |−⟩ = (|0⟩−|1⟩)/√2.",
        "hint": "Start from |1⟩ instead of |0⟩ — or add a phase flip after H.",
        "target": _vec(1, {"0": 1, "1": -1}), "target_label": "|−⟩",
        "allowed_gates": None, "max_gates": None,
    },
    {
        "id": "plus-i", "title": "Into the Y Axis", "difficulty": "Medium", "points": 100, "topic": "phase",
        "num_qubits": 1, "description": "Prepare |+i⟩ = (|0⟩+i|1⟩)/√2 using only H and T gates.",
        "hint": "T is an eighth-turn about Z. How many eighths make a quarter?",
        "target": _vec(1, {"0": 1, "1": 1j}), "target_label": "|+i⟩",
        "allowed_gates": ["h", "t"], "max_gates": None,
    },
    {
        "id": "bell", "title": "Entangle Two Qubits", "difficulty": "Medium", "points": 100, "topic": "entanglement",
        "num_qubits": 2, "description": "Prepare the Bell state |Φ+⟩ = (|00⟩+|11⟩)/√2.",
        "hint": "Superposition first, then a controlled gate.",
        "target": _vec(2, {"00": 1, "11": 1}), "target_label": "(|00⟩+|11⟩)/√2",
        "allowed_gates": None, "max_gates": None,
    },
    {
        "id": "singlet", "title": "The Singlet", "difficulty": "Hard", "points": 150, "topic": "entanglement",
        "num_qubits": 2, "description": "Prepare |Ψ−⟩ = (|01⟩−|10⟩)/√2 — the qubits always disagree.",
        "hint": "Build |Φ+⟩ first, then think about which single-qubit gates turn 00/11 into 01/10 and add a minus sign.",
        "target": _vec(2, {"01": 1, "10": -1}), "target_label": "(|01⟩−|10⟩)/√2",
        "allowed_gates": None, "max_gates": None,
    },
    {
        "id": "ghz", "title": "Three-Way Entanglement", "difficulty": "Medium", "points": 125, "topic": "entanglement",
        "num_qubits": 3, "description": "Prepare the GHZ state (|000⟩+|111⟩)/√2.",
        "hint": "Spread one superposition with a chain of CNOTs.",
        "target": _vec(3, {"000": 1, "111": 1}), "target_label": "(|000⟩+|111⟩)/√2",
        "allowed_gates": None, "max_gates": None,
    },
    {
        "id": "x-from-hz", "title": "Gate Alchemy", "difficulty": "Hard", "points": 150, "topic": "gates",
        "num_qubits": 1, "description": "Prepare |1⟩ without using X, Y or RX — only H and Z allowed.",
        "hint": "H·Z·H = X.",
        "target": _vec(1, {"1": 1}), "target_label": "|1⟩",
        "allowed_gates": ["h", "z"], "max_gates": None,
    },
    {
        "id": "uniform3", "title": "All at Once", "difficulty": "Easy", "points": 75, "topic": "superposition",
        "num_qubits": 3, "description": "Prepare an equal superposition of all 8 three-bit strings.",
        "hint": "Every qubit needs its own superposition.",
        "target": _vec(3, {format(i, "03b"): 1 for i in range(8)}), "target_label": "|+++⟩",
        "allowed_gates": None, "max_gates": 3,
    },
]


def public_challenge(ch: dict) -> dict:
    return {k: v for k, v in ch.items() if k != "target"}


def get_challenge(cid: str) -> dict | None:
    return next((c for c in CHALLENGES if c["id"] == cid), None)


def check_challenge(ch: dict, num_qubits: int, operations: list) -> dict:
    ops = normalize_ops(operations)
    feedback: list[str] = []
    if num_qubits != ch["num_qubits"]:
        return {"solved": False, "fidelity": 0.0, "feedback": [f"This challenge uses exactly {ch['num_qubits']} qubit(s)."]}
    validate_circuit(num_qubits, ops)
    gates = [op for op in ops if op["name"] not in ("barrier", "measure")]
    if any(op["name"] == "measure" for op in ops):
        feedback.append("Measurements were ignored — the challenge checks the quantum state before measurement.")
    allowed = ch.get("allowed_gates")
    bad = sorted({op["name"] for op in gates if allowed and op["name"] not in allowed})
    if bad:
        feedback.append(f"Gate(s) not allowed here: {', '.join(g.upper() for g in bad)}. Allowed: {', '.join(g.upper() for g in allowed)}.")
    if ch.get("max_gates") and len(gates) > ch["max_gates"]:
        feedback.append(f"Use at most {ch['max_gates']} gate(s) (you used {len(gates)}).")

    sim = StatevectorSimulator(num_qubits)
    for op in gates:
        sim.apply(op["name"], op["qubits"], op["params"])
    target = np.array([complex(re, im) for re, im in ch["target"]])
    f = fidelity(target, sim.vector)
    state_ok = f >= 0.99
    if not state_ok:
        probs_t = np.abs(target) ** 2
        probs_s = np.abs(sim.vector) ** 2
        if np.allclose(probs_t, probs_s, atol=1e-3):
            feedback.append("The probabilities are right, but the relative phase is not — check signs and i's.")
        else:
            feedback.append(f"Not there yet: your state overlaps the target with fidelity {f:.2f} (need ≥ 0.99).")
    solved = state_ok and not bad and not (ch.get("max_gates") and len(gates) > ch["max_gates"])
    if solved:
        feedback.insert(0, f"Solved! You prepared {ch['target_label']} with fidelity {f:.3f}.")
    return {"solved": bool(solved), "fidelity": round(f, 4), "feedback": feedback, "points": ch["points"] if solved else 0}
