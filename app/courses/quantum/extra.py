"""Quantum Computing — expanded curriculum (v2.3).

Advanced lessons that carry the course from single-qubit intuition through the famous
algorithms and on to real, noisy hardware — plus the topics, tutor knowledge and
glossary terms they add. Merged by content.py.
"""
from __future__ import annotations

TOPICS_EXTRA = {
    "math": "Quantum maths",
    "hardware": "Hardware & noise",
    "applications": "Applications",
}

# Existing labs: bloch, builder, algorithms, walk, interference, chsh.
# Algorithms the circuit builder can load: bell, ghz, superdense, teleportation,
# deutsch-jozsa, bernstein-vazirani, grover, qft.
LESSONS_EXTRA = [
    {
        "id": "q-linear-algebra", "order": 10, "title": "The Maths of a Qubit", "topic": "math", "level": "Intermediate", "minutes": 9,
        "summary": "Amplitudes, kets and the Born rule — the small amount of linear algebra that runs everything.",
        "blocks": [
            {"type": "text", "html": "A qubit's state is a vector of two <b>complex amplitudes</b>, written in <b>bra–ket</b> notation:"},
            {"type": "formula", "tex": r"|\psi\rangle = \alpha\,|0\rangle + \beta\,|1\rangle, \qquad \alpha,\beta \in \mathbb{C}, \qquad |\alpha|^2 + |\beta|^2 = 1"},
            {"type": "text", "html": "The amplitudes aren't probabilities — they can be negative or complex. The <b>Born rule</b> says the probability of measuring |0⟩ is |α|², of |1⟩ is |β|². Because amplitudes can cancel, quantum computing can do things probability alone cannot: this is <b>interference</b>."},
            {"type": "text", "html": "Gates are <b>unitary matrices</b> — they rotate the state vector while keeping its length 1, so probabilities always sum to 1. Two qubits live in a 4-dimensional space, n qubits in 2ⁿ: that exponential space is where the power hides."},
            {"type": "callout", "kind": "insight", "html": "n qubits need 2ⁿ complex numbers to describe. At 50 qubits that's more numbers than any classical computer can store — which is exactly why simulating quantum systems is hard, and why quantum computers exist."},
        ],
        "quiz": [
            {"q": "The Born rule says the probability of measuring |0⟩ is…", "options": ["α", "|α|²", "α + β", "1 always"], "answer": 1, "explain": "Probability is the squared magnitude of the amplitude."},
            {"q": "Quantum gates are represented by matrices that are…", "options": ["Random", "Unitary (length-preserving)", "Always diagonal", "Non-invertible"], "answer": 1, "explain": "Unitary matrices keep the state normalised and are reversible."},
            {"q": "Describing n qubits exactly needs how many amplitudes?", "options": ["n", "2n", "n²", "2ⁿ"], "answer": 3, "explain": "The state lives in a 2ⁿ-dimensional space."},
        ],
    },
    {
        "id": "q-multi-gates", "order": 11, "title": "Multi-Qubit Gates & Universality", "topic": "gates", "level": "Intermediate", "minutes": 8,
        "summary": "CNOT, Toffoli and why a handful of gates can build any quantum program.",
        "blocks": [
            {"type": "text", "html": "Single-qubit gates rotate one qubit. To create entanglement you need a <b>two-qubit gate</b>. The star is <b>CNOT</b>: it flips the target qubit only if the control is |1⟩."},
            {"type": "formula", "tex": r"\text{CNOT}:\ |00\rangle\to|00\rangle,\ |01\rangle\to|01\rangle,\ |10\rangle\to|11\rangle,\ |11\rangle\to|10\rangle"},
            {"type": "text", "html": "A Hadamard on the control followed by a CNOT is the recipe for a <b>Bell pair</b> — the simplest entangled state. The three-qubit <b>Toffoli</b> (controlled-controlled-NOT) is enough to build any classical logic reversibly."},
            {"type": "callout", "kind": "insight", "html": "A small <b>universal gate set</b> — e.g. {H, T, CNOT} — can approximate <i>any</i> quantum operation to any precision, just as {AND, OR, NOT} builds any classical circuit."},
            {"type": "try", "target": "builder", "algorithm": "bell", "label": "Build a Bell pair with H + CNOT"},
        ],
        "quiz": [
            {"q": "CNOT flips the target qubit when the control is…", "options": ["|0⟩", "|1⟩", "Always", "Never"], "answer": 1, "explain": "It is a controlled-NOT: active only on control = |1⟩."},
            {"q": "H on the control then CNOT produces…", "options": ["A measurement", "A Bell (entangled) pair", "A classical bit", "Nothing"], "answer": 1, "explain": "That is the standard Bell-state circuit."},
            {"q": "A universal gate set can…", "options": ["Only copy qubits", "Approximate any quantum operation", "Delete entanglement", "Work without qubits"], "answer": 1, "explain": "Like {AND,OR,NOT} classically, a few gates build everything."},
        ],
    },
    {
        "id": "q-deutsch", "order": 12, "title": "Deutsch–Jozsa: Quantum Parallelism", "topic": "algorithms", "level": "Intermediate", "minutes": 8,
        "summary": "The first algorithm to beat every classical computer — in a single query.",
        "blocks": [
            {"type": "text", "html": "Suppose a function is promised to be either <b>constant</b> (same output for all inputs) or <b>balanced</b> (0 for half the inputs, 1 for the other half). Classically, to be sure, you may need to check just over half of all inputs."},
            {"type": "text", "html": "The <b>Deutsch–Jozsa</b> algorithm answers it with a <b>single</b> evaluation. It puts every input into superposition at once, lets interference cancel the wrong answers, and reads the result from one measurement."},
            {"type": "callout", "kind": "insight", "html": "It's a toy problem, but it proved a profound point in 1992: quantum computers can be provably, exponentially faster than classical ones for some tasks. It opened the door to Shor and Grover."},
            {"type": "try", "target": "builder", "algorithm": "deutsch-jozsa", "label": "Run Deutsch–Jozsa and read the answer in one shot"},
        ],
        "quiz": [
            {"q": "Deutsch–Jozsa decides whether a function is…", "options": ["Prime or composite", "Constant or balanced", "Sorted or unsorted", "Linear or quadratic"], "answer": 1, "explain": "It distinguishes constant from balanced functions."},
            {"q": "It needs how many evaluations of the function?", "options": ["One", "Half of all inputs", "All inputs", "None"], "answer": 0, "explain": "A single quantum query suffices."},
            {"q": "The speed-up comes from…", "options": ["Faster transistors", "Superposition + interference cancelling wrong answers", "More memory", "Random guessing"], "answer": 1, "explain": "All inputs are evaluated at once and interference reveals the answer."},
        ],
    },
    {
        "id": "q-teleportation", "order": 13, "title": "Quantum Teleportation", "topic": "entanglement", "level": "Intermediate", "minutes": 9,
        "summary": "Send a qubit's exact state using entanglement and two classical bits — no cloning required.",
        "blocks": [
            {"type": "text", "html": "You can't copy an unknown qubit (the <b>no-cloning theorem</b>), but you <i>can</i> move its state. Teleportation shares a Bell pair between Alice and Bob in advance. Alice entangles her unknown qubit with her half and measures both."},
            {"type": "text", "html": "She sends Bob the two classical bits of her result. Bob applies one of four fix-up gates (I, X, Z or ZX) and his qubit becomes the <b>exact</b> original state."},
            {"type": "callout", "kind": "warning", "html": "Nothing travels faster than light: without Alice's two classical bits, Bob's qubit is useless noise. Teleportation moves quantum <i>information</i>, not matter, and the original is destroyed — consistent with no-cloning."},
            {"type": "try", "target": "builder", "algorithm": "teleportation", "label": "Step through the teleportation circuit"},
        ],
        "quiz": [
            {"q": "The no-cloning theorem says you cannot…", "options": ["Measure a qubit", "Copy an unknown quantum state", "Entangle qubits", "Use a Bell pair"], "answer": 1, "explain": "Unknown states can't be duplicated."},
            {"q": "Teleportation also requires sending…", "options": ["Nothing", "Two classical bits", "The qubit itself", "A whole Bell pair each time"], "answer": 1, "explain": "Bob needs Alice's 2 measurement bits to fix his qubit."},
            {"q": "After teleportation, the original qubit is…", "options": ["Copied", "Destroyed by measurement", "Unchanged", "Sent faster than light"], "answer": 1, "explain": "Alice's measurement collapses the original — no clone exists."},
        ],
    },
    {
        "id": "q-qft", "order": 14, "title": "The Quantum Fourier Transform", "topic": "algorithms", "level": "Advanced", "minutes": 9,
        "summary": "The workhorse behind phase estimation and Shor's algorithm.",
        "blocks": [
            {"type": "text", "html": "The <b>Quantum Fourier Transform</b> is the quantum version of the discrete Fourier transform: it moves information between the computational basis and the <b>phase</b> (frequency) basis."},
            {"type": "formula", "tex": r"|x\rangle \;\mapsto\; \frac{1}{\sqrt{N}}\sum_{k=0}^{N-1} e^{2\pi i\, x k / N}\,|k\rangle"},
            {"type": "text", "html": "A classical FFT on 2ⁿ numbers takes about n·2ⁿ steps; the QFT needs only about n² gates. That exponential edge powers <b>phase estimation</b> — reading an eigenvalue's phase — which is the engine inside Shor's algorithm and many chemistry algorithms."},
            {"type": "callout", "kind": "tip", "html": "You rarely use the QFT on its own: it's a subroutine. Its job is to turn a hidden <i>period</i> in a function into a value you can simply measure."},
            {"type": "try", "target": "builder", "algorithm": "qft", "label": "Load the QFT circuit and inspect the phases"},
        ],
        "quiz": [
            {"q": "The QFT moves between the computational basis and the…", "options": ["Colour basis", "Phase / frequency basis", "Classical basis", "Energy basis only"], "answer": 1, "explain": "It is a change of basis into frequencies, via phases."},
            {"q": "Compared with the classical FFT, the QFT uses…", "options": ["More gates", "About n² gates (far fewer)", "The same number", "No gates"], "answer": 1, "explain": "≈ n² vs n·2ⁿ — an exponential reduction in operations."},
            {"q": "The QFT is mainly used as…", "options": ["A final answer", "A subroutine for finding periods / phases", "A measurement", "A noise model"], "answer": 1, "explain": "Phase estimation and Shor's algorithm use it internally."},
        ],
    },
    {
        "id": "q-shor", "order": 15, "title": "Shor's Algorithm & the Threat to RSA", "topic": "algorithms", "level": "Advanced", "minutes": 9,
        "summary": "Why a large enough quantum computer would break the encryption guarding the internet.",
        "blocks": [
            {"type": "text", "html": "RSA's security rests on one fact: multiplying two big primes is easy, but <b>factoring</b> the product back is believed to take classical computers astronomically long. <b>Shor's algorithm</b> (1994) factors in roughly polynomial time on a quantum computer."},
            {"type": "text", "html": "The trick: factoring reduces to <b>period-finding</b>, and period-finding is exactly what quantum phase estimation (built on the QFT) does well. A hard number-theory problem becomes a frequency-reading problem."},
            {"type": "callout", "kind": "warning", "html": "This is why <b>post-quantum cryptography</b> matters today. \"Harvest now, decrypt later\" attackers store encrypted data, betting a future quantum computer will crack it. (See the Cybersecurity course for the defences.)"},
            {"type": "callout", "kind": "insight", "html": "Current hardware can't threaten real RSA keys yet — it would take millions of high-quality qubits with error correction. But the clock is why standards bodies are already switching algorithms."},
        ],
        "quiz": [
            {"q": "RSA is hard to break classically because of the difficulty of…", "options": ["Addition", "Factoring large numbers", "Sorting", "Hashing"], "answer": 1, "explain": "Factoring a product of two large primes is believed intractable classically."},
            {"q": "Shor's algorithm reduces factoring to…", "options": ["Sorting", "Period-finding (phase estimation)", "Matrix inversion", "Clustering"], "answer": 1, "explain": "It finds the period of a modular function using the QFT."},
            {"q": "\"Harvest now, decrypt later\" is a reason to adopt…", "options": ["Bigger passwords only", "Post-quantum cryptography", "More qubits", "Faster RSA"], "answer": 1, "explain": "Data stolen today could be decrypted by future quantum machines."},
        ],
    },
    {
        "id": "q-noise", "order": 16, "title": "Decoherence & Quantum Noise", "topic": "hardware", "level": "Advanced", "minutes": 8,
        "summary": "Why real qubits forget — and how we measure how long they last.",
        "blocks": [
            {"type": "text", "html": "Qubits are fragile. Any leak of information to the environment collapses superposition — this is <b>decoherence</b>. Two clocks measure it: <b>T₁</b> (how long |1⟩ survives before relaxing to |0⟩) and <b>T₂</b> (how long a superposition keeps its phase)."},
            {"type": "text", "html": "Every gate also has an <b>error rate</b> — today roughly 0.1–1% per two-qubit gate. Errors compound, so a deep circuit on raw qubits quickly becomes noise."},
            {"type": "callout", "kind": "tip", "html": "In the Quantum Walk lab, turn up <b>decoherence</b> and watch the two interference horns melt into a classical bell curve. That is decoherence erasing quantum behaviour in real time."},
            {"type": "try", "target": "lab", "lab": "walk", "label": "Increase decoherence and watch quantum become classical", "preset": {"steps": 60, "decoherence": 0.3}},
        ],
        "quiz": [
            {"q": "Decoherence is caused by…", "options": ["Too many gates only", "The qubit leaking information to its environment", "Measurement being optional", "Cooling the chip"], "answer": 1, "explain": "Entangling with the environment destroys the pure state."},
            {"q": "T₂ measures how long a qubit keeps its…", "options": ["Temperature", "Phase (coherence)", "Colour", "Charge"], "answer": 1, "explain": "T₂ is the dephasing time of a superposition."},
            {"q": "Why do deep circuits fail on today's raw qubits?", "options": ["Gates are free of error", "Per-gate errors compound into noise", "Qubits never decohere", "There are too few gates"], "answer": 1, "explain": "Small per-gate errors accumulate over many operations."},
        ],
    },
    {
        "id": "q-error-correction", "order": 17, "title": "Quantum Error Correction", "topic": "hardware", "level": "Advanced", "minutes": 9,
        "summary": "Spreading one logical qubit across many physical ones to beat the noise.",
        "blocks": [
            {"type": "text", "html": "You can't copy a qubit, and you can't measure it without collapsing it — so classical error correction won't work directly. The clever fix: encode one <b>logical qubit</b> across many <b>physical qubits</b> and measure only the <b>parity</b> between them (a <b>syndrome</b>), which reveals <i>where</i> an error struck without revealing the data."},
            {"type": "text", "html": "The leading approach, the <b>surface code</b>, arranges qubits on a grid and can correct errors as long as they stay below a <b>threshold</b> rate. The cost is steep: a single reliable logical qubit may need hundreds or thousands of physical ones."},
            {"type": "callout", "kind": "insight", "html": "This is the bridge to <b>fault tolerance</b>: once error rates drop below the threshold, adding more physical qubits makes the logical qubit <i>arbitrarily</i> reliable. It's the main thing standing between today's machines and running Shor's algorithm for real."},
        ],
        "quiz": [
            {"q": "A logical qubit is…", "options": ["One perfect qubit", "Encoded across many physical qubits", "A classical bit", "A measurement"], "answer": 1, "explain": "Redundancy across many physical qubits protects the information."},
            {"q": "A syndrome measurement reveals…", "options": ["The stored data", "Where an error occurred, without reading the data", "The temperature", "Nothing useful"], "answer": 1, "explain": "Parity checks locate errors while preserving the logical state."},
            {"q": "Below the error threshold, adding physical qubits makes the logical qubit…", "options": ["Worse", "Arbitrarily more reliable", "Classical", "Unentangled"], "answer": 1, "explain": "That is the threshold theorem behind fault tolerance."},
        ],
    },
    {
        "id": "q-applications", "order": 18, "title": "Where Quantum Computing Actually Helps", "topic": "applications", "level": "Intermediate", "minutes": 7,
        "summary": "Chemistry, optimisation and ML — plus the honest limits and the NISQ era.",
        "blocks": [
            {"type": "text", "html": "Quantum computers are <i>not</i> faster at everything — they shine only where quantum effects give a structural speed-up. The strongest cases:"},
            {"type": "text", "html": "<ul><li><b>Simulating chemistry & materials</b> — molecules <i>are</i> quantum, so a quantum computer is the natural tool (batteries, catalysts, drugs).</li><li><b>Optimisation</b> — variational methods (QAOA) attack hard combinatorial problems.</li><li><b>Cryptography</b> — Shor breaks RSA; Grover gives a quadratic search speed-up.</li></ul>"},
            {"type": "text", "html": "Today we're in the <b>NISQ</b> era — Noisy Intermediate-Scale Quantum: dozens-to-hundreds of imperfect qubits, no full error correction. Useful experiments, but not yet world-changing applications."},
            {"type": "callout", "kind": "warning", "html": "Beware the hype. A quantum computer won't speed up your spreadsheet or your web app. Its advantage is narrow, deep and real — for the right problems."},
            {"type": "try", "target": "builder", "algorithm": "grover", "label": "See Grover's quadratic search speed-up"},
        ],
        "quiz": [
            {"q": "Quantum computers are a natural fit for…", "options": ["Spreadsheets", "Simulating molecules and materials", "Web servers", "Video editing"], "answer": 1, "explain": "Chemistry is quantum, so quantum hardware models it directly."},
            {"q": "The NISQ era is defined by…", "options": ["Perfect error-corrected qubits", "Noisy, intermediate-scale qubits without full correction", "Millions of logical qubits", "No qubits at all"], "answer": 1, "explain": "NISQ = Noisy Intermediate-Scale Quantum."},
            {"q": "Grover's algorithm gives a…", "options": ["Exponential speed-up for everything", "Quadratic speed-up for unstructured search", "Slowdown", "No change"], "answer": 1, "explain": "It searches N items in ≈√N steps."},
        ],
    },
]

KNOWLEDGE_EXTRA = {
    "amplitude": {"keys": ["amplitude", "born rule", "ket", "bra-ket", "complex amplitude"], "lesson": "q-linear-algebra",
                  "text": "A qubit state α|0⟩ + β|1⟩ has complex **amplitudes**; the **Born rule** gives measurement probabilities |α|², |β|². Amplitudes can cancel, which is what makes interference possible."},
    "unitary": {"keys": ["unitary", "unitary matrix", "reversible gate"], "lesson": "q-linear-algebra",
                "text": "Quantum gates are **unitary** matrices: they preserve the length of the state vector (so probabilities sum to 1) and are reversible."},
    "cnot": {"keys": ["cnot", "controlled-not", "two-qubit gate", "toffoli", "universal gate"], "lesson": "q-multi-gates",
             "text": "**CNOT** flips the target qubit when the control is |1⟩ — the gate that creates entanglement. A small universal set like {H, T, CNOT} can build any quantum circuit."},
    "deutsch-jozsa": {"keys": ["deutsch", "deutsch-jozsa", "quantum parallelism", "constant or balanced"], "lesson": "q-deutsch",
                      "text": "**Deutsch–Jozsa** decides if a function is constant or balanced in a single query, using superposition and interference — the first provable quantum speed-up."},
    "teleportation": {"keys": ["teleportation", "no-cloning", "no cloning"], "lesson": "q-teleportation",
                      "text": "**Quantum teleportation** moves a qubit's state using a shared Bell pair plus two classical bits. The **no-cloning theorem** forbids copying, and the original is destroyed."},
    "qft": {"keys": ["qft", "quantum fourier", "phase estimation"], "lesson": "q-qft",
            "text": "The **Quantum Fourier Transform** changes into the phase basis with ≈ n² gates and powers **phase estimation**, the subroutine that turns hidden periods into measurable values."},
    "shor": {"keys": ["shor", "factoring", "post-quantum", "rsa break"], "lesson": "q-shor",
             "text": "**Shor's algorithm** factors large numbers in polynomial time by reducing factoring to period-finding — threatening RSA and motivating post-quantum cryptography."},
    "decoherence": {"keys": ["decoherence", "t1", "t2", "noise", "dephasing"], "lesson": "q-noise",
                    "text": "**Decoherence** is a qubit losing its quantum state to the environment. T₁ is the relaxation time, T₂ the dephasing time; per-gate errors compound over deep circuits."},
    "error-correction": {"keys": ["error correction", "logical qubit", "surface code", "syndrome", "fault tolerance", "threshold"], "lesson": "q-error-correction",
                         "text": "**Quantum error correction** encodes one logical qubit across many physical qubits and measures parity **syndromes** to fix errors. Below a threshold error rate it enables fault tolerance."},
    "nisq": {"keys": ["nisq", "quantum advantage", "qaoa", "applications"], "lesson": "q-applications",
             "text": "**NISQ** (Noisy Intermediate-Scale Quantum) describes today's dozens-to-hundreds of imperfect qubits. Real advantage is narrow: chemistry simulation, some optimisation, and cryptography."},
}

TERMS_EXTRA = {
    "amplitude": ("Amplitude & the Born rule", ["born rule", "amplitude"]),
    "unitary": ("Unitary gate", ["unitary"]),
    "cnot": ("CNOT & universal gates", ["cnot"]),
    "deutsch-jozsa": ("Deutsch–Jozsa algorithm", ["deutsch"]),
    "teleportation": ("Quantum teleportation", ["no-cloning"]),
    "qft": ("Quantum Fourier Transform", ["qft"]),
    "shor": ("Shor's algorithm", ["factoring"]),
    "decoherence": ("Decoherence (T₁ / T₂)", ["decoherence"]),
    "error-correction": ("Quantum error correction", ["surface code", "logical qubit"]),
    "nisq": ("NISQ era", ["nisq"]),
}
