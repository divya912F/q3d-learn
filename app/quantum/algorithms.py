"""A library of famous quantum algorithms, ready to load into the circuit builder."""
from __future__ import annotations

from math import pi


def _layers(*layers: list[tuple]) -> list[dict]:
    """Each layer is a list of (name, qubits, params?) tuples that share one builder column."""
    ops = []
    for col, layer in enumerate(layers):
        for item in layer:
            name, qubits, *rest = item
            ops.append({"name": name, "qubits": list(qubits), "params": list(rest[0]) if rest else [], "col": col})
    return ops


def _measure(qs, col_layer=True):
    return [("measure", [q]) for q in qs]


ALGORITHMS: list[dict] = [
    {
        "id": "bell",
        "title": "Bell State",
        "category": "Entanglement",
        "level": "Beginner",
        "summary": "Two qubits become perfectly correlated: you will only ever measure 00 or 11.",
        "num_qubits": 2,
        "operations": _layers([("h", [0])], [("cx", [0, 1])], _measure([0, 1])),
        "steps": [
            {"title": "Superposition", "cols": [0], "text": "H puts q0 into (|0⟩+|1⟩)/√2. Watch q0's Bloch arrow swing from the north pole to the equator."},
            {"title": "Entangle", "cols": [1], "text": "CNOT copies q0's value into q1 *in superposition*, giving (|00⟩+|11⟩)/√2. Both Bloch arrows shrink to the centre — neither qubit has a state of its own any more."},
            {"title": "Measure", "cols": [2], "text": "You get 00 or 11 with 50% probability each, never 01 or 10."},
        ],
        "expected": "≈50% |00⟩ and ≈50% |11⟩",
    },
    {
        "id": "ghz",
        "title": "GHZ State",
        "category": "Entanglement",
        "level": "Beginner",
        "summary": "Three-qubit entanglement: all qubits agree — 000 or 111.",
        "num_qubits": 3,
        "operations": _layers([("h", [0])], [("cx", [0, 1])], [("cx", [1, 2])], _measure([0, 1, 2])),
        "steps": [
            {"title": "Superposition", "cols": [0], "text": "H on q0 creates the superposition that will be spread to the other qubits."},
            {"title": "Chain of CNOTs", "cols": [1, 2], "text": "Each CNOT extends the entanglement by one qubit: (|000⟩+|111⟩)/√2."},
            {"title": "Measure", "cols": [3], "text": "Only 000 and 111 appear. Measuring any single qubit instantly fixes the other two."},
        ],
        "expected": "≈50% |000⟩ and ≈50% |111⟩",
    },
    {
        "id": "superdense",
        "title": "Superdense Coding",
        "category": "Communication",
        "level": "Intermediate",
        "summary": "Send two classical bits by transmitting a single qubit of a shared Bell pair.",
        "num_qubits": 2,
        "operations": _layers(
            [("h", [0])], [("cx", [0, 1])], [("barrier", [])], [("x", [0])], [("z", [0])], [("barrier", [])],
            [("cx", [0, 1])], [("h", [0])], _measure([0, 1]),
        ),
        "steps": [
            {"title": "Share a Bell pair", "cols": [0, 1], "text": "Alice holds q0 and Bob holds q1 of the state (|00⟩+|11⟩)/√2."},
            {"title": "Alice encodes '11'", "cols": [3, 4], "text": "Applying X then Z to her qubit alone turns the pair into a different Bell state, encoding two bits."},
            {"title": "Bob decodes", "cols": [6, 7, 8], "text": "CNOT + H undo the entanglement, and the measurement reads out 11 with certainty."},
        ],
        "expected": "100% |11⟩",
    },
    {
        "id": "teleportation",
        "title": "Quantum Teleportation",
        "category": "Communication",
        "level": "Intermediate",
        "summary": "Move an unknown qubit state from q0 to q2 using entanglement (deferred-measurement form).",
        "num_qubits": 3,
        "operations": _layers(
            [("ry", [0], [pi / 3])], [("barrier", [])], [("h", [1])], [("cx", [1, 2])], [("barrier", [])],
            [("cx", [0, 1])], [("h", [0])], [("barrier", [])], [("cx", [1, 2])], [("cz", [0, 2])], _measure([2]),
        ),
        "steps": [
            {"title": "The message", "cols": [0], "text": "RY(π/3) prepares q0 in a state with a 25% chance of |1⟩. This is the state we teleport."},
            {"title": "Entangled channel", "cols": [2, 3], "text": "q1 and q2 share a Bell pair: q1 stays with Alice, q2 goes to Bob."},
            {"title": "Bell measurement", "cols": [5, 6], "text": "Alice entangles her message with q1 and rotates into the Bell basis."},
            {"title": "Corrections", "cols": [8, 9], "text": "Controlled X and Z replace the classical phone call. Compare q2's Bloch sphere with q0's original arrow — they match!"},
            {"title": "Verify", "cols": [10], "text": "Measuring q2 gives 1 about 25% of the time, exactly like the original message qubit."},
        ],
        "expected": "q2: ≈75% |0⟩, ≈25% |1⟩",
    },
    {
        "id": "deutsch-jozsa",
        "title": "Deutsch–Jozsa",
        "category": "Oracle algorithms",
        "level": "Intermediate",
        "summary": "Decide if a hidden function is constant or balanced with a single query.",
        "num_qubits": 3,
        "operations": _layers(
            [("x", [2])], [("h", [0]), ("h", [1]), ("h", [2])], [("barrier", [])], [("cx", [0, 2])], [("cx", [1, 2])],
            [("barrier", [])], [("h", [0]), ("h", [1])], _measure([0, 1]),
        ),
        "steps": [
            {"title": "Prepare", "cols": [0, 1], "text": "Inputs go into |+⟩ and the ancilla q2 into |−⟩, so the oracle will kick its answer back as a phase."},
            {"title": "Oracle", "cols": [3, 4], "text": "This oracle computes f(x) = x0 ⊕ x1, a balanced function (half the inputs give 1)."},
            {"title": "Interfere & measure", "cols": [6, 7], "text": "H gates make the phases interfere. All-zeros would mean constant; here we get 11, so f is balanced — after only one query."},
        ],
        "expected": "100% |11⟩ on q1q0 → balanced",
    },
    {
        "id": "bernstein-vazirani",
        "title": "Bernstein–Vazirani",
        "category": "Oracle algorithms",
        "level": "Intermediate",
        "summary": "Recover a hidden bitstring (101) in a single oracle call.",
        "num_qubits": 4,
        "operations": _layers(
            [("x", [3])], [("h", [0]), ("h", [1]), ("h", [2]), ("h", [3])], [("barrier", [])],
            [("cx", [0, 3])], [("cx", [2, 3])], [("barrier", [])], [("h", [0]), ("h", [1]), ("h", [2])], _measure([0, 1, 2]),
        ),
        "steps": [
            {"title": "Prepare", "cols": [0, 1], "text": "Three input qubits in |+⟩, ancilla q3 in |−⟩."},
            {"title": "Hidden string s = 101", "cols": [3, 4], "text": "The oracle computes s·x mod 2 using a CNOT from every qubit where s has a 1."},
            {"title": "Read the secret", "cols": [6, 7], "text": "After the final H layer the inputs hold s directly: we measure 101 every time."},
        ],
        "expected": "100% |101⟩ on q2q1q0",
    },
    {
        "id": "grover",
        "title": "Grover's Search",
        "category": "Search",
        "level": "Advanced",
        "summary": "Find the marked item |11⟩ among four possibilities with one Grover iteration.",
        "num_qubits": 2,
        "operations": _layers(
            [("h", [0]), ("h", [1])], [("barrier", [])], [("cz", [0, 1])], [("barrier", [])],
            [("h", [0]), ("h", [1])], [("x", [0]), ("x", [1])], [("cz", [0, 1])], [("x", [0]), ("x", [1])], [("h", [0]), ("h", [1])],
            _measure([0, 1]),
        ),
        "steps": [
            {"title": "Uniform superposition", "cols": [0], "text": "Every item starts with probability 1/4."},
            {"title": "Oracle", "cols": [2], "text": "CZ flips the sign (phase) of the marked item |11⟩. Probabilities don't change yet — look at the phase colours in the state-vector view!"},
            {"title": "Diffusion", "cols": [4, 5, 6, 7, 8], "text": "Inversion about the mean turns the phase flip into amplitude: |11⟩ grows, the rest cancel out."},
            {"title": "Measure", "cols": [9], "text": "For 4 items a single iteration finds the answer with 100% probability."},
        ],
        "expected": "100% |11⟩",
    },
    {
        "id": "qft",
        "title": "Quantum Fourier Transform",
        "category": "Building blocks",
        "level": "Advanced",
        "summary": "Transform |101⟩ into the Fourier basis — equal probabilities, but rotating phases.",
        "num_qubits": 3,
        "operations": _layers(
            [("x", [0]), ("x", [2])], [("barrier", [])], [("h", [2])], [("cp", [1, 2], [pi / 2])], [("cp", [0, 2], [pi / 4])],
            [("h", [1])], [("cp", [0, 1], [pi / 2])], [("h", [0])], [("swap", [0, 2])],
        ),
        "steps": [
            {"title": "Input |101⟩", "cols": [0], "text": "X gates load the number 5 into the register."},
            {"title": "Hadamards + controlled phases", "cols": [2, 3, 4, 5, 6, 7], "text": "Each qubit picks up a phase proportional to the input value — the quantum version of the discrete Fourier transform."},
            {"title": "Reverse order", "cols": [8], "text": "A SWAP restores the conventional bit order. All 8 outcomes are equally likely; the information lives entirely in the phases."},
        ],
        "expected": "Uniform probabilities (12.5% each) with phases that step by 5·2π/8",
    },
]


def list_algorithms() -> list[dict]:
    return [{k: a[k] for k in ("id", "title", "category", "level", "summary", "num_qubits", "expected")} for a in ALGORITHMS]


def get_algorithm(alg_id: str) -> dict | None:
    return next((a for a in ALGORITHMS if a["id"] == alg_id), None)
