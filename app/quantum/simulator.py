"""Q3D statevector simulator.

A small, dependency-free (NumPy only) exact simulator built for teaching:
  * exact statevector + probabilities after every gate (powers step-through animations),
  * per-qubit reduced density matrices -> Bloch vectors, purity and entanglement entropy,
  * shot sampling, plus shot-by-shot trajectories when a qubit is reused after measurement.

Qiskit Aer can be used for the shot sampling instead (see ``qiskit_runner.py``); the
state-level data always comes from this engine so the 3D views are driven by real
quantum-state data.
"""
from __future__ import annotations

import time
from collections import Counter
from typing import Any

import numpy as np

from .analysis import describe_state
from .gates import GATES, bloch_rotation, gate_matrix
from .validation import validate_circuit

EPS = 1e-10
MAX_STEP_QUBITS = 6  # step-by-step snapshots are recorded up to this size


class StatevectorSimulator:
    def __init__(self, num_qubits: int):
        self.n = num_qubits
        self.state = np.zeros((2,) * num_qubits, dtype=complex)
        self.state[(0,) * num_qubits] = 1.0

    # ------------------------------------------------------------------ gates
    def apply_unitary(self, u: np.ndarray, qubits: list[int]) -> None:
        k = len(qubits)
        axes = [self.n - 1 - q for q in qubits]
        ut = u.reshape((2,) * (2 * k))
        out = np.tensordot(ut, self.state, axes=(list(range(k, 2 * k)), axes))
        self.state = np.moveaxis(out, list(range(k)), axes)

    def apply(self, name: str, qubits: list[int], params: list[float] | None = None) -> None:
        if name in ("barrier", "measure"):
            return
        self.apply_unitary(gate_matrix(name, params), qubits)

    def measure(self, qubit: int, rng: np.random.Generator) -> int:
        ax = self.n - 1 - qubit
        p1 = float(np.sum(np.abs(np.take(self.state, 1, axis=ax)) ** 2))
        outcome = int(rng.random() < p1)
        keep = np.take(self.state, outcome, axis=ax)
        norm = np.sqrt(p1 if outcome else 1 - p1)
        new = np.zeros_like(self.state)
        idx = [slice(None)] * self.n
        idx[ax] = outcome
        new[tuple(idx)] = keep / (norm if norm > EPS else 1.0)
        self.state = new
        return outcome

    # ------------------------------------------------------------- read-outs
    @property
    def vector(self) -> np.ndarray:
        return self.state.reshape(-1)

    def probabilities(self) -> np.ndarray:
        return np.abs(self.vector) ** 2

    def reduced_density_matrix(self, qubit: int) -> np.ndarray:
        m = np.moveaxis(self.state, self.n - 1 - qubit, 0).reshape(2, -1)
        return m @ m.conj().T

    def bloch_vectors(self) -> list[dict[str, float]]:
        out = []
        for q in range(self.n):
            rho = self.reduced_density_matrix(q)
            x = 2 * rho[0, 1].real
            y = -2 * rho[0, 1].imag
            z = (rho[0, 0] - rho[1, 1]).real
            r = float(np.sqrt(x * x + y * y + z * z))
            purity = float(np.real(np.trace(rho @ rho)))
            evals = np.clip(np.linalg.eigvalsh(rho).real, 0, 1)
            entropy = float(-sum(e * np.log2(e) for e in evals if e > EPS))
            theta = float(np.arccos(np.clip(z / r, -1, 1))) if r > EPS else 0.0
            phi = float(np.arctan2(y, x)) if np.hypot(x, y) > 1e-9 else 0.0
            out.append(
                {
                    "qubit": q,
                    "x": _r(x), "y": _r(y), "z": _r(z), "r": _r(r),
                    "theta": _r(theta), "phi": _r(phi),
                    "purity": _r(purity), "entropy": _r(entropy),
                    "p1": _r(rho[1, 1].real),
                }
            )
        return out


def _r(v: float, nd: int = 6) -> float:
    v = float(np.real(v))
    v = round(v, nd)
    return 0.0 if v == 0 else v  # avoid -0.0


def bitstring(index: int, n: int) -> str:
    return format(index, f"0{n}b")


def _prob_dict(probs: np.ndarray, n: int) -> dict[str, float]:
    return {bitstring(i, n): _r(p) for i, p in enumerate(probs) if p > EPS}


def _statevector_rows(vec: np.ndarray, n: int) -> list[dict[str, Any]]:
    rows = []
    for i, a in enumerate(vec):
        p = abs(a) ** 2
        rows.append(
            {
                "index": i,
                "bitstring": bitstring(i, n),
                "re": _r(a.real),
                "im": _r(a.imag),
                "prob": _r(p),
                "phase": _r(float(np.angle(a))) if p > EPS else 0.0,
            }
        )
    return rows


def circuit_depth(num_qubits: int, operations: list[dict]) -> int:
    layer = [0] * num_qubits
    for op in operations:
        if op["name"] == "barrier":
            continue
        qs = op["qubits"]
        d = max(layer[q] for q in qs) + 1
        for q in qs:
            layer[q] = d
    return max(layer) if layer else 0


def _needs_trajectories(operations: list[dict]) -> bool:
    measured: set[int] = set()
    for op in operations:
        if op["name"] == "measure":
            measured.add(op["qubits"][0])
        elif op["name"] != "barrier" and measured.intersection(op["qubits"]):
            return True
    return False


def _counts_key(bits: dict[int, int], measured: list[int]) -> str:
    return "".join(str(bits.get(q, 0)) for q in sorted(measured, reverse=True))


def normalize_ops(operations: list[Any]) -> list[dict]:
    ops = []
    for op in operations:
        d = op if isinstance(op, dict) else op.model_dump()
        ops.append(
            {
                "name": str(d["name"]).lower(),
                "qubits": [int(q) for q in d.get("qubits", [])],
                "params": [float(p) for p in d.get("params", []) or []],
                "col": d.get("col"),
            }
        )
    return ops


def run_circuit(
    num_qubits: int,
    operations: list[Any],
    shots: int = 1024,
    include_steps: bool = True,
    seed: int | None = None,
) -> dict[str, Any]:
    """Simulate a circuit and return everything the UI and the AI tutor need."""
    t0 = time.perf_counter()
    ops = normalize_ops(operations)
    warnings = validate_circuit(num_qubits, ops)
    rng = np.random.default_rng(seed)
    n = num_qubits

    measured = sorted({op["qubits"][0] for op in ops if op["name"] == "measure"})
    implicit_measure = not measured
    if implicit_measure:
        measured = list(range(n))

    trajectory = _needs_trajectories(ops)
    sim = StatevectorSimulator(n)
    steps: list[dict[str, Any]] = []
    record = include_steps and n <= MAX_STEP_QUBITS

    if record:
        steps.append(_snapshot(sim, -1, None))

    # Unitary part (all gates, ignoring measurements) gives the pre-measurement state.
    first_reuse = None
    if trajectory:
        seen: set[int] = set()
        for i, op in enumerate(ops):
            if op["name"] == "measure":
                seen.add(op["qubits"][0])
            elif op["name"] != "barrier" and seen.intersection(op["qubits"]):
                first_reuse = i
                break

    for i, op in enumerate(ops):
        if trajectory and first_reuse is not None and i >= first_reuse:
            break
        sim.apply(op["name"], op["qubits"], op["params"])
        if record:
            steps.append(_snapshot(sim, i, op))

    counts: Counter[str] = Counter()
    if not trajectory:
        probs = sim.probabilities()
        probs = probs / probs.sum()
        samples = rng.choice(len(probs), size=shots, p=probs)
        for idx, c in zip(*np.unique(samples, return_counts=True)):
            bits = {q: (int(idx) >> q) & 1 for q in range(n)}
            counts[_counts_key(bits, measured)] += int(c)
        final = sim
        mode = "statevector"
    else:
        mode = "trajectory"
        # Simulate the prefix up to the first measurement once, then branch per shot.
        prefix_end = next(i for i, op in enumerate(ops) if op["name"] == "measure")
        base = StatevectorSimulator(n)
        for op in ops[:prefix_end]:
            base.apply(op["name"], op["qubits"], op["params"])
        for _ in range(shots):
            s = StatevectorSimulator(n)
            s.state = base.state.copy()
            bits: dict[int, int] = {}
            for op in ops[prefix_end:]:
                if op["name"] == "measure":
                    bits[op["qubits"][0]] = s.measure(op["qubits"][0], rng)
                else:
                    s.apply(op["name"], op["qubits"], op["params"])
            counts[_counts_key(bits, measured)] += 1
        # The state views show the deterministic state just before the mid-circuit measurement.
        final = sim

    vec = final.vector
    probabilities = _prob_dict(final.probabilities(), n)
    bloch = final.bloch_vectors()
    entangled_qubits = [b["qubit"] for b in bloch if b["entropy"] > 1e-6]

    result = {
        "engine": "q3d-statevector",
        "backend_used": "q3d",
        "mode": mode,
        "num_qubits": n,
        "shots": shots,
        "counts": dict(sorted(counts.items())),
        "measured_qubits": measured,
        "implicit_measurement": implicit_measure,
        "probabilities": probabilities,
        "statevector": _statevector_rows(vec, n) if n <= 10 else [],
        "bloch": bloch,
        "entanglement": {
            "entangled": len(entangled_qubits) > 0,
            "qubits": entangled_qubits,
        },
        "analysis": describe_state(vec, n),
        "depth": circuit_depth(n, ops),
        "gate_count": sum(1 for op in ops if op["name"] not in ("barrier",)),
        "steps": steps,
        "warnings": warnings
        + (["No measurement gates found — all qubits were measured at the end."] if implicit_measure and ops else []),
        "execution_time_ms": 0.0,
    }
    result["execution_time_ms"] = round((time.perf_counter() - t0) * 1000, 2)
    return result


def _snapshot(sim: StatevectorSimulator, index: int, op: dict | None) -> dict[str, Any]:
    vec = sim.vector
    snap: dict[str, Any] = {
        "index": index,
        "op": op,
        "probabilities": _prob_dict(np.abs(vec) ** 2, sim.n),
        "amplitudes": [[_r(a.real, 5), _r(a.imag, 5)] for a in vec],
        "bloch": sim.bloch_vectors(),
    }
    if op and len(op["qubits"]) == 1:
        rot = bloch_rotation(op["name"], op["params"])
        if rot:
            snap["rotation"] = {"axis": rot[0], "angle": rot[1], "qubit": op["qubits"][0]}
    return snap


def single_qubit_state(operations: list[Any]) -> dict[str, Any]:
    """Helper for the 3D Lab: apply single-qubit gates to |0> and return the path."""
    ops = normalize_ops(operations)
    for op in ops:
        if GATES.get(op["name"]) is None or GATES[op["name"]].num_qubits != 1:
            raise ValueError(f"'{op['name']}' is not a single-qubit gate")
    res = run_circuit(1, [o for o in ops if o["name"] != "measure"], shots=1, include_steps=True)
    return {"steps": res["steps"], "bloch": res["bloch"][0], "statevector": res["statevector"]}
