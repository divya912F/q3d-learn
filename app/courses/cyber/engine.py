"""Cybersecurity & cryptography engine (educational, defensive).

* classical ciphers (Caesar, Vigenère, Atbash, XOR) with frequency analysis and automatic cracking
  (χ² against English letter frequencies; index of coincidence to estimate a Vigenère key length)
* hashing with the avalanche effect (hashlib) and password strength / crack-time estimates
* textbook RSA (small primes, extended Euclid, square-and-multiply trace) and Diffie–Hellman

Small numbers are used on purpose so every step is visible — real systems use 2048-bit keys,
padding (OAEP) and vetted libraries.
"""
from __future__ import annotations

import hashlib
import math
import re
import string

ENGLISH = {  # relative letter frequencies (%)
    "a": 8.17, "b": 1.49, "c": 2.78, "d": 4.25, "e": 12.70, "f": 2.23, "g": 2.02, "h": 6.09, "i": 6.97, "j": 0.15,
    "k": 0.77, "l": 4.03, "m": 2.41, "n": 6.75, "o": 7.51, "p": 1.93, "q": 0.10, "r": 5.99, "s": 6.33, "t": 9.06,
    "u": 2.76, "v": 0.98, "w": 2.36, "x": 0.15, "y": 1.97, "z": 0.07,
}
ALPHA = string.ascii_lowercase
MAX_TEXT = 2000


def _clip(text: str) -> str:
    return str(text)[:MAX_TEXT]


def _shift_char(ch: str, k: int) -> str:
    if ch.isalpha() and ch.isascii():
        base = ord("A") if ch.isupper() else ord("a")
        return chr((ord(ch) - base + k) % 26 + base)
    return ch


def caesar(text: str, shift: int) -> str:
    return "".join(_shift_char(c, shift) for c in text)


def vigenere(text: str, key: str, decrypt: bool = False) -> str:
    key = [ord(c) - 97 for c in key.lower() if c in ALPHA] or [0]
    out, j = [], 0
    for c in text:
        if c.isalpha() and c.isascii():
            k = key[j % len(key)]
            out.append(_shift_char(c, -k if decrypt else k))
            j += 1
        else:
            out.append(c)
    return "".join(out)


def atbash(text: str) -> str:
    return "".join((chr(ord("z") - (ord(c) - ord("a"))) if c.islower() else chr(ord("Z") - (ord(c) - ord("A")))) if c.isalpha() and c.isascii() else c for c in text)


def xor_hex(text: str, key: str) -> tuple[str, list[int]]:
    kb = key.encode() or b"\x00"
    data = text.encode()
    out = bytes(b ^ kb[i % len(kb)] for i, b in enumerate(data))
    return out.hex(), list(out)


def frequencies(text: str) -> dict[str, float]:
    letters = [c for c in text.lower() if c in ALPHA]
    n = len(letters) or 1
    return {a: round(100 * letters.count(a) / n, 2) for a in ALPHA}


def chi2(text: str) -> float:
    letters = [c for c in text.lower() if c in ALPHA]
    n = len(letters)
    if not n:
        return float("inf")
    return sum((letters.count(a) - n * ENGLISH[a] / 100) ** 2 / (n * ENGLISH[a] / 100) for a in ALPHA)


def index_of_coincidence(letters: str) -> float:
    n = len(letters)
    if n < 2:
        return 0.0
    return sum(letters.count(a) * (letters.count(a) - 1) for a in ALPHA) / (n * (n - 1))


def crack_caesar(ciphertext: str) -> dict:
    scores = [round(chi2(caesar(ciphertext, -s)), 2) for s in range(26)]
    best = min(range(26), key=lambda s: scores[s])
    return {"shift": best, "plaintext": caesar(ciphertext, -best), "chi2": scores}


def crack_vigenere(ciphertext: str, max_len: int = 10) -> dict:
    letters = "".join(c for c in ciphertext.lower() if c in ALPHA)
    ics = []
    for L in range(1, max_len + 1):
        cols = ["".join(letters[i::L]) for i in range(L)]
        ics.append(round(sum(index_of_coincidence(c) for c in cols) / L, 4))
    # pick the shortest length whose IC looks English-like (≈0.066 vs ≈0.038 random)
    top = max(ics)
    cand = [L for L in range(1, max_len + 1) if ics[L - 1] > 0.058 and ics[L - 1] >= 0.92 * top]
    L = cand[0] if cand else max(range(1, max_len + 1), key=lambda k: ics[k - 1])
    key = ""
    eng = [ENGLISH[a] for a in ALPHA]
    for i in range(L):
        col = letters[i::L]
        counts = [col.count(a) for a in ALPHA]
        # correlate the column's letter counts with English shifted by s (robust for short columns)
        best = max(range(26), key=lambda s: sum(counts[(j + s) % 26] * eng[j] for j in range(26)))
        key += ALPHA[best]
    return {"key_length": L, "key": key, "plaintext": vigenere(ciphertext, key, decrypt=True), "ic": ics}


def cipher_lab(cipher: str = "caesar", text: str = "Meet me at the library after the quantum lecture", key: str = "3",
               mode: str = "encrypt") -> dict:
    text = _clip(text)
    out: dict = {"cipher": cipher, "mode": mode, "input": text}
    if cipher == "caesar":
        try:
            k = int(key) % 26
        except ValueError:
            k = 3
        res = caesar(text, -k if mode == "decrypt" else k)
        out |= {"output": res, "key": k, "crack": crack_caesar(res if mode == "encrypt" else text)}
    elif cipher == "vigenere":
        k = "".join(c for c in str(key).lower() if c in ALPHA) or "key"
        res = vigenere(text, k, decrypt=mode == "decrypt")
        ct = res if mode == "encrypt" else text
        out |= {"output": res, "key": k, "crack": crack_vigenere(ct) if len([c for c in ct if c.isalpha()]) >= 40 else None}
    elif cipher == "atbash":
        out |= {"output": atbash(text), "key": "—"}
    elif cipher == "xor":
        hx, raw = xor_hex(text, str(key) or "k")
        out |= {"output": hx, "bytes": raw[:64], "key": str(key) or "k"}
    else:
        raise ValueError("unknown cipher")
    out["freq_in"] = frequencies(text)
    out["freq_out"] = frequencies(out["output"]) if cipher != "xor" else None
    out["english"] = ENGLISH
    return out


# ------------------------------------------------------------------ hashing
HASHES = {"sha256": hashlib.sha256, "sha1": hashlib.sha1, "md5": hashlib.md5}


def _bits(hexdigest: str) -> list[int]:
    return [int(b) for b in bin(int(hexdigest, 16))[2:].zfill(len(hexdigest) * 4)]


def hash_lab(text: str = "Q-3D Learn", compare: str | None = None, algorithm: str = "sha256") -> dict:
    if algorithm not in HASHES:
        raise ValueError("unknown hash")
    text = _clip(text)
    if compare is None:  # default: flip the last character's lowest bit
        compare = text[:-1] + chr(ord(text[-1]) ^ 1) if text else "a"
    compare = _clip(compare)
    h1, h2 = HASHES[algorithm](text.encode()).hexdigest(), HASHES[algorithm](compare.encode()).hexdigest()
    b1, b2 = _bits(h1), _bits(h2)
    diff = [int(a != b) for a, b in zip(b1, b2)]
    return {"algorithm": algorithm, "text": text, "compare": compare, "hash": h1, "hash2": h2, "bits": b1, "bits2": b2,
            "diff": diff, "changed": sum(diff), "total_bits": len(b1), "avalanche": round(sum(diff) / len(b1), 4),
            "broken": algorithm in ("md5", "sha1"),
            "note": "MD5 and SHA-1 have practical collision attacks — use SHA-256 or better (and bcrypt/Argon2 for passwords)."
            if algorithm != "sha256" else "SHA-256: no known practical collisions."}


COMMON = {"123456", "password", "123456789", "12345678", "12345", "qwerty", "abc123", "111111", "123123", "password1",
          "iloveyou", "admin", "welcome", "monkey", "dragon", "letmein", "football", "sunshine", "princess", "qwerty123",
          "india123", "cricket", "pass@123", "admin@123", "1234567890"}
WORDS = {"password", "love", "india", "cricket", "admin", "welcome", "dragon", "monkey", "secret", "hello", "summer", "winter",
         "student", "college", "quantum", "learn", "football", "pass", "qwerty", "letmein"}
LEET = str.maketrans("@4310$5!7", "aaeiossit")


def password_strength(password: str = "Tr0ub4dor&3") -> dict:
    pw = str(password)[:128]
    pools = [(r"[a-z]", 26, "lowercase"), (r"[A-Z]", 26, "uppercase"), (r"[0-9]", 10, "digits"), (r"[^a-zA-Z0-9]", 33, "symbols")]
    used = [(size, name) for pat, size, name in pools if re.search(pat, pw)]
    charset = sum(s for s, _ in used) or 1
    entropy = len(pw) * math.log2(charset) if pw else 0.0
    warnings = []
    low = pw.lower()
    if low in COMMON or low.translate(LEET) in COMMON:
        warnings.append("This is one of the most common passwords — attackers try it first.")
        entropy = min(entropy, 10.0)
    found = [w for w in WORDS if w in low.translate(LEET)]
    if found:
        warnings.append(f"Contains a dictionary word ({found[0]}) — dictionary attacks guess these quickly.")
        entropy *= 0.6
    if re.search(r"(.)\1\1", pw):
        warnings.append("Repeated characters (like “aaa”) add almost no strength.")
        entropy *= 0.85
    if re.search(r"(0123|1234|2345|3456|4567|5678|6789|abcd|qwer|asdf)", low):
        warnings.append("Keyboard or number sequences are easy to guess.")
        entropy *= 0.8
    if len(pw) < 12:
        warnings.append("Use at least 12 characters — length beats complexity.")
    guesses = 2 ** entropy
    rates = {"online (100/s, rate-limited)": 1e2, "offline fast hash (10¹⁰/s GPU)": 1e10, "offline bcrypt (10⁴/s)": 1e4}
    times = {k: _human(guesses / 2 / v) for k, v in rates.items()}
    score = 0 if entropy < 28 else 1 if entropy < 36 else 2 if entropy < 60 else 3 if entropy < 80 else 4
    return {"length": len(pw), "charset": charset, "classes": [n for _, n in used], "entropy": round(entropy, 1),
            "score": score, "label": ["Very weak", "Weak", "Fair", "Strong", "Very strong"][score],
            "crack_times": times, "warnings": warnings, "common": low in COMMON}


def _human(seconds: float) -> str:
    if seconds < 1:
        return "instantly"
    units = [(60, "seconds"), (60, "minutes"), (24, "hours"), (365, "days"), (100, "years"), (10, "centuries")]
    v = seconds
    for size, name in units:
        if v < size:
            return f"{v:.0f} {name}"
        v /= size
    return "longer than the age of the universe" if v > 1e7 else f"{v * 1000:.0f} years"


# ------------------------------------------------------------------ RSA & Diffie–Hellman
def is_prime(n: int) -> bool:
    if n < 2:
        return False
    if n % 2 == 0:
        return n == 2
    r = int(math.isqrt(n))
    return all(n % d for d in range(3, r + 1, 2))


def egcd_trace(a: int, b: int) -> tuple[int, int, int, list[dict]]:
    steps = []
    old_r, r = a, b
    old_s, s = 1, 0
    old_t, t = 0, 1
    while r:
        q = old_r // r
        steps.append({"q": q, "r": r, "s": s, "t": t})
        old_r, r = r, old_r - q * r
        old_s, s = s, old_s - q * s
        old_t, t = t, old_t - q * t
    return old_r, old_s, old_t, steps


def modpow_trace(base: int, exp: int, mod: int) -> tuple[int, list[dict]]:
    result, b, steps = 1, base % mod, []
    for bit in bin(exp)[2:][::-1]:
        if bit == "1":
            result = result * b % mod
        steps.append({"bit": int(bit), "square": b, "result": result})
        b = b * b % mod
    return result, steps


def rsa_lab(p: int = 61, q: int = 53, e: int = 17, message: str = "HI") -> dict:
    p, q, e = int(p), int(q), int(e)
    if not (is_prime(p) and is_prime(q)):
        raise ValueError("p and q must both be prime")
    if p == q:
        raise ValueError("p and q must be different")
    if p * q > 10_000_000:
        raise ValueError("keep p·q below 10,000,000 so every step stays readable")
    n, phi = p * q, (p - 1) * (q - 1)
    g, x, _, steps = egcd_trace(e, phi)
    if g != 1:
        raise ValueError(f"e = {e} shares a factor with φ(n) = {phi}; choose e coprime to φ(n) (e.g. 3, 5, 17, 65537)")
    d = x % phi
    message = str(message)[:24]
    blocks = []
    for ch in message:
        m = ord(ch)
        if m >= n:
            raise ValueError("n is too small for this message — use bigger primes")
        c, trace = modpow_trace(m, e, n)
        m2, _ = modpow_trace(c, d, n)
        blocks.append({"char": ch, "m": m, "c": c, "decrypted": m2, "trace": trace})
    sig_hash = int(hashlib.sha256(message.encode()).hexdigest(), 16) % n
    signature = pow(sig_hash, d, n)
    return {"p": p, "q": q, "n": n, "phi": phi, "e": e, "d": d, "public": [e, n], "private": [d, n], "euclid": steps,
            "check": (e * d) % phi, "blocks": blocks, "ciphertext": [b["c"] for b in blocks],
            "plaintext": "".join(chr(b["decrypted"]) for b in blocks),
            "signature": {"hash_mod_n": sig_hash, "signature": signature, "verified": pow(signature, e, n) == sig_hash},
            "bits": n.bit_length()}


def dh_lab(p: int = 23, g: int = 5, a: int = 6, b: int = 15) -> dict:
    p, g, a, b = int(p), int(g), int(a), int(b)
    if not is_prime(p) or p > 1_000_003:
        raise ValueError("p must be a prime ≤ 1,000,003")
    A, B = pow(g, a, p), pow(g, b, p)
    s1, s2 = pow(B, a, p), pow(A, b, p)
    order = next(k for k in range(1, p) if pow(g, k, p) == 1)
    return {"p": p, "g": g, "a": a, "b": b, "A": A, "B": B, "secret_alice": s1, "secret_bob": s2, "match": s1 == s2,
            "generator": order == p - 1, "order": order}
