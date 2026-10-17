"""Two quantum-optics labs computed exactly:

* ``mach_zehnder`` — a single photon in a Mach–Zehnder interferometer (two beam splitters, a phase
  shifter on the upper arm, optional which-path detector).
* ``chsh_test`` — the CHSH Bell test on the singlet-like state |Φ+⟩ versus a local-hidden-variable model.
"""
from __future__ import annotations

import math

import numpy as np


def _bs(reflectivity: float) -> np.ndarray:
    """Symmetric beam splitter: amplitude √T to stay, i√R to switch arms."""
    r = math.sqrt(reflectivity)
    t = math.sqrt(1 - reflectivity)
    return np.array([[t, 1j * r], [1j * r, t]], dtype=complex)


def mach_zehnder(phase: float = 0.0, reflectivity: float = 0.5, which_path: bool = False,
                 photons: int = 200, seed: int = 1) -> dict:
    phase = float(phase) % (2 * math.pi)
    R = min(0.95, max(0.05, float(reflectivity)))
    photons = int(min(2000, max(10, photons)))
    rng = np.random.default_rng(int(seed))
    bs1, bs2 = _bs(0.5), _bs(R)
    ps = np.diag([np.exp(1j * phase), 1])  # arm 0 = upper arm with the phase shifter

    def detect(phi: float) -> tuple[float, float]:
        psi = _bs(0.5) @ np.array([1, 0], dtype=complex)
        if which_path:  # the detector collapses the photon onto one arm: probabilities add, no interference
            p = 0.0
            for arm in (0, 1):
                v = np.zeros(2, dtype=complex)
                v[arm] = psi[arm] * (np.exp(1j * phi) if arm == 0 else 1)
                p += abs((bs2 @ v)[0]) ** 2
            return p, 1 - p
        out = bs2 @ np.diag([np.exp(1j * phi), 1]) @ psi
        return float(abs(out[0]) ** 2), float(abs(out[1]) ** 2)

    s1 = bs1 @ np.array([1, 0], dtype=complex)
    s2 = ps @ s1
    p_d1, p_d2 = detect(phase)
    hits = rng.random(photons) < p_d1
    curve = []
    for k in range(73):
        phi = 2 * math.pi * k / 72
        a, b = detect(phi)
        curve.append({"phase": round(phi, 4), "d1": round(a, 5), "d2": round(b, 5)})
    amp = lambda v: [{"re": round(float(z.real), 4), "im": round(float(z.imag), 4), "p": round(float(abs(z) ** 2), 4)} for z in v]
    visibility = (max(c["d1"] for c in curve) - min(c["d1"] for c in curve)) / max(1e-9, max(c["d1"] for c in curve) + min(c["d1"] for c in curve))
    return {
        "phase": round(phase, 4), "reflectivity": R, "which_path": bool(which_path), "photons": photons,
        "stages": {"after_bs1": amp(s1), "after_phase": amp(s2)},
        "p_d1": round(p_d1, 5), "p_d2": round(p_d2, 5),
        "outcomes": [1 if h else 2 for h in hits.tolist()],
        "counts": {"d1": int(hits.sum()), "d2": int(photons - hits.sum())},
        "curve": curve, "visibility": round(float(visibility), 4),
    }


def _E_quantum(a: float, b: float, visibility: float) -> float:
    """Correlation ⟨A·B⟩ for |Φ+⟩ measured along angles a, b in the x–z plane."""
    return visibility * math.cos(a - b)


def _E_lhv(a: float, b: float) -> float:
    """Best-known simple local model (shared random angle λ, outcome = sign cos(λ − angle)): triangle wave."""
    d = abs((a - b + math.pi) % (2 * math.pi) - math.pi)
    return 1 - 2 * d / math.pi


def chsh_test(a0: float = 0.0, a1: float = 90.0, b0: float = 45.0, b1: float = -45.0,
              rounds: int = 2000, visibility: float = 1.0, seed: int = 7) -> dict:
    """Angles in degrees. Returns exact S for quantum and the local model, plus sampled rounds."""
    rounds = int(min(20000, max(100, rounds)))
    V = min(1.0, max(0.0, float(visibility)))
    rng = np.random.default_rng(int(seed))
    A = [math.radians(float(a0)), math.radians(float(a1))]
    B = [math.radians(float(b0)), math.radians(float(b1))]
    sign = {(0, 0): 1, (0, 1): 1, (1, 0): 1, (1, 1): -1}
    Eq = {k: _E_quantum(A[k[0]], B[k[1]], V) for k in sign}
    El = {k: _E_lhv(A[k[0]], B[k[1]]) for k in sign}
    S_q = sum(sign[k] * Eq[k] for k in sign)
    S_l = sum(sign[k] * El[k] for k in sign)
    # sample rounds: random settings, P(same outcome) = (1 + E) / 2
    x = rng.integers(0, 2, rounds)
    y = rng.integers(0, 2, rounds)
    same = rng.random(rounds) < np.array([(1 + Eq[(i, j)]) / 2 for i, j in zip(x, y)])
    a_out = rng.choice([1, -1], rounds)
    b_out = np.where(same, a_out, -a_out)
    est = {}
    for k in sign:
        m = (x == k[0]) & (y == k[1])
        est[k] = float((a_out[m] * b_out[m]).mean()) if m.any() else 0.0
    S_est = sum(sign[k] * est[k] for k in sign)
    # CHSH game: win when a XOR b == x AND y  (outcome +1 ↦ bit 0)
    abit, bbit = (a_out < 0).astype(int), (b_out < 0).astype(int)
    wins = ((abit ^ bbit) == (x & y)).mean()
    sample = [{"x": int(x[i]), "y": int(y[i]), "a": int(a_out[i]), "b": int(b_out[i])} for i in range(min(60, rounds))]
    curve = [{"delta": d, "quantum": round(_E_quantum(0, math.radians(d), V), 4), "local": round(_E_lhv(0, math.radians(d)), 4)}
             for d in range(0, 181, 5)]
    key = lambda k: f"a{k[0]}b{k[1]}"
    return {
        "angles": {"a0": a0, "a1": a1, "b0": b0, "b1": b1}, "visibility": V, "rounds": rounds,
        "E_quantum": {key(k): round(v, 4) for k, v in Eq.items()},
        "E_local": {key(k): round(v, 4) for k, v in El.items()},
        "E_sampled": {key(k): round(v, 4) for k, v in est.items()},
        "S_quantum": round(S_q, 4), "S_local": round(S_l, 4), "S_sampled": round(S_est, 4),
        "tsirelson": round(2 * math.sqrt(2), 4), "classical_bound": 2,
        "violates": bool(abs(S_est) > 2), "win_rate": round(float(wins), 4),
        "win_rate_theory": round(0.5 + abs(S_q) / 8, 4),
        "sample": sample, "curve": curve,
    }
