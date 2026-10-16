"""Discrete-time quantum walk on a line (coin ⊗ position), with optional decoherence.

A walker carries a two-level "coin". Each step applies a coin gate (e.g. Hadamard) and then shifts the
walker left for |0⟩ and right for |1⟩. Interference makes the quantum walk spread *ballistically*
(σ ∝ t) with two bright peaks, while a classical random walk spreads diffusively (σ ∝ √t) into a bell
curve. Dephasing the position after every step (probability p) turns the quantum walk classical.
"""
from __future__ import annotations

import math

import numpy as np

COINS = {
    "hadamard": np.array([[1, 1], [1, -1]], dtype=complex) / math.sqrt(2),
    "balanced": np.array([[1, 1j], [1j, 1]], dtype=complex) / math.sqrt(2),
}
STARTS = {
    "down": np.array([1, 0], dtype=complex),
    "up": np.array([0, 1], dtype=complex),
    "symmetric": np.array([1, 1j], dtype=complex) / math.sqrt(2),
}


def _coin(name: str, theta: float) -> np.ndarray:
    if name == "rotation":
        c, s = math.cos(theta), math.sin(theta)
        return np.array([[c, s], [s, -c]], dtype=complex)
    if name not in COINS:
        raise ValueError(f"unknown coin '{name}'")
    return COINS[name]


def _std(p: np.ndarray, x: np.ndarray) -> float:
    m = float((p * x).sum())
    return math.sqrt(max(0.0, float((p * x * x).sum()) - m * m))


def quantum_walk(steps: int = 50, coin: str = "hadamard", start: str = "symmetric", theta: float = 0.785,
                 decoherence: float = 0.0) -> dict:
    T = max(4, min(80, int(steps)))
    p_dec = max(0.0, min(1.0, float(decoherence)))
    if start not in STARTS:
        raise ValueError(f"unknown start '{start}'")
    C = _coin(coin, float(theta))
    N = 2 * T + 1
    xs = np.arange(-T, T + 1)
    rows, q_std, c_std = [], [], []

    if p_dec == 0:
        psi = np.zeros((N, 2), dtype=complex)
        psi[T] = STARTS[start]
        rows.append(np.abs(psi[:, 0]) ** 2 + np.abs(psi[:, 1]) ** 2)
        for _ in range(T):
            psi = psi @ C.T
            new = np.zeros_like(psi)
            new[:-1, 0] = psi[1:, 0]   # coin 0 → move left
            new[1:, 1] = psi[:-1, 1]   # coin 1 → move right
            psi = new
            rows.append((np.abs(psi) ** 2).sum(axis=1))
    else:
        # density matrix over (position, coin); dephase position with probability p each step
        D = 2 * N
        U = np.zeros((D, D), dtype=complex)
        for x in range(N):
            for cin in range(2):
                for cout in range(2):
                    amp = C[cout, cin]
                    nx = x - 1 if cout == 0 else x + 1
                    if 0 <= nx < N:
                        U[2 * nx + cout, 2 * x + cin] += amp
        v = np.zeros(D, dtype=complex)
        v[2 * T: 2 * T + 2] = STARTS[start]
        rho = np.outer(v, v.conj())
        block = np.kron(np.eye(N), np.ones((2, 2)))
        rows.append(np.real(np.diag(rho)).reshape(N, 2).sum(axis=1))
        for _ in range(T):
            rho = U @ rho @ U.conj().T
            rho = (1 - p_dec) * rho + p_dec * rho * block
            rows.append(np.real(np.diag(rho)).reshape(N, 2).sum(axis=1))

    for t, r in enumerate(rows):
        q_std.append(round(_std(r, xs), 4))
        c_std.append(round(math.sqrt(t), 4))
    final = rows[-1]
    classical = np.array([math.comb(T, (T + x) // 2) / 2 ** T if (T + x) % 2 == 0 else 0.0 for x in xs])
    return {
        "steps": T, "coin": coin, "start": start, "decoherence": p_dec, "positions": xs.tolist(),
        "rows": [np.round(r, 5).tolist() for r in rows], "final": np.round(final, 6).tolist(),
        "classical": np.round(classical, 6).tolist(), "std_quantum": q_std, "std_classical": c_std,
        "spread_ratio": round(q_std[-1] / max(1e-9, c_std[-1]), 3), "total_probability": round(float(final.sum()), 6),
        "peak_positions": [int(xs[i]) for i in np.argsort(final)[-2:][::-1]],
    }
