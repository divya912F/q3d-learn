"""Gate library: matrices + metadata used by the simulator, validator, exporters and UI.

Conventions (identical to Qiskit):
  * qubit 0 is the least-significant bit of a basis-state index;
  * bitstrings are printed q[n-1] ... q[0];
  * for multi-qubit gates the ``qubits`` list is ``[controls..., target]`` and the
    matrix is written in the basis |q_list[0] q_list[1] ...> (first listed = most significant).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

import numpy as np

SQ2 = 1 / np.sqrt(2)
I2 = np.eye(2, dtype=complex)


def _rx(t: float) -> np.ndarray:
    c, s = np.cos(t / 2), np.sin(t / 2)
    return np.array([[c, -1j * s], [-1j * s, c]], dtype=complex)


def _ry(t: float) -> np.ndarray:
    c, s = np.cos(t / 2), np.sin(t / 2)
    return np.array([[c, -s], [s, c]], dtype=complex)


def _rz(t: float) -> np.ndarray:
    return np.array([[np.exp(-1j * t / 2), 0], [0, np.exp(1j * t / 2)]], dtype=complex)


def _p(lam: float) -> np.ndarray:
    return np.array([[1, 0], [0, np.exp(1j * lam)]], dtype=complex)


def controlled(u: np.ndarray, n_controls: int = 1) -> np.ndarray:
    """Return the controlled version of ``u`` with ``n_controls`` controls listed first."""
    dim_t = u.shape[0]
    dim = dim_t * (2 ** n_controls)
    m = np.eye(dim, dtype=complex)
    m[dim - dim_t:, dim - dim_t:] = u
    return m


X = np.array([[0, 1], [1, 0]], dtype=complex)
Y = np.array([[0, -1j], [1j, 0]], dtype=complex)
Z = np.array([[1, 0], [0, -1]], dtype=complex)
H = SQ2 * np.array([[1, 1], [1, -1]], dtype=complex)
S = np.array([[1, 0], [0, 1j]], dtype=complex)
T = np.array([[1, 0], [0, np.exp(1j * np.pi / 4)]], dtype=complex)
SX = 0.5 * np.array([[1 + 1j, 1 - 1j], [1 - 1j, 1 + 1j]], dtype=complex)
SWAP = np.array([[1, 0, 0, 0], [0, 0, 1, 0], [0, 1, 0, 0], [0, 0, 0, 1]], dtype=complex)


@dataclass(frozen=True)
class GateSpec:
    name: str
    label: str
    num_qubits: int
    num_params: int
    category: str
    description: str
    matrix: Callable[..., np.ndarray] | None = None
    # Bloch-sphere rotation (axis, angle) for single-qubit gates, used for animations.
    bloch_axis: tuple[float, float, float] | None = None
    bloch_angle: Callable[..., float] | None = None
    param_names: tuple[str, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "label": self.label,
            "num_qubits": self.num_qubits,
            "num_params": self.num_params,
            "param_names": list(self.param_names),
            "category": self.category,
            "description": self.description,
            "bloch_axis": list(self.bloch_axis) if self.bloch_axis else None,
        }


def _const(m: np.ndarray) -> Callable[..., np.ndarray]:
    return lambda *_: m


_D = 1 / np.sqrt(2)

GATES: dict[str, GateSpec] = {
    g.name: g
    for g in [
        GateSpec("id", "I", 1, 0, "basic", "Identity: does nothing (useful as a spacer).", _const(I2), (0, 0, 1), lambda: 0.0),
        GateSpec("h", "H", 1, 0, "superposition", "Hadamard: maps |0⟩→|+⟩ and |1⟩→|-⟩, creating an equal superposition. A π rotation about the (X+Z)/√2 axis.", _const(H), (_D, 0, _D), lambda: np.pi),
        GateSpec("x", "X", 1, 0, "pauli", "Pauli-X (quantum NOT): flips |0⟩↔|1⟩. A π rotation about the X axis.", _const(X), (1, 0, 0), lambda: np.pi),
        GateSpec("y", "Y", 1, 0, "pauli", "Pauli-Y: bit flip and phase flip together. A π rotation about the Y axis.", _const(Y), (0, 1, 0), lambda: np.pi),
        GateSpec("z", "Z", 1, 0, "pauli", "Pauli-Z (phase flip): |1⟩→-|1⟩. A π rotation about the Z axis.", _const(Z), (0, 0, 1), lambda: np.pi),
        GateSpec("s", "S", 1, 0, "phase", "S gate (√Z): adds a phase of i to |1⟩. A π/2 rotation about Z.", _const(S), (0, 0, 1), lambda: np.pi / 2),
        GateSpec("sdg", "S†", 1, 0, "phase", "S-dagger: inverse of S, a −π/2 rotation about Z.", _const(S.conj().T), (0, 0, 1), lambda: -np.pi / 2),
        GateSpec("t", "T", 1, 0, "phase", "T gate (π/8 gate): adds a phase of e^{iπ/4} to |1⟩. A π/4 rotation about Z.", _const(T), (0, 0, 1), lambda: np.pi / 4),
        GateSpec("tdg", "T†", 1, 0, "phase", "T-dagger: inverse of T, a −π/4 rotation about Z.", _const(T.conj().T), (0, 0, 1), lambda: -np.pi / 4),
        GateSpec("sx", "√X", 1, 0, "pauli", "Square root of X: a π/2 rotation about the X axis.", _const(SX), (1, 0, 0), lambda: np.pi / 2),
        GateSpec("rx", "RX", 1, 1, "rotation", "Rotation by θ about the X axis of the Bloch sphere.", _rx, (1, 0, 0), lambda t: t, ("theta",)),
        GateSpec("ry", "RY", 1, 1, "rotation", "Rotation by θ about the Y axis of the Bloch sphere.", _ry, (0, 1, 0), lambda t: t, ("theta",)),
        GateSpec("rz", "RZ", 1, 1, "rotation", "Rotation by φ about the Z axis of the Bloch sphere.", _rz, (0, 0, 1), lambda t: t, ("phi",)),
        GateSpec("p", "P", 1, 1, "phase", "Phase gate: adds phase e^{iλ} to |1⟩ (equivalent to RZ up to a global phase).", _p, (0, 0, 1), lambda t: t, ("lambda",)),
        GateSpec("cx", "CNOT", 2, 0, "entangle", "Controlled-NOT: flips the target qubit when the control is |1⟩. The workhorse of entanglement.", _const(controlled(X))),
        GateSpec("cy", "CY", 2, 0, "entangle", "Controlled-Y: applies Y to the target when the control is |1⟩.", _const(controlled(Y))),
        GateSpec("cz", "CZ", 2, 0, "entangle", "Controlled-Z: adds a −1 phase to |11⟩. Symmetric in its two qubits.", _const(controlled(Z))),
        GateSpec("ch", "CH", 2, 0, "entangle", "Controlled-Hadamard: applies H to the target when the control is |1⟩.", _const(controlled(H))),
        GateSpec("cp", "CP", 2, 1, "entangle", "Controlled-phase: adds phase e^{iλ} to |11⟩. Used in the Quantum Fourier Transform.", lambda lam: controlled(_p(lam)), None, None, ("lambda",)),
        GateSpec("swap", "SWAP", 2, 0, "multi", "SWAP: exchanges the states of two qubits.", _const(SWAP)),
        GateSpec("ccx", "CCX", 3, 0, "multi", "Toffoli (CCNOT): flips the target only when both controls are |1⟩.", _const(controlled(X, 2))),
        GateSpec("measure", "M", 1, 0, "measure", "Measurement: collapses the qubit to |0⟩ or |1⟩ with Born-rule probabilities and stores the bit."),
        GateSpec("barrier", "║", 1, 0, "meta", "Barrier: a visual separator; has no effect on the state."),
    ]
}

def gate_matrix(name: str, params: list[float] | None = None) -> np.ndarray:
    spec = GATES[name]
    if spec.matrix is None:
        raise ValueError(f"Gate '{name}' has no unitary matrix")
    return spec.matrix(*(params or []))


def bloch_rotation(name: str, params: list[float] | None = None) -> tuple[list[float], float] | None:
    spec = GATES.get(name)
    if not spec or spec.bloch_axis is None or spec.bloch_angle is None:
        return None
    return list(spec.bloch_axis), float(spec.bloch_angle(*(params or [])))


def catalog() -> list[dict]:
    return [g.to_dict() for g in GATES.values()]
