"""Optional Qiskit / Qiskit Aer integration.

If ``qiskit`` and ``qiskit-aer`` are installed, measurement counts are produced by
``AerSimulator`` (the same simulator used across IBM's Qiskit ecosystem). Everything
else (statevector, Bloch vectors, step-by-step snapshots) still comes from the Q3D
engine, so the 3D views and the AI tutor always see the exact quantum state.
"""
from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any

log = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def qiskit_status() -> dict[str, Any]:
    try:
        import qiskit  # noqa: F401
        from qiskit_aer import AerSimulator  # noqa: F401

        import qiskit_aer

        return {"available": True, "qiskit": qiskit.__version__, "qiskit_aer": qiskit_aer.__version__}
    except Exception as exc:  # pragma: no cover - depends on the environment
        return {"available": False, "reason": f"{type(exc).__name__}: {exc}"}


def build_qiskit_circuit(num_qubits: int, ops: list[dict]):
    from qiskit import QuantumCircuit

    qc = QuantumCircuit(num_qubits, num_qubits)
    for op in ops:
        name, qs, ps = op["name"], op["qubits"], op["params"]
        if name == "measure":
            qc.measure(qs[0], qs[0])
        elif name == "barrier":
            qc.barrier()
        elif name == "id":
            qc.id(qs[0])
        else:
            getattr(qc, name)(*ps, *qs)
    if not any(op["name"] == "measure" for op in ops):
        qc.measure(range(num_qubits), range(num_qubits))
    return qc


def run_with_aer(num_qubits: int, ops: list[dict], shots: int, seed: int | None, measured: list[int]) -> dict[str, int]:
    """Return counts keyed like the Q3D engine (only measured qubits, q[n-1]..q[0])."""
    from qiskit import transpile
    from qiskit_aer import AerSimulator

    qc = build_qiskit_circuit(num_qubits, ops)
    backend = AerSimulator(seed_simulator=seed) if seed is not None else AerSimulator()
    job = backend.run(transpile(qc, backend), shots=shots)
    raw = job.result().get_counts()

    counts: dict[str, int] = {}
    order = sorted(measured, reverse=True)
    for key, c in raw.items():
        key = key.replace(" ", "")
        # Qiskit keys are c[n-1]..c[0]; character for clbit q is key[n-1-q].
        k = "".join(key[num_qubits - 1 - q] for q in order)
        counts[k] = counts.get(k, 0) + int(c)
    return dict(sorted(counts.items()))
