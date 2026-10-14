"""Context-aware AI tutor.

Hallucination guard-rails (from the project plan):
  1. Every answer is grounded in the learner's *current* circuit and the *actual*
     simulation output (probabilities, Bloch vectors, recognised state), which we
     compute ourselves and pass to the model as authoritative facts.
  2. Concept explanations come from a curated knowledge base (``knowledge.py``)
     that is also injected into the LLM prompt.
  3. With no API key (or if the provider fails) a deterministic offline tutor
     answers from the same facts, so the platform works fully offline.
"""
from __future__ import annotations

import json
import logging
import re
import urllib.error
import urllib.request
from typing import Any

from ..config import settings
from ..content.challenges import get_challenge
from ..content.lessons import get_lesson
from ..quantum.gates import GATES
from ..quantum.simulator import run_circuit
from .knowledge import CONCEPTS, find_concepts

log = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are Q-Bot, the friendly AI tutor inside Q-3D Learn, an interactive quantum-computing learning platform for students.

Rules:
- Explain clearly for a beginner-to-intermediate student. Prefer intuition first, then the math.
- Keep answers under ~180 words unless the student asks for more depth. Use short paragraphs or bullet points and Unicode kets like |0⟩, |+⟩.
- The SIMULATION FACTS section is computed by an exact simulator and is authoritative. Never contradict it and never invent numbers that are not in it.
- If the student asks about their circuit, reference the actual gates and results. If something looks wrong, give a hint rather than the full solution for challenges.
- If you are not sure about something, say so. Do not make up references.
- Mention the 3D Bloch sphere or the step-through slider when it helps the student *see* the idea.
"""

STATE_WORDS = {
    "|0>": "0", "|0⟩": "0", "|1>": "1", "|1⟩": "1", "|+>": "+", "|+⟩": "+", "|->": "-", "|−⟩": "-", "|-⟩": "-",
    "zero": "0", "one": "1", "plus": "+", "minus": "-",
}
PREP = {"0": [], "1": [("x", [])], "+": [("h", [])], "-": [("x", []), ("h", [])]}
NAMED_SINGLE = {"h", "x", "y", "z", "s", "t", "sdg", "tdg", "sx"}


# --------------------------------------------------------------------------- facts
def circuit_text(circuit: dict | None) -> str:
    if not circuit or not circuit.get("operations"):
        return "(empty circuit)"
    parts = []
    for op in circuit["operations"]:
        name = op["name"]
        qs = op.get("qubits", [])
        ps = op.get("params") or []
        label = GATES[name].label if name in GATES else name.upper()
        if name == "barrier":
            continue
        if ps:
            label += "(" + ", ".join(f"{p:.3g}" for p in ps) + ")"
        if len(qs) == 2 and name in ("cx", "cy", "cz", "ch", "cp"):
            parts.append(f"{label} control q{qs[0]} → target q{qs[1]}")
        elif len(qs) == 3:
            parts.append(f"{label} controls q{qs[0]},q{qs[1]} → target q{qs[2]}")
        else:
            parts.append(f"{label} on " + ",".join(f"q{q}" for q in qs))
    return "; ".join(parts)


def simulation_facts(circuit: dict | None, result: dict | None) -> tuple[dict | None, list[str]]:
    """(result, fact lines). Re-simulates the circuit so facts are always trustworthy."""
    if circuit and circuit.get("operations") is not None:
        try:
            result = run_circuit(circuit["num_qubits"], circuit["operations"], shots=1024, include_steps=False, seed=7)
        except Exception as exc:  # invalid circuits are still worth discussing
            return None, [f"The circuit could not be simulated: {exc}"]
    if not result:
        return None, []
    n = result["num_qubits"]
    facts = [
        f"Qubits: {n} (bit order in bitstrings is q{n - 1}…q0, Qiskit convention).",
        f"Circuit: {circuit_text(circuit)}.",
        f"Depth {result.get('depth')}, {result.get('gate_count')} operations.",
        f"Final state before measurement: {result['analysis']['ket']}",
        f"Recognised state: {result['analysis']['name']} — {result['analysis']['description']}.",
    ]
    probs = sorted(result["probabilities"].items(), key=lambda kv: -kv[1])[:8]
    facts.append("Exact probabilities: " + ", ".join(f"|{k}⟩ {v * 100:.1f}%" for k, v in probs))
    if result.get("counts"):
        facts.append(f"Sampled counts ({result['shots']} shots, measured qubits {result['measured_qubits']}): {result['counts']}")
    for b in result["bloch"]:
        mixed = " (inside the sphere → mixed, entangled with other qubits)" if b["r"] < 0.99 else ""
        facts.append(
            f"q{b['qubit']} Bloch vector (x={b['x']:.2f}, y={b['y']:.2f}, z={b['z']:.2f}), length {b['r']:.2f}{mixed}, P(1)={b['p1']:.2f}"
        )
    if result["entanglement"]["entangled"]:
        facts.append(f"Entangled qubits: {result['entanglement']['qubits']}.")
    for w in result.get("warnings", []):
        facts.append(f"Note: {w}")
    return result, facts


# ------------------------------------------------------------------- offline tutor
def _gate_story(circuit: dict) -> list[str]:
    lines = []
    for i, op in enumerate([o for o in circuit["operations"] if o["name"] != "barrier"][:12], 1):
        spec = GATES.get(op["name"])
        if not spec:
            continue
        where = ", ".join(f"q{q}" for q in op["qubits"])
        lines.append(f"{i}. **{spec.label}** on {where} — {spec.description}")
    if len(circuit["operations"]) > 12:
        lines.append("…")
    return lines


def _gate_on_state(question: str) -> str | None:
    """Answer 'what happens when I apply <gate> to <state>?' by actually simulating it."""
    q = question.lower()
    gate = "h" if "hadamard" in q else None
    if gate is None:
        for m in re.finditer(r"\b(h|x|y|z|s|t|sdg|tdg|sx)\b([\s-]*gate)?", q):
            g = m.group(1)
            # single letters like "s"/"t" only count when written as "s gate", "apply t", …
            if m.group(2) or re.search(rf"\b(apply|applying|use|using)\s+(an?\s+)?{g}\b", q):
                gate = g
                break
    if gate not in NAMED_SINGLE:
        return None
    state = None
    for word, s in STATE_WORDS.items():
        if word in q and ("|" in word or f" to {word}" in q or f"on {word}" in q):
            state = s
            break
    if state is None:
        return None
    ops = [{"name": g, "qubits": [0], "params": []} for g, _ in PREP[state]] + [{"name": gate, "qubits": [0], "params": []}]
    before = run_circuit(1, ops[:-1], shots=1, include_steps=False)
    after = run_circuit(1, ops, shots=1, include_steps=False)
    b0, b1 = before["bloch"][0], after["bloch"][0]
    spec = GATES[gate]
    return (
        f"Applying **{spec.label}** to {before['analysis']['name']} gives **{after['analysis']['name']}**"
        f" = {after['analysis']['ket']}.\n\n"
        f"- {spec.description}\n"
        f"- Probabilities: P(0) = {1 - b1['p1']:.2f}, P(1) = {b1['p1']:.2f}.\n"
        f"- On the Bloch sphere the arrow moves from (x={b0['x']:.2f}, y={b0['y']:.2f}, z={b0['z']:.2f}) "
        f"to (x={b1['x']:.2f}, y={b1['y']:.2f}, z={b1['z']:.2f}).\n\n"
        "Try it in the **3D Lab** to watch the rotation animate."
    )


def offline_answer(question: str, circuit: dict | None, result: dict | None, lesson: dict | None, challenge: dict | None) -> str:
    q = question.lower()
    concepts = find_concepts(question)
    parts: list[str] = []

    if challenge and any(w in q for w in ("hint", "stuck", "help", "how do i", "challenge", "solve")):
        parts.append(f"**Hint for “{challenge['title']}”:** {challenge['hint']}")
        if result:
            parts.append(f"Right now your circuit prepares {result['analysis']['ket']} — compare it with the target {challenge['target_label']}.")
        return "\n\n".join(parts)

    direct = _gate_on_state(question)
    if direct:
        return direct

    circuit_words = ("my circuit", "this circuit", "the circuit", "my state", "this state", "my qubit", "result",
                     "output", "histogram", "wrong", "debug", "gates i applied", "step by step")
    about_circuit = bool(circuit and circuit.get("operations")) and (
        any(w in q for w in circuit_words)
        or (not concepts and any(w in q for w in ("explain", "what happen", "why", "what is going on")))
        or not concepts
    )
    if about_circuit and result:
        a = result["analysis"]
        parts.append(f"Your circuit prepares **{a['name']}** — {a['description']}.")
        parts.append(f"State before measurement: `{a['ket']}`")
        story = _gate_story(circuit)
        if story:
            parts.append("**Step by step:**\n" + "\n".join(story))
        probs = sorted(result["probabilities"].items(), key=lambda kv: -kv[1])[:6]
        parts.append("**Outcomes:** " + ", ".join(f"|{k}⟩ → {v * 100:.1f}%" for k, v in probs) + ".")
        if result["entanglement"]["entangled"]:
            qs = ", ".join(f"q{x}" for x in result["entanglement"]["qubits"])
            parts.append(
                f"Qubits {qs} are **entangled**: on their own their Bloch arrows shrink inside the sphere, because only the *joint* state is well defined."
            )
        if any(w in q for w in ("wrong", "debug", "why")) and result.get("warnings"):
            parts.append("**Things to check:** " + " ".join(result["warnings"]))
        parts.append("Tip: drag the step slider under the results to watch the state evolve gate by gate.")
        if concepts:
            parts.append(CONCEPTS[concepts[0]]["text"])
        return "\n\n".join(parts)

    if concepts:
        for c in concepts[:2]:
            parts.append(CONCEPTS[c]["text"])
        lesson_id = CONCEPTS[concepts[0]].get("lesson")
        if lesson_id:
            l = get_lesson(lesson_id)
            if l:
                parts.append(f"📘 Want more? Open the lesson **{l['title']}** in *Learn*.")
        return "\n\n".join(parts)

    if lesson:
        parts.append(f"We're on **{lesson['title']}** — {lesson['summary']}")
    parts.append(
        "I'm Q-Bot, running in offline mode. I can explain concepts (superposition, the Bloch sphere, gates, measurement, "
        "entanglement, interference, Grover, Deutsch–Jozsa…), walk through **your current circuit and its results**, "
        "or answer things like *“What happens when I apply H to |0⟩?”*."
    )
    parts.append("Add an OpenAI or Gemini API key in `.env` to unlock free-form answers.")
    return "\n\n".join(parts)


# -------------------------------------------------------------------- LLM providers
def _post_json(url: str, payload: dict, headers: dict) -> dict:
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json", **headers})
    with urllib.request.urlopen(req, timeout=settings.ai_timeout) as resp:  # noqa: S310 - fixed https endpoints
        return json.loads(resp.read().decode())


def _openai(messages: list[dict]) -> str:
    data = _post_json(
        settings.openai_base_url.rstrip("/") + "/chat/completions",
        {"model": settings.openai_model, "messages": messages, "temperature": 0.3, "max_tokens": 600},
        {"Authorization": f"Bearer {settings.openai_api_key}"},
    )
    return data["choices"][0]["message"]["content"].strip()


def _gemini(messages: list[dict]) -> str:
    system = "\n\n".join(m["content"] for m in messages if m["role"] == "system")
    contents = [
        {"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]}
        for m in messages
        if m["role"] != "system"
    ]
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent"
    data = _post_json(
        url,
        {"systemInstruction": {"parts": [{"text": system}]}, "contents": contents, "generationConfig": {"temperature": 0.3, "maxOutputTokens": 800}},
        {"x-goog-api-key": settings.gemini_api_key},
    )
    return "".join(p.get("text", "") for p in data["candidates"][0]["content"]["parts"]).strip()


def active_provider() -> str:
    p = settings.ai_provider.lower()
    if p == "openai" or (p == "auto" and settings.openai_api_key):
        return "openai" if settings.openai_api_key or "localhost" in settings.openai_base_url else "offline"
    if p == "gemini" or (p == "auto" and settings.gemini_api_key):
        return "gemini" if settings.gemini_api_key else "offline"
    return "offline"


def suggestions(circuit: dict | None, result: dict | None, concepts: list[str]) -> list[str]:
    out = []
    if circuit and circuit.get("operations"):
        out.append("Explain my circuit step by step")
        if result and result["entanglement"]["entangled"]:
            out.append("Why are my qubits entangled?")
        else:
            out.append("How could I entangle these qubits?")
    else:
        out.append("What happens when I apply H to |0⟩?")
    related = {"superposition": "What is interference?", "entanglement": "Can entanglement send messages?", "bloch": "What do θ and φ mean?"}
    for c in concepts:
        if c in related:
            out.append(related[c])
    out.append("What is measurement?")
    seen, uniq = set(), []
    for s in out:
        if s not in seen:
            seen.add(s)
            uniq.append(s)
    return uniq[:3]


def ask(question: str, circuit: dict | None = None, result: dict | None = None, history: list[dict] | None = None,
        lesson_id: str | None = None, challenge_id: str | None = None) -> dict[str, Any]:
    lesson = get_lesson(lesson_id) if lesson_id else None
    challenge = get_challenge(challenge_id) if challenge_id else None
    result, facts = simulation_facts(circuit, result)
    concepts = find_concepts(question)
    provider = active_provider()
    notice = None

    if provider != "offline":
        context = ["SIMULATION FACTS (authoritative):", *(f"- {f}" for f in facts)] if facts else ["No circuit is loaded."]
        if lesson:
            context.append(f"The student is studying the lesson '{lesson['title']}': {lesson['summary']}")
        if challenge:
            context.append(
                f"The student is attempting challenge '{challenge['title']}': {challenge['description']} "
                f"Give hints, not the full answer. Official hint: {challenge['hint']}"
            )
        if concepts:
            context.append("VALIDATED REFERENCE NOTES:\n" + "\n".join(CONCEPTS[c]["text"] for c in concepts[:3]))
        messages = [{"role": "system", "content": SYSTEM_PROMPT + "\n\n" + "\n".join(context)}]
        for h in (history or [])[-8:]:
            if h.get("role") in ("user", "assistant") and h.get("content"):
                messages.append({"role": h["role"], "content": str(h["content"])[:2000]})
        messages.append({"role": "user", "content": question})
        try:
            answer = _openai(messages) if provider == "openai" else _gemini(messages)
            return {"answer": answer, "provider": provider, "facts": facts, "suggestions": suggestions(circuit, result, concepts)}
        except (urllib.error.URLError, KeyError, IndexError, TimeoutError, ValueError) as exc:
            log.warning("AI provider %s failed, falling back to offline tutor: %s", provider, exc)
            notice = f"The {provider} API could not be reached, so the offline tutor answered."

    answer = offline_answer(question, circuit, result, lesson, challenge)
    return {
        "answer": answer,
        "provider": "offline",
        "facts": facts,
        "suggestions": suggestions(circuit, result, concepts),
        "notice": notice,
    }
