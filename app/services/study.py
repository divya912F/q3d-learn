"""Study tools: flashcard deck + SM-2 spaced repetition, glossary and certificates.

The deck is generated from course content, so every new lesson or knowledge entry automatically
becomes reviewable:

* each quiz question  -> a "quiz" card (question on the front, answer + explanation on the back)
* each knowledge entry -> a "concept" card ("What is …?" -> the tutor's grounded definition)

Scheduling uses the SM-2 algorithm (SuperMemo 2, as popularised by Anki) with four buttons
(Again / Hard / Good / Easy). Spacing and retrieval practice are two of the most robust findings
in learning science; the scheduler keeps the maths small and transparent so students can see why
a card comes back when it does.
"""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from functools import lru_cache

from ..courses import registry as R

# ------------------------------------------------------------------ glossary
# Display names + extra phrases to recognise inside lesson text (lower-case).
TERMS: dict[str, tuple[str, list[str]]] = {
    # quantum
    "qubit": ("Qubit", ["qubits"]),
    "superposition": ("Superposition", []),
    "bloch": ("Bloch sphere", []),
    "hadamard": ("Hadamard gate", ["hadamard"]),
    "pauli-x": ("Pauli-X gate", ["x gate"]),
    "pauli-z": ("Pauli-Z gate", ["z gate"]),
    "pauli-y": ("Pauli-Y gate", ["y gate"]),
    "phase": ("Phase", ["relative phase"]),
    "measurement": ("Measurement", []),
    "entanglement": ("Entanglement", ["entangled"]),
    "cnot": ("CNOT gate", ["cnot"]),
    "interference": ("Interference", []),
    "deutsch": ("Deutsch–Jozsa algorithm", ["deutsch–jozsa", "deutsch-jozsa"]),
    "grover": ("Grover’s search", ["grover"]),
    "teleportation": ("Quantum teleportation", ["teleportation"]),
    "qft": ("Quantum Fourier Transform", ["qft"]),
    "swap": ("SWAP gate", []),
    "toffoli": ("Toffoli gate", ["toffoli"]),
    "rotation": ("Rotation gates (Rx, Ry, Rz)", ["rotation gate"]),
    "no-cloning": ("No-cloning theorem", []),
    "decoherence": ("Decoherence", []),
    # machine learning
    "machine-learning": ("Machine learning", []),
    "supervised": ("Supervised learning", []),
    "regression": ("Linear regression", []),
    "gradient-descent": ("Gradient descent", []),
    "loss": ("Loss function", ["mean squared error"]),
    "logistic": ("Logistic regression", []),
    "knn": ("k-nearest neighbours (k-NN)", ["k-nn", "nearest neighbours"]),
    "decision-boundary": ("Decision boundary", []),
    "tree": ("Decision tree", []),
    "neural": ("Neural network", ["neural networks"]),
    "activation": ("Activation function", []),
    "backprop": ("Backpropagation", []),
    "kmeans": ("k-means clustering", ["k-means"]),
    "overfitting": ("Overfitting", []),
    "metrics": ("Accuracy, precision & recall", ["precision", "recall"]),
    # data science
    "data-science": ("Data science", []),
    "variables": ("Variable types", []),
    "mean-median": ("Mean vs median", ["median"]),
    "spread": ("Standard deviation", []),
    "skew": ("Skewness", ["skewed"]),
    "charts": ("Choosing a chart", []),
    "correlation": ("Correlation", []),
    "causation": ("Correlation vs causation", ["causation"]),
    "missing": ("Missing values", []),
    "outliers": ("Outliers", ["outlier"]),
    "duplicates": ("Duplicate rows", []),
    "normalize": ("Normalisation & standardisation", ["standardisation", "normalisation"]),
    "distribution": ("Probability distribution", ["normal distribution"]),
    "clt": ("Central Limit Theorem", []),
    # artificial intelligence
    "ai": ("Artificial intelligence", []),
    "agent": ("Intelligent agent", []),
    "bfs": ("Breadth-first search (BFS)", ["breadth-first search"]),
    "dfs": ("Depth-first search (DFS)", ["depth-first search"]),
    "ucs": ("Uniform-cost search (UCS)", ["uniform-cost search"]),
    "frontier": ("Frontier", []),
    "astar": ("A* search", ["a* search"]),
    "minimax": ("Minimax", []),
    "alphabeta": ("Alpha-beta pruning", []),
    "rl": ("Reinforcement learning", []),
    "qlearning": ("Q-learning", []),
    "exploration": ("Exploration vs exploitation", ["exploration"]),
    "language-model": ("Language model", ["language models"]),
    "temperature": ("Sampling temperature", []),
    "hallucination": ("AI hallucination", []),
    "ethics": ("Responsible AI", []),
    # quantum (v2.2)
    "quantum-walk": ("Quantum walk", []),
    # data structures & algorithms
    "big-o": ("Big-O notation", ["time complexity"]),
    "array": ("Array", ["arrays"]),
    "linked-list": ("Linked list", []),
    "stack-queue": ("Stack & queue", ["stack", "queue"]),
    "sorting": ("Simple sorting algorithms", ["insertion sort", "selection sort", "bubble sort"]),
    "recursion": ("Recursion", ["recursive", "divide and conquer"]),
    "merge-sort": ("Merge sort", []),
    "quicksort": ("Quicksort", ["pivot"]),
    "bst": ("Binary search tree (BST)", ["binary search tree"]),
    "avl": ("AVL tree", ["rotations", "balance factor"]),
    "graph": ("Graph", ["adjacency list"]),
    "dijkstra-sp": ("Dijkstra's algorithm", ["dijkstra"]),
    "mst": ("Minimum spanning tree", ["prim", "kruskal"]),
    "heap": ("Binary heap", ["heap sort", "priority queue"]),
    "hash-table": ("Hash table", ["hashmap", "load factor"]),
    # cybersecurity
    "cia": ("CIA triad", ["confidentiality", "integrity", "availability"]),
    "threat-model": ("Threat modelling", ["defence in depth"]),
    "caesar": ("Caesar cipher", []),
    "vigenere": ("Vigenère cipher", ["vigenère", "index of coincidence"]),
    "frequency": ("Frequency analysis", []),
    "symmetric": ("Symmetric encryption (AES)", ["aes"]),
    "xor-otp": ("XOR & one-time pad", ["one-time pad", "xor"]),
    "hash": ("Cryptographic hash", ["sha-256", "avalanche effect"]),
    "password-storage": ("Salted password hashing", ["salt", "bcrypt"]),
    "entropy": ("Password entropy", []),
    "rsa": ("RSA", []),
    "signature": ("Digital signature", ["digital signatures"]),
    "diffie-hellman": ("Diffie–Hellman key exchange", ["diffie–hellman", "diffie-hellman"]),
    "injection": ("SQL injection", ["parameterised queries"]),
    "xss-phishing": ("Phishing, XSS & MITM", ["phishing", "cross-site scripting"]),
    "mfa": ("Multi-factor authentication", ["multi-factor authentication", "least privilege"]),
    # blockchain
    "blockchain": ("Blockchain", []),
    "hash-pointer": ("Hash pointer", ["previous hash"]),
    "pow": ("Proof of work", ["nonce"]),
    "pos": ("Proof of stake", []),
    "merkle": ("Merkle tree", ["merkle root", "merkle proof"]),
    "consensus": ("Consensus & confirmations", ["confirmations"]),
    "double-spend": ("Double spend / 51% attack", ["double spend", "51% attack"]),
    "smart-contract": ("Smart contract", ["smart contracts"]),
    # deep learning
    "deep-network": ("Deep neural network", ["deep network"]),
    "relu": ("ReLU", []),
    "tensor": ("Tensor", ["channels"]),
    "convolution": ("Convolution", ["kernel", "feature map"]),
    "pooling": ("Pooling", ["max-pooling", "stride"]),
    "cnn": ("Convolutional neural network (CNN)", ["resnet"]),
    "augmentation": ("Augmentation & dropout", ["data augmentation", "dropout"]),
    "transfer": ("Transfer learning", []),
    "attention": ("Self-attention", ["attention"]),
    "transformer": ("Transformer", ["transformers"]),
    "feature-viz": ("Feature visualisation", ["deepdream"]),
    "generative": ("Generative models", ["diffusion models", "gans"]),
}


def _plain(md: str) -> str:
    return re.sub(r"\*\*?([^*]+)\*\*?", r"\1", md).strip()


@lru_cache(maxsize=1)
def glossary() -> list[dict]:
    out: list[dict] = []
    for cid in R.ORDER:
        for key, entry in R.knowledge(cid).items():
            name, aliases = TERMS.get(key, (key.replace("-", " ").capitalize(), []))
            match = {name.lower().split(" (")[0]} | {a.lower() for a in aliases}
            out.append({
                "id": f"{cid}:{key}", "course": cid, "term": name, "text": entry["text"],
                "lesson": entry.get("lesson"), "match": sorted(m for m in match if len(m) >= 3),
            })
    out.sort(key=lambda g: g["term"].lower())
    return out


# ------------------------------------------------------------------ flashcards
@lru_cache(maxsize=1)
def deck() -> tuple[dict, ...]:
    cards: list[dict] = []
    for cid in R.ORDER:
        titles = {l["id"]: l["title"] for l in R.lessons(cid)}
        for l in R.lessons(cid):
            for i, q in enumerate(l.get("quiz", [])):
                cards.append({
                    "id": f"{l['id']}:q{i}", "course": cid, "kind": "quiz", "lesson_id": l["id"], "lesson_title": l["title"],
                    "topic": l.get("topic"), "order": l.get("order", 0),
                    "front": q["q"], "back": q["options"][q["answer"]], "explain": q.get("explain", ""),
                })
        for g in glossary():
            if g["course"] != cid:
                continue
            lesson = R.lesson(cid, g["lesson"]) if g["lesson"] else None
            cards.append({
                "id": f"g:{g['id']}", "course": cid, "kind": "concept", "lesson_id": g["lesson"],
                "lesson_title": titles.get(g["lesson"], ""), "topic": lesson.get("topic") if lesson else None,
                "order": lesson.get("order", 99) if lesson else 99,
                "front": f"Explain in your own words: {g['term']}", "back": _plain(g["text"]), "explain": "",
            })
    return tuple(cards)


def card_index() -> dict[str, dict]:
    return {c["id"]: c for c in deck()}


GRADES = {"again": 0, "hard": 1, "good": 2, "easy": 3}


@dataclass
class CardState:
    ease: float = 2.5
    interval: float = 0.0   # days
    reps: int = 0
    lapses: int = 0


def schedule(state: CardState, grade: int) -> tuple[CardState, timedelta]:
    """SM-2 with four buttons. Returns the new state and the delay until the next review.

    grade: 0 again, 1 hard, 2 good, 3 easy.
    """
    if grade not in (0, 1, 2, 3):
        raise ValueError("grade must be 0..3")
    q = {0: 1, 1: 3, 2: 4, 3: 5}[grade]  # SM-2 quality
    ease = max(1.3, state.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
    if grade == 0:
        new = CardState(ease=ease, interval=0.0, reps=0, lapses=state.lapses + 1)
        return new, timedelta(minutes=10)
    reps = state.reps + 1
    if reps == 1:
        interval = {1: 1.0, 2: 1.0, 3: 3.0}[grade]
    elif reps == 2:
        interval = {1: 3.0, 2: 6.0, 3: 8.0}[grade]
    else:
        factor = {1: 1.2, 2: ease, 3: ease * 1.3}[grade]
        interval = max(state.interval + 1, state.interval * factor)
    interval = min(interval, 365.0)
    return CardState(ease=round(ease, 3), interval=round(interval, 2), reps=reps, lapses=state.lapses), timedelta(days=interval)


def preview(state: CardState) -> dict[str, str]:
    """Human-readable next interval for each button (shown under the buttons)."""
    out = {}
    for name, g in GRADES.items():
        _, delay = schedule(state, g)
        mins = delay.total_seconds() / 60
        out[name] = f"{round(mins)} min" if mins < 60 else (f"{round(mins / 60)} h" if mins < 1440 else f"{round(mins / 1440)} d")
    return out


# ------------------------------------------------------------------ certificates
CERT_MIN_QUIZ = 60


def certificate_code(user_id: int, course: str, name: str) -> str:
    return hashlib.sha256(f"q3d|{user_id}|{course}|{name}".encode()).hexdigest()[:10].upper()


def certificate_status(stats: dict, course: str) -> dict:
    c = stats["courses"][course]
    lessons_ok = len(c["lessons_completed"]) >= c["lessons_total"]
    quiz_ok = (c["avg_quiz"] or 0) >= CERT_MIN_QUIZ
    return {
        "eligible": lessons_ok and quiz_ok,
        "lessons_completed": len(c["lessons_completed"]), "lessons_total": c["lessons_total"],
        "avg_quiz": c["avg_quiz"], "min_quiz": CERT_MIN_QUIZ,
        "challenges_solved": len(c["challenges_solved"]), "challenges_total": c["challenges_total"],
        "mastery": c["overall_mastery"], "xp": c["xp"],
    }


def now_utc() -> datetime:
    return datetime.now(timezone.utc)
