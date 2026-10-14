"""Recognise well-known states so the UI and the AI tutor can name what the learner built."""
from __future__ import annotations

import numpy as np

SQ2 = 1 / np.sqrt(2)


def fidelity(a: np.ndarray, b: np.ndarray) -> float:
    """|<a|b>|^2 for normalised pure states (insensitive to global phase)."""
    return float(abs(np.vdot(a, b)) ** 2)


def _basis(n: int, idx: int) -> np.ndarray:
    v = np.zeros(2 ** n, dtype=complex)
    v[idx] = 1
    return v


def named_states(n: int) -> list[tuple[str, str, np.ndarray]]:
    """(name, description, vector) candidates for an n-qubit register."""
    out: list[tuple[str, str, np.ndarray]] = []
    if n == 1:
        out += [
            ("|0⟩", "the ground state — the north pole of the Bloch sphere", _basis(1, 0)),
            ("|1⟩", "the excited state — the south pole of the Bloch sphere", _basis(1, 1)),
            ("|+⟩", "an equal superposition (|0⟩+|1⟩)/√2 on the +X axis", np.array([SQ2, SQ2], dtype=complex)),
            ("|−⟩", "an equal superposition (|0⟩−|1⟩)/√2 on the −X axis", np.array([SQ2, -SQ2], dtype=complex)),
            ("|+i⟩", "an equal superposition (|0⟩+i|1⟩)/√2 on the +Y axis", np.array([SQ2, 1j * SQ2], dtype=complex)),
            ("|−i⟩", "an equal superposition (|0⟩−i|1⟩)/√2 on the −Y axis", np.array([SQ2, -1j * SQ2], dtype=complex)),
        ]
    if n == 2:
        b = {k: _basis(2, i) for i, k in enumerate(["00", "01", "10", "11"])}
        out += [
            ("Bell |Φ+⟩", "the Bell state (|00⟩+|11⟩)/√2 — maximally entangled, outcomes always agree", SQ2 * (b["00"] + b["11"])),
            ("Bell |Φ−⟩", "the Bell state (|00⟩−|11⟩)/√2 — maximally entangled, outcomes always agree", SQ2 * (b["00"] - b["11"])),
            ("Bell |Ψ+⟩", "the Bell state (|01⟩+|10⟩)/√2 — maximally entangled, outcomes always disagree", SQ2 * (b["01"] + b["10"])),
            ("Bell |Ψ−⟩", "the singlet (|01⟩−|10⟩)/√2 — maximally entangled, outcomes always disagree", SQ2 * (b["01"] - b["10"])),
        ]
    if n >= 3:
        out.append(
            (
                f"GHZ state ({n} qubits)",
                f"(|{'0' * n}⟩+|{'1' * n}⟩)/√2 — all {n} qubits are entangled and always measured equal",
                SQ2 * (_basis(n, 0) + _basis(n, 2 ** n - 1)),
            )
        )
        w = np.zeros(2 ** n, dtype=complex)
        for q in range(n):
            w[1 << q] = 1 / np.sqrt(n)
        out.append((f"W state ({n} qubits)", "exactly one qubit is |1⟩, shared equally across all qubits", w))
    if n >= 2:
        out.append(
            (
                "Uniform superposition",
                f"all {2 ** n} basis states with equal probability — what H on every qubit produces",
                np.full(2 ** n, 1 / np.sqrt(2 ** n), dtype=complex),
            )
        )
    return out


def ket_expression(vec: np.ndarray, n: int, max_terms: int = 8) -> str:
    terms = []
    for i, a in enumerate(vec):
        if abs(a) ** 2 < 1e-9:
            continue
        terms.append((i, a))
    s = ""
    for k, (i, a) in enumerate(terms[:max_terms]):
        re, im = a.real, a.imag
        if abs(im) < 1e-3:
            sign, coef = ("−" if re < 0 else "+"), f"{abs(re):.3f}"
        elif abs(re) < 1e-3:
            sign, coef = ("−" if im < 0 else "+"), f"{abs(im):.3f}i"
        else:
            sign, coef = "+", f"({re:.3f}{im:+.3f}i)"
        ket = f"{coef}|{format(i, f'0{n}b')}⟩"
        if k == 0:
            s = ket if sign == "+" else f"−{ket}"
        else:
            s += f" {sign} {ket}"
    if len(terms) > max_terms:
        s += f" + … ({len(terms) - max_terms} more terms)"
    return s


def is_product_state(vec: np.ndarray, n: int) -> bool:
    """A pure state is a product state iff every single-qubit reduced state is pure."""
    psi = vec.reshape((2,) * n)
    for q in range(n):
        m = np.moveaxis(psi, n - 1 - q, 0).reshape(2, -1)
        rho = m @ m.conj().T
        if abs(np.real(np.trace(rho @ rho)) - 1) > 1e-6:
            return False
    return True


def describe_state(vec: np.ndarray, n: int) -> dict:
    vec = np.asarray(vec, dtype=complex)
    nonzero = int(np.sum(np.abs(vec) ** 2 > 1e-9))
    match = None
    for name, desc, target in named_states(n):
        if fidelity(target, vec) > 0.9999:
            match = (name, desc)
            break

    if nonzero == 1:
        idx = int(np.argmax(np.abs(vec)))
        kind = "basis"
        name = match[0] if match else f"|{format(idx, f'0{n}b')}⟩"
        desc = match[1] if match else "a computational basis state — measuring gives this bitstring every time"
    else:
        product = is_product_state(vec, n) if n > 1 else True
        kind = "superposition" if product else "entangled"
        name = match[0] if match else ("Entangled state" if not product else "Superposition")
        if match:
            desc = match[1]
        elif product:
            desc = f"a superposition of {nonzero} basis states that can be written qubit-by-qubit (no entanglement)"
        else:
            desc = f"an entangled superposition of {nonzero} basis states — the qubits cannot be described independently"

    return {
        "name": name,
        "kind": kind,
        "description": desc,
        "ket": ket_expression(vec, n),
        "support": nonzero,
    }
