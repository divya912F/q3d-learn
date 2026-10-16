"""Curriculum: lessons, quizzes and links into the 3D Lab / Circuit Builder.

Lesson body blocks:
  {"type": "text", "html": "..."}              rich text (trusted, authored here)
  {"type": "formula", "tex": "..."}            rendered with KaTeX in the browser
  {"type": "callout", "kind": "tip|insight|warning", "html": "..."}
  {"type": "try", "target": "lab|builder", "label": "...", "num_qubits": n, "operations": [...]}
"""
from __future__ import annotations

from math import pi

LESSONS: list[dict] = [
    {
        "id": "qubits",
        "order": 1,
        "title": "What is a Qubit?",
        "topic": "superposition",
        "level": "Beginner",
        "minutes": 6,
        "summary": "Bits vs qubits, amplitudes, superposition and the normalisation rule.",
        "blocks": [
            {"type": "text", "html": "A classical bit is either <b>0</b> or <b>1</b>. A <b>qubit</b> can be in a <i>superposition</i> of both. We write its state with two complex numbers called <b>amplitudes</b>:"},
            {"type": "formula", "tex": r"|\psi\rangle = \alpha|0\rangle + \beta|1\rangle, \qquad |\alpha|^2 + |\beta|^2 = 1"},
            {"type": "text", "html": "When you measure, you get 0 with probability |α|² and 1 with probability |β|². The amplitudes are not probabilities themselves — they can be negative or complex, which is what makes <i>interference</i> possible."},
            {"type": "callout", "kind": "insight", "html": "Superposition is not 'secretly 0 or 1'. Before measurement both amplitudes are physically present and can interfere with each other."},
            {"type": "try", "target": "lab", "label": "Put a qubit into superposition with H", "num_qubits": 1, "operations": [{"name": "h", "qubits": [0], "params": []}]},
        ],
        "quiz": [
            {"q": "A qubit is in state 0.6|0⟩ + 0.8|1⟩. What is the probability of measuring 1?", "options": ["0.8", "0.64", "0.36", "0.2"], "answer": 1, "explain": "Probability = |β|² = 0.8² = 0.64."},
            {"q": "Which pair of amplitudes is a valid qubit state?", "options": ["α=1, β=1", "α=0.5, β=0.5", "α=1/√2, β=−1/√2", "α=0, β=0"], "answer": 2, "explain": "|1/√2|² + |−1/√2|² = 1. Negative amplitudes are perfectly valid."},
            {"q": "What happens to a superposition when it is measured?", "options": ["It stays in superposition", "It collapses to |0⟩ or |1⟩", "It becomes entangled", "It is copied"], "answer": 1, "explain": "Measurement collapses the state to the observed basis state."},
        ],
    },
    {
        "id": "bloch",
        "order": 2,
        "title": "The Bloch Sphere",
        "topic": "bloch",
        "level": "Beginner",
        "minutes": 7,
        "summary": "Every single-qubit state is a point on a sphere — see it in 3D.",
        "blocks": [
            {"type": "text", "html": "Ignoring an unobservable global phase, any qubit state can be written with two angles θ and φ:"},
            {"type": "formula", "tex": r"|\psi\rangle = \cos\tfrac{\theta}{2}|0\rangle + e^{i\varphi}\sin\tfrac{\theta}{2}|1\rangle"},
            {"type": "text", "html": "θ is the <b>latitude</b> (0 at the north pole |0⟩, π at the south pole |1⟩) and φ is the <b>longitude</b> around the equator. The six cardinal points are |0⟩, |1⟩, |+⟩, |−⟩, |+i⟩ and |−i⟩."},
            {"type": "callout", "kind": "tip", "html": "Every single-qubit gate is simply a <b>rotation</b> of this sphere. In the 3D Lab, gates animate as rotations about their axis."},
            {"type": "text", "html": "Studies of quantum education (e.g. Qerimi et al., 2025) found that learners solve single-qubit tasks more efficiently with the Bloch sphere than with other visual representations."},
            {"type": "try", "target": "lab", "label": "Explore θ and φ in the 3D Lab", "num_qubits": 1, "operations": [{"name": "ry", "qubits": [0], "params": [pi / 3]}, {"name": "rz", "qubits": [0], "params": [pi / 4]}]},
        ],
        "quiz": [
            {"q": "Where is |1⟩ on the Bloch sphere?", "options": ["North pole", "South pole", "+X axis", "Centre"], "answer": 1, "explain": "θ = π puts the state at the south pole."},
            {"q": "Which states lie on the equator?", "options": ["|0⟩ and |1⟩", "Only |+⟩", "All equal superpositions like |+⟩, |−⟩, |+i⟩", "None"], "answer": 2, "explain": "On the equator θ = π/2, so both outcomes have probability ½; φ distinguishes them."},
            {"q": "Changing only φ changes…", "options": ["the measurement probabilities in the Z basis", "the relative phase", "the number of qubits", "nothing at all"], "answer": 1, "explain": "φ is the relative phase; Z-basis probabilities depend only on θ."},
        ],
    },
    {
        "id": "pauli",
        "order": 3,
        "title": "Pauli Gates: X, Y, Z",
        "topic": "gates",
        "level": "Beginner",
        "minutes": 6,
        "summary": "Bit flips, phase flips, and half-turns of the Bloch sphere.",
        "blocks": [
            {"type": "formula", "tex": r"X=\begin{pmatrix}0&1\\1&0\end{pmatrix}\quad Y=\begin{pmatrix}0&-i\\i&0\end{pmatrix}\quad Z=\begin{pmatrix}1&0\\0&-1\end{pmatrix}"},
            {"type": "text", "html": "<b>X</b> is the quantum NOT: |0⟩ ↔ |1⟩. <b>Z</b> leaves |0⟩ alone and flips the sign of |1⟩ — a <i>phase flip</i>. <b>Y</b> does both. Geometrically each one is a 180° rotation about its own axis."},
            {"type": "callout", "kind": "insight", "html": "Z on |0⟩ does nothing visible, but Z on |+⟩ turns it into |−⟩. Phase only matters for superpositions."},
            {"type": "try", "target": "lab", "label": "Apply X, then H, then Z", "num_qubits": 1, "operations": [{"name": "x", "qubits": [0], "params": []}, {"name": "h", "qubits": [0], "params": []}, {"name": "z", "qubits": [0], "params": []}]},
        ],
        "quiz": [
            {"q": "X applied to |1⟩ gives…", "options": ["|1⟩", "|0⟩", "−|1⟩", "|+⟩"], "answer": 1, "explain": "X swaps the amplitudes of |0⟩ and |1⟩."},
            {"q": "Z applied to |+⟩ gives…", "options": ["|+⟩", "|0⟩", "|−⟩", "|1⟩"], "answer": 2, "explain": "Z flips the sign of the |1⟩ component: (|0⟩+|1⟩)/√2 → (|0⟩−|1⟩)/√2."},
            {"q": "On the Bloch sphere a Pauli gate is a rotation of…", "options": ["45°", "90°", "180°", "360°"], "answer": 2, "explain": "All Pauli gates are π (180°) rotations."},
        ],
    },
    {
        "id": "hadamard-phase",
        "order": 4,
        "title": "Hadamard & Phase Gates",
        "topic": "phase",
        "level": "Beginner",
        "minutes": 7,
        "summary": "H creates superposition; S and T rotate the phase.",
        "blocks": [
            {"type": "formula", "tex": r"H=\tfrac{1}{\sqrt2}\begin{pmatrix}1&1\\1&-1\end{pmatrix},\quad S=\begin{pmatrix}1&0\\0&i\end{pmatrix},\quad T=\begin{pmatrix}1&0\\0&e^{i\pi/4}\end{pmatrix}"},
            {"type": "text", "html": "<b>H</b> maps |0⟩→|+⟩ and |1⟩→|−⟩, and is its own inverse (H·H = I). <b>S</b> is a quarter-turn about Z and <b>T</b> an eighth-turn: T² = S and S² = Z."},
            {"type": "callout", "kind": "tip", "html": "H·Z·H = X. Changing basis with H turns phase flips into bit flips — a trick used by almost every algorithm."},
            {"type": "try", "target": "lab", "label": "Walk around the equator with H then T, T, T", "num_qubits": 1, "operations": [{"name": "h", "qubits": [0], "params": []}, {"name": "t", "qubits": [0], "params": []}, {"name": "t", "qubits": [0], "params": []}, {"name": "t", "qubits": [0], "params": []}]},
        ],
        "quiz": [
            {"q": "What is H·H?", "options": ["X", "Z", "The identity", "S"], "answer": 2, "explain": "Hadamard is self-inverse."},
            {"q": "Two T gates in a row equal…", "options": ["S", "Z", "X", "H"], "answer": 0, "explain": "T² adds a phase e^{iπ/2} = i, which is S."},
            {"q": "Starting from |0⟩, which sequence reaches |+i⟩?", "options": ["H then S", "S then H", "X then S", "Z then H"], "answer": 0, "explain": "H gives |+⟩ on the equator; S rotates it a quarter-turn to +Y = |+i⟩."},
        ],
    },
    {
        "id": "measurement",
        "order": 5,
        "title": "Measurement & Probability",
        "topic": "measurement",
        "level": "Beginner",
        "minutes": 6,
        "summary": "The Born rule, shots and why simulations show histograms.",
        "blocks": [
            {"type": "text", "html": "A single measurement gives one random bitstring. To estimate probabilities we run the circuit many times — each run is a <b>shot</b>. The <b>Born rule</b> says:"},
            {"type": "formula", "tex": r"P(x) = |\langle x|\psi\rangle|^2"},
            {"type": "text", "html": "With 1024 shots the histogram fluctuates around the exact probabilities by roughly 1/√1024 ≈ 3%. Q-3D Learn shows both the sampled <i>counts</i> and the exact <i>probabilities</i> so you can compare."},
            {"type": "callout", "kind": "warning", "html": "Measurement is irreversible: once a qubit collapses, its superposition (and its phase) is gone."},
            {"type": "try", "target": "builder", "label": "Measure a biased qubit: RY(π/3)", "num_qubits": 1, "operations": [{"name": "ry", "qubits": [0], "params": [pi / 3], "col": 0}, {"name": "measure", "qubits": [0], "params": [], "col": 1}]},
        ],
        "quiz": [
            {"q": "A circuit gives P(1)=0.25. Roughly how many '1's in 1000 shots?", "options": ["25", "250", "500", "750"], "answer": 1, "explain": "1000 × 0.25 = 250 (give or take statistical noise)."},
            {"q": "Why are counts slightly different from exact probabilities?", "options": ["The simulator has bugs", "Sampling noise from a finite number of shots", "Measurement adds phases", "Qubits decay"], "answer": 1, "explain": "Counts are random samples; more shots → closer to the exact values."},
            {"q": "After measuring a qubit in |+⟩ and getting 0, its state is…", "options": ["|+⟩", "|0⟩", "|1⟩", "|−⟩"], "answer": 1, "explain": "The state collapses to the observed outcome."},
        ],
    },
    {
        "id": "entanglement",
        "order": 6,
        "title": "Entanglement & the CNOT",
        "topic": "entanglement",
        "level": "Intermediate",
        "minutes": 8,
        "summary": "Multi-qubit states, CNOT and the four Bell states.",
        "blocks": [
            {"type": "text", "html": "n qubits need 2ⁿ amplitudes. The <b>CNOT</b> flips its target when the control is |1⟩. Applied after H it creates a <b>Bell state</b>:"},
            {"type": "formula", "tex": r"\mathrm{CNOT}\,(H\otimes I)|00\rangle = \tfrac{1}{\sqrt2}\big(|00\rangle + |11\rangle\big)"},
            {"type": "text", "html": "This state cannot be written as (state of q0) ⊗ (state of q1): the qubits are <b>entangled</b>. In Q-3D Learn you can <i>see</i> this — each qubit's Bloch arrow shrinks to the centre because, alone, it has no definite direction (its reduced state is maximally mixed)."},
            {"type": "callout", "kind": "insight", "html": "Entanglement gives perfect correlations, but it cannot be used to send messages faster than light — each qubit on its own looks completely random."},
            {"type": "try", "target": "builder", "label": "Build the Bell state", "num_qubits": 2, "operations": [{"name": "h", "qubits": [0], "params": [], "col": 0}, {"name": "cx", "qubits": [0, 1], "params": [], "col": 1}]},
        ],
        "quiz": [
            {"q": "How many amplitudes describe 3 qubits?", "options": ["3", "6", "8", "9"], "answer": 2, "explain": "2³ = 8."},
            {"q": "Measuring the Bell state (|00⟩+|11⟩)/√2 can give…", "options": ["00, 01, 10, 11", "only 00 or 11", "only 01 or 10", "always 00"], "answer": 1, "explain": "Only the components present in the state can be observed."},
            {"q": "Why does an entangled qubit's Bloch vector shrink?", "options": ["It lost energy", "Its individual (reduced) state is mixed", "The simulator rounds numbers", "CNOT is not unitary"], "answer": 1, "explain": "Tracing out the partner leaves a mixed state, which sits inside the sphere."},
        ],
    },
    {
        "id": "interference",
        "order": 7,
        "title": "Interference & Deutsch–Jozsa",
        "topic": "algorithms",
        "level": "Intermediate",
        "minutes": 9,
        "summary": "How quantum algorithms make wrong answers cancel out.",
        "blocks": [
            {"type": "text", "html": "Amplitudes add like waves. H·H = I is the simplest example: the two paths to |1⟩ have opposite signs and <b>cancel</b>, while the paths to |0⟩ <b>reinforce</b>."},
            {"type": "formula", "tex": r"H|+\rangle = |0\rangle, \qquad H|-\rangle = |1\rangle"},
            {"type": "text", "html": "The <b>Deutsch–Jozsa</b> algorithm uses this: a 'phase kickback' oracle marks inputs with ±1, and a final layer of H gates makes the all-zeros outcome appear <i>only</i> if the function is constant. One query replaces up to 2ⁿ⁻¹+1 classical ones."},
            {"type": "try", "target": "builder", "label": "Load Deutsch–Jozsa", "algorithm": "deutsch-jozsa"},
        ],
        "quiz": [
            {"q": "What does H·H|0⟩ give?", "options": ["|+⟩", "|1⟩", "|0⟩", "|−⟩"], "answer": 2, "explain": "Paths to |1⟩ cancel by destructive interference."},
            {"q": "In Deutsch–Jozsa, measuring all zeros means the function is…", "options": ["balanced", "constant", "random", "undefined"], "answer": 1, "explain": "Only a constant function makes all amplitude interfere into |0…0⟩."},
            {"q": "Phase kickback uses an ancilla prepared in…", "options": ["|0⟩", "|1⟩", "|−⟩", "|+i⟩"], "answer": 2, "explain": "|−⟩ is an eigenstate of X, so the oracle's flip becomes a phase on the input."},
        ],
    },
    {
        "id": "grover",
        "order": 8,
        "title": "Grover's Search",
        "topic": "algorithms",
        "level": "Advanced",
        "minutes": 10,
        "summary": "Amplitude amplification: find a needle in √N steps.",
        "blocks": [
            {"type": "text", "html": "Grover's algorithm searches N items in about <b>(π/4)√N</b> iterations instead of N/2. Each iteration has two parts:"},
            {"type": "text", "html": "<ol><li><b>Oracle</b> — flips the sign of the marked item's amplitude.</li><li><b>Diffusion</b> — reflects all amplitudes about their mean, so the negative (marked) one grows.</li></ol>"},
            {"type": "formula", "tex": r"D = 2|s\rangle\langle s| - I, \qquad |s\rangle = H^{\otimes n}|0\rangle^{\otimes n}"},
            {"type": "callout", "kind": "tip", "html": "Use the step-through slider in the Circuit Builder: after the oracle the probabilities are unchanged but the phase colour of |11⟩ flips — interference does the rest."},
            {"type": "try", "target": "builder", "label": "Load Grover (2 qubits)", "algorithm": "grover"},
        ],
        "quiz": [
            {"q": "Grover's speed-up over classical search is…", "options": ["exponential", "quadratic", "none", "logarithmic"], "answer": 1, "explain": "√N vs N is a quadratic speed-up."},
            {"q": "What does the oracle change?", "options": ["Probabilities", "The phase (sign) of the marked state", "The number of qubits", "The measurement basis"], "answer": 1, "explain": "The oracle only flips the sign; diffusion converts that into probability."},
            {"q": "For N = 4, how many Grover iterations give certainty?", "options": ["1", "2", "4", "16"], "answer": 0, "explain": "For 4 items one iteration rotates the state exactly onto the marked item."},
        ],
    },
    {
        "id": "quantum-walk",
        "order": 9,
        "title": "Quantum Walks: Interference in Motion",
        "topic": "algorithms",
        "level": "Advanced",
        "minutes": 9,
        "summary": "A coin-flipping walker that spreads quadratically faster than a classical one.",
        "blocks": [
            {"type": "text", "html": "In a <b>classical random walk</b> you flip a coin and step left or right. After t steps the walker's position forms a bell curve whose width grows like √t."},
            {"type": "text", "html": "In a <b>quantum walk</b> the coin is a qubit. Each step applies a coin gate (e.g. Hadamard) and then a <b>conditional shift</b>: the |0⟩ part moves left, the |1⟩ part moves right. Paths interfere — some cancel, others reinforce — so the walker races outward with two bright peaks near ±t/√2."},
            {"type": "formula", "tex": r"|\psi_{t+1}\rangle = S\,(H \otimes I)\,|\psi_t\rangle, \qquad \sigma_{\text{quantum}} \propto t \quad\text{vs}\quad \sigma_{\text{classical}} \propto \sqrt{t}"},
            {"type": "callout", "kind": "insight", "html": "Turn up <b>decoherence</b> in the lab: measuring the position each step destroys interference and the quantum walk melts back into the classical bell curve. Quantum walks power search algorithms and model energy transport in photosynthesis."},
            {"type": "try", "target": "lab", "lab": "walk", "label": "Launch a 60-step quantum walk", "preset": {"steps": 60}},
        ],
        "quiz": [
            {"q": "The spread of a quantum walk grows like…", "options": ["√t", "t", "log t", "It doesn't spread"], "answer": 1, "explain": "Ballistic spreading — quadratically faster than the classical √t."},
            {"q": "What makes the quantum walk differ from the classical one?", "options": ["A faster computer", "Interference between paths", "More steps", "Bigger coins"], "answer": 1, "explain": "Amplitudes add and cancel."},
            {"q": "With full decoherence each step, the quantum walk becomes…", "options": ["Even faster", "A classical random walk", "Frozen at 0", "Two separate walks"], "answer": 1, "explain": "Measurement destroys the phase relationships."},
        ],
    },
]

TOPICS = {
    "superposition": "Superposition",
    "bloch": "Bloch sphere",
    "gates": "Quantum gates",
    "phase": "Phase",
    "measurement": "Measurement",
    "entanglement": "Entanglement",
    "algorithms": "Algorithms",
}


def public_lesson(lesson: dict, include_body: bool = True) -> dict:
    """Lesson without quiz answers (answers are graded server-side)."""
    out = {k: v for k, v in lesson.items() if k not in ("quiz", "blocks")}
    out["topic_label"] = TOPICS.get(lesson["topic"], lesson["topic"])
    out["quiz_length"] = len(lesson["quiz"])
    if include_body:
        out["blocks"] = lesson["blocks"]
        out["quiz"] = [{"q": q["q"], "options": q["options"]} for q in lesson["quiz"]]
    return out


def get_lesson(lesson_id: str) -> dict | None:
    return next((lesson for lesson in LESSONS if lesson["id"] == lesson_id), None)


def grade_quiz(lesson: dict, answers: list[int]) -> dict:
    results = []
    correct = 0
    for i, q in enumerate(lesson["quiz"]):
        given = answers[i] if i < len(answers) else None
        ok = given == q["answer"]
        correct += ok
        results.append({"correct": ok, "answer": q["answer"], "explain": q["explain"]})
    total = len(lesson["quiz"])
    return {"score": correct, "total": total, "percent": round(100 * correct / total), "results": results}
