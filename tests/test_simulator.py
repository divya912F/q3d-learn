import math

import numpy as np
import pytest

from app.courses.quantum.challenges import CHALLENGES, check_challenge
from app.quantum.algorithms import ALGORITHMS
from app.quantum.qasm import from_qasm, to_qasm
from app.quantum.simulator import run_circuit
from app.quantum.validation import CircuitError


def op(name, *qubits, params=None):
    return {"name": name, "qubits": list(qubits), "params": params or []}


def test_hadamard_gives_plus_state():
    r = run_circuit(1, [op("h", 0)], shots=2000, seed=1)
    assert r["analysis"]["name"] == "|+⟩"
    assert r["probabilities"] == pytest.approx({"0": 0.5, "1": 0.5})
    b = r["bloch"][0]
    assert (b["x"], b["y"], b["z"]) == pytest.approx((1, 0, 0), abs=1e-6)
    assert abs(r["counts"]["0"] - 1000) < 120


def test_qubit_ordering_matches_qiskit():
    # X on q0 of a 2-qubit register → bitstring "01" (q1 q0)
    r = run_circuit(2, [op("x", 0)], shots=10, seed=0)
    assert r["counts"] == {"01": 10}


def test_bell_state_is_entangled_with_mixed_reduced_states():
    r = run_circuit(2, [op("h", 0), op("cx", 0, 1)], shots=500, seed=2)
    assert r["analysis"]["name"] == "Bell |Φ+⟩"
    assert r["entanglement"]["entangled"]
    assert set(r["counts"]) == {"00", "11"}
    for b in r["bloch"]:
        assert b["r"] == pytest.approx(0, abs=1e-9)
        assert b["entropy"] == pytest.approx(1)


def test_steps_record_every_operation():
    r = run_circuit(2, [op("h", 0), op("cx", 0, 1)], include_steps=True)
    assert len(r["steps"]) == 3
    assert r["steps"][1]["rotation"]["angle"] == pytest.approx(math.pi)


def test_mid_circuit_measurement_uses_trajectories():
    r = run_circuit(1, [op("h", 0), op("measure", 0), op("h", 0), op("measure", 0)], shots=2000, seed=3)
    assert r["mode"] == "trajectory"
    assert abs(r["counts"]["0"] - 1000) < 150


def test_rotation_gate():
    r = run_circuit(1, [op("ry", 0, params=[math.pi / 3])])
    assert r["bloch"][0]["z"] == pytest.approx(0.5)


@pytest.mark.parametrize("bad", [
    [op("cx", 0, 0)],
    [op("h", 5)],
    [op("nope", 0)],
    [op("rx", 0)],
])
def test_invalid_circuits_are_rejected(bad):
    with pytest.raises(CircuitError):
        run_circuit(2, bad)


EXPECTED = {
    "bell": {"00", "11"}, "ghz": {"000", "111"}, "superdense": {"11"}, "deutsch-jozsa": {"11"},
    "bernstein-vazirani": {"101"}, "grover": {"11"},
}


@pytest.mark.parametrize("alg", ALGORITHMS, ids=lambda a: a["id"])
def test_algorithms_give_expected_results(alg):
    r = run_circuit(alg["num_qubits"], alg["operations"], shots=1000, seed=4)
    if alg["id"] in EXPECTED:
        assert set(r["counts"]) == EXPECTED[alg["id"]]
    if alg["id"] == "teleportation":
        assert r["bloch"][2]["z"] == pytest.approx(0.5)
    if alg["id"] == "qft":
        assert all(p == pytest.approx(1 / 8) for p in r["probabilities"].values())


def test_qasm_round_trip():
    ops = [op("h", 0), op("cp", 0, 1, params=[math.pi / 4]), op("measure", 1)]
    text = to_qasm(2, ops)
    assert "cp(pi/4) q[0], q[1];" in text
    back = from_qasm(text)
    assert back["num_qubits"] == 2
    assert [o["name"] for o in back["operations"]] == ["h", "cp", "measure"]
    assert back["operations"][1]["params"][0] == pytest.approx(math.pi / 4)


def test_qasm_rejects_code_injection():
    with pytest.raises(CircuitError):
        from_qasm('qreg q[1]; rx(__import__("os")) q[0];')


def test_challenge_checker():
    coin = next(c for c in CHALLENGES if c["id"] == "coin")
    assert check_challenge(coin, 1, [op("h", 0)])["solved"]
    assert not check_challenge(coin, 1, [op("x", 0)])["solved"]
    plus_i = next(c for c in CHALLENGES if c["id"] == "plus-i")
    assert check_challenge(plus_i, 1, [op("h", 0), op("t", 0), op("t", 0)])["solved"]
    res = check_challenge(plus_i, 1, [op("h", 0), op("s", 0)])
    assert not res["solved"]  # S is not in the allowed gate set


def test_every_challenge_target_is_normalised():
    for c in CHALLENGES:
        v = np.array([complex(a, b) for a, b in c["target"]])
        assert np.linalg.norm(v) == pytest.approx(1)
