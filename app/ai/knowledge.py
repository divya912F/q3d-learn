"""Curated, validated explanations used by the offline tutor and to ground LLM answers."""
from __future__ import annotations

CONCEPTS: dict[str, dict] = {
    "qubit": {
        "keys": ["qubit", "quantum bit"],
        "text": "A **qubit** is the quantum version of a bit. Its state is α|0⟩ + β|1⟩ where α and β are complex *amplitudes* with |α|² + |β|² = 1. Measuring gives 0 with probability |α|² and 1 with probability |β|².",
        "lesson": "qubits",
    },
    "superposition": {
        "keys": ["superposition", "both 0 and 1", "0 and 1 at the same time"],
        "text": "**Superposition** means the state has non-zero amplitude on more than one basis state, e.g. |+⟩ = (|0⟩+|1⟩)/√2. It is not 'secretly 0 or 1': the amplitudes are physically present and can interfere. Measurement picks one outcome at random according to the Born rule.",
        "lesson": "qubits",
    },
    "bloch": {
        "keys": ["bloch", "sphere", "theta", "phi", "θ", "φ"],
        "text": "The **Bloch sphere** maps every single-qubit state cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩ to a point: θ is the angle from the north pole (|0⟩) and φ the angle around the equator. Gates are rotations of the sphere. Arrows *inside* the sphere (length < 1) are mixed states — that is what an entangled qubit looks like on its own.",
        "lesson": "bloch",
    },
    "hadamard": {
        "keys": ["hadamard", " h gate", "h-gate", "the h ", "apply h", "h gate"],
        "text": "The **Hadamard (H)** gate maps |0⟩ → |+⟩ = (|0⟩+|1⟩)/√2 and |1⟩ → |−⟩ = (|0⟩−|1⟩)/√2. On the Bloch sphere it is a 180° rotation about the axis halfway between X and Z. It is its own inverse: H·H = I.",
        "lesson": "hadamard-phase",
    },
    "pauli-x": {
        "keys": ["x gate", "not gate", "pauli-x", "pauli x", "bit flip"],
        "text": "The **X gate** is the quantum NOT: |0⟩ ↔ |1⟩. It is a 180° rotation about the X axis of the Bloch sphere.",
        "lesson": "pauli",
    },
    "pauli-z": {
        "keys": ["z gate", "pauli-z", "pauli z", "phase flip"],
        "text": "The **Z gate** leaves |0⟩ unchanged and maps |1⟩ → −|1⟩ (a *phase flip*). It does nothing visible to |0⟩ or |1⟩ alone, but turns |+⟩ into |−⟩. It is a 180° rotation about the Z axis.",
        "lesson": "pauli",
    },
    "pauli-y": {
        "keys": ["y gate", "pauli-y", "pauli y"],
        "text": "The **Y gate** combines a bit flip and a phase flip: |0⟩ → i|1⟩ and |1⟩ → −i|0⟩. It is a 180° rotation about the Y axis.",
        "lesson": "pauli",
    },
    "phase": {
        "keys": ["phase", "s gate", "t gate", "relative phase", "global phase"],
        "text": "A **relative phase** is the angle between amplitudes, e.g. |0⟩ + e^{iφ}|1⟩. It does not change Z-basis probabilities but changes how states interfere. **S** adds a phase of i (90°) and **T** adds e^{iπ/4} (45°) to |1⟩. A *global* phase (multiplying the whole state) is unobservable.",
        "lesson": "hadamard-phase",
    },
    "measurement": {
        "keys": ["measure", "measurement", "collapse", "born rule", "shots", "counts", "histogram"],
        "text": "**Measurement** returns one bitstring x with probability |⟨x|ψ⟩|² (the Born rule) and collapses the state to it. Because each run is random, simulators repeat the circuit many times (**shots**) and show a histogram of **counts**; with N shots the counts fluctuate by roughly √N around N·P(x).",
        "lesson": "measurement",
    },
    "entanglement": {
        "keys": ["entangle", "entanglement", "bell", "correlat", "spooky", "epr"],
        "text": "Two qubits are **entangled** when their joint state cannot be written as a product of individual states — e.g. the Bell state (|00⟩+|11⟩)/√2. Measurements are perfectly correlated, yet each qubit alone looks completely random (its Bloch vector shrinks to the centre). Entanglement cannot transmit information faster than light.",
        "lesson": "entanglement",
    },
    "cnot": {
        "keys": ["cnot", "cx", "controlled not", "controlled-not"],
        "text": "The **CNOT (CX)** gate flips the *target* qubit when the *control* is |1⟩. If the control is in superposition, CNOT spreads that superposition to the target and creates entanglement: CNOT·(H⊗I)|00⟩ = (|00⟩+|11⟩)/√2.",
        "lesson": "entanglement",
    },
    "interference": {
        "keys": ["interfer", "cancel", "constructive", "destructive"],
        "text": "**Interference** happens because amplitudes add like waves: paths with the same sign reinforce, opposite signs cancel. H·H|0⟩ = |0⟩ because the two paths to |1⟩ cancel. Quantum algorithms are designed so wrong answers interfere destructively and right answers constructively.",
        "lesson": "interference",
    },
    "deutsch": {
        "keys": ["deutsch", "jozsa", "constant", "balanced", "oracle", "kickback"],
        "text": "**Deutsch–Jozsa** decides whether f is constant or balanced with one oracle query. The ancilla in |−⟩ turns the oracle into a phase (*phase kickback*), and the final H layer makes |0…0⟩ appear only for a constant function.",
        "lesson": "interference",
    },
    "grover": {
        "keys": ["grover", "search", "amplitude amplification", "diffusion"],
        "text": "**Grover's algorithm** finds a marked item among N in about (π/4)√N iterations. Each iteration = oracle (flip the marked amplitude's sign) + diffusion (reflect about the mean), which steadily amplifies the marked state. That is a quadratic speed-up over classical search.",
        "lesson": "grover",
    },
    "teleportation": {
        "keys": ["teleport"],
        "text": "**Teleportation** moves an unknown qubit state using one shared Bell pair plus two classical bits. Alice does a Bell measurement on her message and her half of the pair; Bob applies X/Z corrections depending on the bits. The original is destroyed, so no cloning happens.",
        "lesson": None,
    },
    "qft": {
        "keys": ["fourier", "qft"],
        "text": "The **Quantum Fourier Transform** maps |x⟩ to a uniform superposition whose phases rotate at a rate set by x. It is built from H gates, controlled-phase gates and a final bit reversal, and is the heart of Shor's algorithm and phase estimation.",
        "lesson": None,
    },
    "swap": {
        "keys": ["swap"],
        "text": "**SWAP** exchanges two qubits' states. It equals three CNOTs alternating direction.",
        "lesson": None,
    },
    "toffoli": {
        "keys": ["toffoli", "ccx", "ccnot"],
        "text": "The **Toffoli (CCX)** gate flips the target only when both controls are |1⟩ — a reversible AND gate, and universal for classical reversible logic.",
        "lesson": None,
    },
    "rotation": {
        "keys": ["rx", "ry", "rz", "rotation"],
        "text": "**RX(θ), RY(θ), RZ(θ)** rotate the Bloch sphere by θ about the X, Y or Z axis. RY(θ) on |0⟩ gives cos(θ/2)|0⟩ + sin(θ/2)|1⟩ — a handy way to make biased coins.",
        "lesson": "bloch",
    },
    "no-cloning": {
        "keys": ["clone", "cloning", "copy a qubit", "copy a state"],
        "text": "The **no-cloning theorem** says no operation can copy an arbitrary unknown quantum state. CNOT 'copies' only basis states; on a superposition it creates entanglement instead of a copy.",
        "lesson": None,
    },
    "decoherence": {
        "keys": ["decoher", "noise", "real hardware", "nisq"],
        "text": "Real qubits suffer **decoherence** and gate errors: interaction with the environment slowly destroys superposition and phase. Simulators like Qiskit Aer can be ideal (as here) or include noise models of real devices.",
        "lesson": None,
    },
}


def find_concepts(question: str) -> list[str]:
    q = f" {question.lower()} "
    hits = []
    for cid, c in CONCEPTS.items():
        if any(k in q for k in c["keys"]):
            hits.append(cid)
    return hits
