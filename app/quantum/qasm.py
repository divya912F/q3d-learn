"""OpenQASM 2.0 import/export and Qiskit code generation for the code editor."""
from __future__ import annotations

import ast
import math
import re

from .gates import GATES
from .validation import CircuitError, validate_circuit


def _fmt_param(p: float) -> str:
    """Pretty-print angles as multiples of pi where possible."""
    for den in (1, 2, 3, 4, 6, 8, 16):
        num = p * den / math.pi
        if abs(num - round(num)) < 1e-9 and round(num) != 0:
            n = int(round(num))
            top = "pi" if n == 1 else "-pi" if n == -1 else f"{n}*pi"
            return top if den == 1 else f"{top}/{den}"
    if abs(p) < 1e-12:
        return "0"
    return f"{p:.10g}"


def to_qasm(num_qubits: int, ops: list[dict]) -> str:
    lines = [
        "OPENQASM 2.0;",
        'include "qelib1.inc";',
        f"qreg q[{num_qubits}];",
        f"creg c[{num_qubits}];",
    ]
    for op in ops:
        name, qs, ps = op["name"], op["qubits"], op.get("params", [])
        if name == "measure":
            lines.append(f"measure q[{qs[0]}] -> c[{qs[0]}];")
        elif name == "barrier":
            lines.append(f"barrier {', '.join(f'q[{q}]' for q in range(num_qubits))};")
        else:
            pstr = f"({', '.join(_fmt_param(p) for p in ps)})" if ps else ""
            lines.append(f"{name}{pstr} {', '.join(f'q[{q}]' for q in qs)};")
    return "\n".join(lines) + "\n"


def to_qiskit_code(num_qubits: int, ops: list[dict]) -> str:
    lines = [
        "from qiskit import QuantumCircuit, transpile",
        "from qiskit_aer import AerSimulator",
        "from math import pi",
        "",
        f"qc = QuantumCircuit({num_qubits}, {num_qubits})",
    ]
    for op in ops:
        name, qs, ps = op["name"], op["qubits"], op.get("params", [])
        if name == "measure":
            lines.append(f"qc.measure({qs[0]}, {qs[0]})")
        elif name == "barrier":
            lines.append("qc.barrier()")
        else:
            args = [_fmt_param(p) for p in ps] + [str(q) for q in qs]
            lines.append(f"qc.{name}({', '.join(args)})")
    if not any(op["name"] == "measure" for op in ops):
        lines.append(f"qc.measure(range({num_qubits}), range({num_qubits}))")
    lines += [
        "",
        "sim = AerSimulator()",
        "counts = sim.run(transpile(qc, sim), shots=1024).result().get_counts()",
        "print(qc.draw())",
        "print(counts)",
    ]
    return "\n".join(lines) + "\n"


_BIN = {ast.Add: lambda a, b: a + b, ast.Sub: lambda a, b: a - b, ast.Mult: lambda a, b: a * b, ast.Div: lambda a, b: a / b}


def _eval_param(expr: str) -> float:
    """Evaluate angle expressions such as ``pi/4`` or ``-3*pi/2`` without using eval()."""
    expr = expr.strip().replace("π", "pi")
    if len(expr) > 64:
        raise ValueError(f"Parameter expression too long: '{expr[:20]}…'")

    def ev(node: ast.AST) -> float:
        if isinstance(node, ast.Expression):
            return ev(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return float(node.value)
        if isinstance(node, ast.Name) and node.id == "pi":
            return math.pi
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.USub, ast.UAdd)):
            v = ev(node.operand)
            return -v if isinstance(node.op, ast.USub) else v
        if isinstance(node, ast.BinOp) and type(node.op) in _BIN:
            return _BIN[type(node.op)](ev(node.left), ev(node.right))
        raise ValueError(f"Unsupported parameter expression '{expr}'")

    try:
        return float(ev(ast.parse(expr, mode="eval")))
    except (SyntaxError, ZeroDivisionError) as exc:
        raise ValueError(f"Invalid parameter expression '{expr}'") from exc


_LINE = re.compile(r"^(?P<name>[a-z_][a-z0-9_]*)\s*(\((?P<params>[^)]*)\))?\s+(?P<args>.+)$", re.I)
_QREF = re.compile(r"^(?P<reg>[a-z_][a-z0-9_]*)\s*\[\s*(?P<idx>\d+)\s*\]$", re.I)

_ALIASES = {"cnot": "cx", "u1": "p", "toffoli": "ccx", "i": "id"}


def from_qasm(source: str) -> dict:
    """Parse a practical subset of OpenQASM 2.0 (one quantum register)."""
    text = re.sub(r"//[^\n]*", "", source)
    statements = [s.strip() for s in text.replace("\n", " ").split(";") if s.strip()]
    num_qubits = None
    qreg_name = None
    ops: list[dict] = []
    errors: list[str] = []

    for st in statements:
        low = st.lower()
        if low.startswith("openqasm") or low.startswith("include") or low.startswith("creg"):
            continue
        if low.startswith("qreg"):
            m = re.match(r"qreg\s+([a-z_][a-z0-9_]*)\s*\[\s*(\d+)\s*\]", st, re.I)
            if not m:
                errors.append(f"Could not parse register declaration: '{st}'")
                continue
            if qreg_name is not None:
                errors.append("Only a single quantum register is supported.")
                continue
            qreg_name, num_qubits = m.group(1), int(m.group(2))
            continue
        if low.startswith("measure"):
            m = re.match(r"measure\s+(.+?)\s*->\s*(.+)$", st, re.I)
            if not m:
                errors.append(f"Could not parse measurement: '{st}'")
                continue
            q = _QREF.match(m.group(1).strip())
            if q:
                ops.append({"name": "measure", "qubits": [int(q.group("idx"))], "params": []})
            elif num_qubits is not None:  # measure q -> c;
                ops += [{"name": "measure", "qubits": [i], "params": []} for i in range(num_qubits)]
            continue
        if low.startswith("barrier"):
            ops.append({"name": "barrier", "qubits": [], "params": []})
            continue
        m = _LINE.match(st)
        if not m:
            errors.append(f"Could not parse statement: '{st}'")
            continue
        name = _ALIASES.get(m.group("name").lower(), m.group("name").lower())
        if name not in GATES:
            errors.append(f"Unsupported gate '{name}'")
            continue
        try:
            params = [_eval_param(p) for p in m.group("params").split(",")] if m.group("params") else []
        except Exception as exc:
            errors.append(str(exc))
            continue
        qubits = []
        for a in m.group("args").split(","):
            q = _QREF.match(a.strip())
            if not q:
                errors.append(f"Bad qubit reference '{a.strip()}' in '{st}'")
                break
            qubits.append(int(q.group("idx")))
        else:
            ops.append({"name": name, "qubits": qubits, "params": params})

    if num_qubits is None:
        errors.append("Missing 'qreg q[n];' declaration.")
    if errors:
        raise CircuitError(errors)
    for op in ops:
        if op["name"] == "barrier":
            op["qubits"] = []
    validate_circuit(num_qubits, ops)
    return {"num_qubits": num_qubits, "operations": ops}
