"""Blockchain engine: real SHA-256 hash chains, proof-of-work mining, Merkle trees and the 51% attack race.

Everything is computed for real (hashlib); difficulty is capped so mining in the browser lab stays
around a second at most.
"""
from __future__ import annotations

import hashlib
import json
import math
import random
import time

GENESIS_PREV = "0" * 64
MAX_DIFFICULTY = 4
MAX_ATTEMPTS = 3_000_000


def sha(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()


def block_hash(index: int, prev: str, data: str, nonce: int) -> str:
    return sha(f"{index}|{prev}|{data}|{nonce}")


def mine(index: int, prev: str, data: str, difficulty: int, start: int = 0) -> dict:
    target = "0" * difficulty
    t0 = time.perf_counter()
    nonce = start
    tries = 0
    while tries < MAX_ATTEMPTS:
        h = block_hash(index, prev, data, nonce)
        tries += 1
        if h.startswith(target):
            return {"nonce": nonce, "hash": h, "attempts": tries, "seconds": round(time.perf_counter() - t0, 3), "found": True}
        nonce += 1
    return {"nonce": nonce, "hash": h, "attempts": tries, "seconds": round(time.perf_counter() - t0, 3), "found": False}


DEFAULT_DATA = ["Genesis: Q-3D Learn chain", "Aarav pays Diya 5 coins", "Diya pays Kabir 2 coins", "Kabir pays Meera 1 coin"]


def chain_lab(blocks: list[dict] | None = None, difficulty: int = 3, mine_index: int | None = None, mine_all: bool = False) -> dict:
    """Recompute a chain. Blocks: [{data, nonce}]. Optionally mine one block (or all) at the given difficulty."""
    difficulty = max(1, min(MAX_DIFFICULTY, int(difficulty)))
    if not blocks:
        blocks = [{"data": d, "nonce": 0} for d in DEFAULT_DATA]
        mine_all = True
    blocks = [{"data": str(b.get("data", ""))[:200], "nonce": int(b.get("nonce", 0))} for b in blocks[:8]]
    out, prev, mined = [], GENESIS_PREV, []
    broken = False
    for i, b in enumerate(blocks):
        if mine_all or mine_index == i:
            m = mine(i, prev, b["data"], difficulty)
            b["nonce"] = m["nonce"]
            mined.append({"index": i, **m})
        h = block_hash(i, prev, b["data"], b["nonce"])
        pow_ok = h.startswith("0" * difficulty)
        valid = pow_ok and not broken
        if not valid:
            broken = True  # everything after an invalid block is untrustworthy
        out.append({"index": i, "data": b["data"], "nonce": b["nonce"], "prev": prev, "hash": h, "pow_ok": pow_ok, "valid": valid})
        prev = h
    expected = 16 ** difficulty
    return {"difficulty": difficulty, "target": "0" * difficulty + "…", "blocks": out, "mined": mined,
            "valid": all(b["valid"] for b in out), "expected_attempts": expected,
            "first_invalid": next((b["index"] for b in out if not b["valid"]), None)}


# ------------------------------------------------------------------ Merkle trees
DEFAULT_TXS = ["Aarav→Diya 5", "Diya→Kabir 2", "Kabir→Meera 1", "Meera→Rohan 3", "Rohan→Saanvi 4", "Saanvi→Vihaan 1", "Vihaan→Ishita 2", "Ishita→Arjun 6"]


def merkle_levels(txs: list[str]) -> list[list[str]]:
    level = [sha(t) for t in txs]
    levels = [level]
    while len(level) > 1:
        if len(level) % 2:
            level = level + [level[-1]]  # Bitcoin-style: duplicate the last hash
            levels[-1] = level
        level = [sha(level[i] + level[i + 1]) for i in range(0, len(level), 2)]
        levels.append(level)
    return levels


def merkle_lab(transactions: list[str] | None = None, prove: int = 2, tamper: int | None = None, tamper_text: str = "Kabir→Meera 100") -> dict:
    txs = [str(t)[:80] for t in (transactions or DEFAULT_TXS)][:16]
    if len(txs) < 2:
        raise ValueError("need at least 2 transactions")
    levels = merkle_levels(txs)
    root = levels[-1][0]
    prove = max(0, min(len(txs) - 1, int(prove)))
    proof, idx = [], prove
    for lvl in levels[:-1]:
        sib = idx ^ 1
        proof.append({"hash": lvl[sib], "side": "left" if sib < idx else "right"})
        idx //= 2
    # verify the proof like a light client would
    h = sha(txs[prove])
    for p in proof:
        h = sha(p["hash"] + h) if p["side"] == "left" else sha(h + p["hash"])
    out = {"transactions": txs, "levels": levels, "root": root, "prove": prove, "proof": proof, "proof_valid": h == root,
           "proof_size": len(proof), "naive_size": len(txs)}
    if tamper is not None:
        t = max(0, min(len(txs) - 1, int(tamper)))
        bad = txs[:]
        bad[t] = str(tamper_text)[:80]
        bl = merkle_levels(bad)
        changed = [[i for i, (a, b) in enumerate(zip(la, lb)) if a != b] for la, lb in zip(levels, bl)]
        out["tamper"] = {"index": t, "text": bad[t], "levels": bl, "root": bl[-1][0], "changed": changed, "root_changed": bl[-1][0] != root}
    return out


# ------------------------------------------------------------------ 51% attack (Nakamoto, Bitcoin whitepaper §11)
def nakamoto(q: float, z: int) -> float:
    """Probability an attacker with hash share q ever catches up from z blocks behind."""
    p = 1 - q
    if q >= p:
        return 1.0
    lam = z * (q / p)
    s = 1.0
    for k in range(z + 1):
        poisson = math.exp(-lam) * lam ** k / math.factorial(k)
        s -= poisson * (1 - (q / p) ** (z - k))
    return max(0.0, min(1.0, s))


def attack_lab(q: float = 0.3, z: int = 6, races: int = 300, horizon: int = 60, seed: int = 1) -> dict:
    q = max(0.01, min(0.6, float(q)))
    z = max(0, min(30, int(z)))
    races = max(10, min(2000, int(races)))
    rng = random.Random(seed)
    wins, sample_paths = 0, []
    for r in range(races):
        # phase 1: the merchant waits for z honest confirmations while the attacker mines in secret
        honest = attacker = 0
        path = [0]
        while honest < z:
            if rng.random() < q:
                attacker += 1
            else:
                honest += 1
            path.append(attacker - honest)
        lead = attacker - honest
        # phase 2: the attacker keeps mining; catching up (lead >= 0) lets them publish the longer chain
        won = lead >= 0 if z else True
        steps = 0
        while not won and lead > -z - 30 and steps < horizon * 8:
            lead += 1 if rng.random() < q else -1
            steps += 1
            if len(path) < horizon:
                path.append(lead)
            won = lead >= 0
        wins += won
        # keep a readable mix for the chart: up to 24 failed and 16 successful races
        if (won and sum(p["won"] for p in sample_paths) < 16) or (not won and sum(not p["won"] for p in sample_paths) < 24):
            sample_paths.append({"path": path[:horizon], "won": won})
    curve = [{"z": k, "p": round(nakamoto(q, k), 6)} for k in range(0, 41)]
    safe_z = next((c["z"] for c in curve if c["p"] < 0.001), None)
    return {"q": q, "z": z, "probability": round(nakamoto(q, z), 6), "simulated": round(wins / races, 4), "races": races,
            "paths": sample_paths, "curve": curve, "confirmations_for_0_1pct": safe_z,
            "majority": q >= 0.5}


def to_json(x) -> str:
    return json.dumps(x)
