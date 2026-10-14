"""Circuit validation: catch invalid or inconsistent circuits before they reach a backend."""
from __future__ import annotations

import math

from .gates import GATES

MAX_QUBITS = 10
MAX_OPERATIONS = 500


class CircuitError(ValueError):
    """Raised for circuits that cannot be simulated. ``issues`` lists every problem found."""

    def __init__(self, issues: list[str]):
        self.issues = issues
        super().__init__("; ".join(issues))


def validate_circuit(num_qubits: int, operations: list[dict]) -> list[str]:
    """Return a list of human-readable warnings; raise CircuitError on hard errors."""
    errors: list[str] = []
    warnings: list[str] = []

    if not 1 <= num_qubits <= MAX_QUBITS:
        errors.append(f"num_qubits must be between 1 and {MAX_QUBITS} (got {num_qubits}).")
    if len(operations) > MAX_OPERATIONS:
        errors.append(f"Too many operations ({len(operations)}); the limit is {MAX_OPERATIONS}.")

    measured: set[int] = set()
    for i, op in enumerate(operations):
        name = str(op.get("name", "")).lower()
        qubits = list(op.get("qubits", []))
        params = list(op.get("params", []))
        where = f"Operation #{i + 1} ({name or '?'})"
        spec = GATES.get(name)
        if spec is None:
            errors.append(f"{where}: unknown gate '{name}'.")
            continue
        if name != "barrier" and len(qubits) != spec.num_qubits:
            errors.append(f"{where}: needs {spec.num_qubits} qubit(s) but got {len(qubits)}.")
            continue
        if any((not isinstance(q, int)) or q < 0 or q >= num_qubits for q in qubits):
            errors.append(f"{where}: qubit index out of range 0..{num_qubits - 1}.")
            continue
        if len(set(qubits)) != len(qubits):
            errors.append(f"{where}: control and target must be different qubits.")
            continue
        if len(params) != spec.num_params:
            errors.append(f"{where}: expects {spec.num_params} parameter(s) but got {len(params)}.")
            continue
        if any(not math.isfinite(float(p)) for p in params):
            errors.append(f"{where}: parameters must be finite numbers.")
            continue
        if name == "measure":
            if qubits[0] in measured:
                warnings.append(f"{where}: qubit {qubits[0]} is measured more than once; the last result is kept.")
            measured.add(qubits[0])
        elif name != "barrier" and measured.intersection(qubits):
            warnings.append(
                f"{where}: acts on a qubit that was already measured, so the simulation runs shot-by-shot (mid-circuit measurement)."
            )

    if errors:
        raise CircuitError(errors)
    return warnings
