"""Blockchain labs added in v2.3: elliptic-curve keys & ECDSA on a tiny curve, and a smart-contract simulator
(an ERC-20-style token and the classic re-entrancy bug)."""
from __future__ import annotations

import hashlib
import json
from functools import lru_cache

# ---------------------------------------------------------------------------------------------- ECC
CURVES = {  # y² = x³ + a·x + b (mod p), chosen so the group order is prime (every point but ∞ generates it)
    "tiny": {"p": 97, "a": 0, "b": 7},
    "small": {"p": 211, "a": 0, "b": 7},
    "medium": {"p": 409, "a": 3, "b": 7},
}


def _inv(x: int, m: int) -> int:
    return pow(x % m, -1, m)


def _add(P, Q, a, p):
    if P is None:
        return Q
    if Q is None:
        return P
    if P[0] == Q[0] and (P[1] + Q[1]) % p == 0:
        return None
    if P == Q:
        lam = (3 * P[0] * P[0] + a) * _inv(2 * P[1], p) % p
    else:
        lam = (Q[1] - P[1]) * _inv(Q[0] - P[0], p) % p
    x = (lam * lam - P[0] - Q[0]) % p
    return (x, (lam * (P[0] - x) - P[1]) % p)


def _mul(k: int, P, a, p, trace: list | None = None):
    R, Q = None, P
    for i, bit in enumerate(bin(k)[2:][::-1]):
        if bit == "1":
            R = _add(R, Q, a, p)
            if trace is not None:
                trace.append({"step": f"add 2^{i}·G", "point": list(R) if R else None})
        Q = _add(Q, Q, a, p)
    return R


@lru_cache(maxsize=8)
def _curve(name: str):
    c = CURVES[name]
    p, a, b = c["p"], c["a"], c["b"]
    sq = {}
    for y in range(p):
        sq.setdefault(y * y % p, []).append(y)
    pts = [(x, y) for x in range(p) for y in sq.get((x ** 3 + a * x + b) % p, [])]
    order = len(pts) + 1
    G = min(pts, key=lambda q: (q[0] < 2, q))  # deterministic, avoids x = 0/1
    return p, a, b, tuple(pts), order, G


def _is_prime(n: int) -> bool:
    return n > 1 and all(n % d for d in range(2, int(n ** 0.5) + 1))


def _h(msg: str, n: int) -> int:
    return int(hashlib.sha256(msg.encode()).hexdigest(), 16) % n


def ecc_lab(curve: str = "small", private_key: int = 7, message: str = "Pay Kabir 5 coins", nonce: int = 11,
            reuse_nonce: bool = False, second_message: str = "Pay Diya 9 coins", add_a: int = 3, add_b: int = 10) -> dict:
    curve = curve if curve in CURVES else "small"
    p, a, b, pts, n, G = _curve(curve)
    d = int(private_key) % n or 1
    trace: list = []
    Q = _mul(d, G, a, p, trace)
    z = _h(message, n)
    k = int(nonce) % n or 1
    R = _mul(k, G, a, p)
    r = R[0] % n
    while r == 0:
        k = k % (n - 1) + 1
        R = _mul(k, G, a, p)
        r = R[0] % n
    s = _inv(k, n) * (z + r * d) % n
    # verification
    w = _inv(s, n) if s else 0
    u1, u2 = z * w % n, r * w % n
    X = _add(_mul(u1, G, a, p) if u1 else None, _mul(u2, Q, a, p) if u2 else None, a, p)
    valid = X is not None and X[0] % n == r
    # forged / tampered message check
    z_bad = _h(message + "0", n)
    Xb = _add(_mul(z_bad * w % n, G, a, p) if z_bad * w % n else None, _mul(u2, Q, a, p) if u2 else None, a, p)
    tampered_valid = Xb is not None and Xb[0] % n == r
    # nonce reuse → private key recovery
    recovery = None
    if reuse_nonce:
        z2 = _h(second_message, n)
        s2 = _inv(k, n) * (z2 + r * d) % n
        if (s - s2) % n and (z - z2) % n:
            k_rec = (z - z2) * _inv(s - s2, n) % n
            d_rec = (s * k_rec - z) * _inv(r, n) % n
            recovery = {"second_message": second_message, "z2": z2, "s2": s2, "k_recovered": k_rec, "d_recovered": d_rec, "success": d_rec == d}
    # point addition demo with the chord "line" wrapped mod p
    A = pts[int(add_a) % len(pts)]
    B = pts[int(add_b) % len(pts)]
    S = _add(A, B, a, p)
    if A == B:
        lam = (3 * A[0] * A[0] + a) * _inv(2 * A[1], p) % p if A[1] else None
    else:
        lam = (B[1] - A[1]) * _inv(B[0] - A[0], p) % p if A[0] != B[0] else None
    line = []
    if lam is not None:
        c0 = (A[1] - lam * A[0]) % p
        line = [[x, (lam * x + c0) % p] for x in range(p)]
    third = [S[0], (-S[1]) % p] if S else None
    address = "0x" + hashlib.sha256(f"{Q[0]},{Q[1]}".encode()).hexdigest()[-16:]
    return {
        "curve": curve, "equation": f"y² = x³ + {a}x + {b}  (mod {p})", "p": p, "a": a, "b": b, "order": n,
        "order_is_prime": _is_prime(n), "points": [list(q) for q in pts], "G": list(G),
        "private_key": d, "public_key": list(Q), "address": address, "keygen_trace": trace,
        "message": message, "hash": z, "nonce": k, "R": list(R), "signature": {"r": r, "s": s},
        "verify": {"w": w, "u1": u1, "u2": u2, "X": list(X) if X else None, "valid": valid},
        "tampered_valid": tampered_valid, "recovery": recovery,
        "addition": {"A": list(A), "B": list(B), "slope": lam, "line": line, "third": third, "sum": list(S) if S else None},
    }


# ---------------------------------------------------------------------------------------------- contracts
GAS = {"base": 21000, "sload": 2100, "sstore_new": 20000, "sstore": 5000, "call": 2600, "log": 1500}
DEFAULT_TXS = "mint divya 100\ntransfer divya kabir 30\ntransfer kabir diya 10\ntransfer diya kabir 50\napprove divya shop 20\ntransferFrom shop divya diya 15\nburn kabir 5"


def _root(state: dict) -> str:
    return hashlib.sha256(json.dumps(state, sort_keys=True).encode()).hexdigest()[:16]


def contract_sim(scenario: str = "token", transactions: str = DEFAULT_TXS, fixed: bool = False, bank_funds: int = 30,
                 attacker_deposit: int = 5, gas_limit: int = 300000) -> dict:
    if scenario == "token":
        bal: dict[str, int] = {}
        allow: dict[str, int] = {}
        supply = 0
        steps = []
        for raw in str(transactions).splitlines()[:20]:
            parts = raw.strip().split()
            if not parts:
                continue
            op, args = parts[0], parts[1:]
            gas, ok, msg, events = GAS["base"], True, "", []
            try:
                if op == "mint" and len(args) == 2:
                    who, amt = args[0], int(args[1])
                    gas += GAS["sstore_new"] if who not in bal else GAS["sstore"]
                    bal[who] = bal.get(who, 0) + amt
                    supply += amt
                    events.append({"from": "0x0", "to": who, "amount": amt})
                elif op == "transfer" and len(args) == 3:
                    src, dst, amt = args[0], args[1], int(args[2])
                    gas += GAS["sload"]
                    if bal.get(src, 0) < amt:
                        raise ValueError(f"revert: {src} has {bal.get(src, 0)}, needs {amt}")
                    gas += GAS["sstore"] + (GAS["sstore_new"] if dst not in bal else GAS["sstore"])
                    bal[src] -= amt
                    bal[dst] = bal.get(dst, 0) + amt
                    events.append({"from": src, "to": dst, "amount": amt})
                elif op == "approve" and len(args) == 3:
                    owner, spender, amt = args[0], args[1], int(args[2])
                    gas += GAS["sstore_new"]
                    allow[f"{owner}->{spender}"] = amt
                elif op == "transferFrom" and len(args) == 4:
                    spender, src, dst, amt = args[0], args[1], args[2], int(args[3])
                    key = f"{src}->{spender}"
                    gas += 2 * GAS["sload"]
                    if allow.get(key, 0) < amt:
                        raise ValueError(f"revert: allowance {allow.get(key, 0)} < {amt}")
                    if bal.get(src, 0) < amt:
                        raise ValueError(f"revert: {src} has {bal.get(src, 0)}, needs {amt}")
                    allow[key] -= amt
                    bal[src] -= amt
                    bal[dst] = bal.get(dst, 0) + amt
                    gas += 3 * GAS["sstore"]
                    events.append({"from": src, "to": dst, "amount": amt, "via": spender})
                elif op == "burn" and len(args) == 2:
                    who, amt = args[0], int(args[1])
                    if bal.get(who, 0) < amt:
                        raise ValueError(f"revert: {who} has {bal.get(who, 0)}, needs {amt}")
                    bal[who] -= amt
                    supply -= amt
                    gas += GAS["sstore"]
                    events.append({"from": who, "to": "0x0", "amount": amt})
                else:
                    raise ValueError(f"revert: unknown call '{raw.strip()}'")
                gas += GAS["log"] * len(events)
                msg = "ok"
            except ValueError as exc:
                ok, msg = False, str(exc)
            steps.append({"tx": raw.strip(), "ok": ok, "message": msg, "gas": gas, "events": events,
                          "balances": dict(bal), "allowances": dict(allow), "supply": supply, "state_root": _root({"b": bal, "a": allow})})
        invariant = all(s["supply"] == sum(s["balances"].values()) for s in steps)
        return {"scenario": "token", "steps": steps, "accounts": sorted(bal), "supply": supply, "invariant_holds": invariant,
                "total_gas": sum(s["gas"] for s in steps), "reverted": sum(not s["ok"] for s in steps)}

    # re-entrancy: Bank.withdraw() sends ETH to the caller; the attacker's fallback calls withdraw() again
    funds = int(min(500, max(1, bank_funds)))
    dep = int(min(100, max(1, attacker_deposit)))
    gas_limit = int(min(2_000_000, max(50_000, gas_limit)))
    balances = {"alice": funds * 2 // 3, "bob": funds - funds * 2 // 3, "attacker": dep}
    bank_eth = sum(balances.values())
    stolen, gas, frames = 0, GAS["base"], []
    depth, guard_hit = 0, False
    while True:
        frames.append({"depth": depth, "call": "Bank.withdraw()", "bank": bank_eth, "recorded": balances["attacker"], "stolen": stolen})
        gas += GAS["sload"] + GAS["call"]
        if fixed and depth > 0:
            guard_hit = True
            frames.append({"depth": depth, "call": "revert: balance already 0 (checks-effects-interactions)", "bank": bank_eth, "recorded": balances["attacker"], "stolen": stolen})
            break
        amount = balances["attacker"]
        if amount == 0 or bank_eth < amount or gas > gas_limit or depth >= 60:
            reason = "out of gas" if gas > gas_limit else "bank empty" if bank_eth < amount else "nothing to withdraw"
            frames.append({"depth": depth, "call": f"stop: {reason}", "bank": bank_eth, "recorded": balances["attacker"], "stolen": stolen})
            break
        if fixed:
            balances["attacker"] = 0  # effect BEFORE interaction
            gas += GAS["sstore"]
        bank_eth -= amount
        stolen += amount
        frames.append({"depth": depth, "call": f"send {amount} ETH → attacker.fallback()", "bank": bank_eth, "recorded": balances["attacker"], "stolen": stolen})
        depth += 1
    if not fixed:
        balances["attacker"] = 0  # the (too late) state update finally runs as the stack unwinds
    return {"scenario": "reentrancy", "fixed": bool(fixed), "frames": frames, "deposit": dep, "bank_start": sum([funds, dep]),
            "bank_end": bank_eth, "stolen": stolen, "profit": stolen - dep, "max_depth": depth, "gas_used": gas,
            "honest_users_lost": max(0, stolen - dep), "guard_hit": guard_hit}
