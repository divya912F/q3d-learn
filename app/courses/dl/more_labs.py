"""Deep-learning labs added in v2.3: a 2-D diffusion model (exact denoiser) and a word-embedding space."""
from __future__ import annotations

import math

import numpy as np

SHAPES = ["spiral", "heart", "star", "rings", "moons", "smiley"]


def _shape(name: str, m: int, rng) -> np.ndarray:
    t = rng.uniform(0, 1, m)
    if name == "spiral":
        arm = rng.integers(0, 2, m)
        a = t * 3.2 * math.pi
        r = 0.15 + 0.8 * t
        P = np.c_[r * np.cos(a + arm * math.pi), r * np.sin(a + arm * math.pi)]
    elif name == "heart":
        a = t * 2 * math.pi
        P = np.c_[16 * np.sin(a) ** 3, 13 * np.cos(a) - 5 * np.cos(2 * a) - 2 * np.cos(3 * a) - np.cos(4 * a)] / 17
    elif name == "star":
        a = t * 2 * math.pi
        r = 0.45 + 0.45 * np.abs(np.cos(2.5 * a)) ** 3
        P = np.c_[r * np.sin(a), r * np.cos(a)]
    elif name == "rings":
        ring = rng.integers(0, 3, m)
        a = t * 2 * math.pi
        r = 0.3 + 0.32 * ring
        P = np.c_[r * np.cos(a), r * np.sin(a)]
    elif name == "moons":
        top = rng.random(m) < 0.5
        a = t * math.pi
        P = np.where(top[:, None], np.c_[np.cos(a) - 0.5, np.sin(a) - 0.25], np.c_[0.5 - np.cos(a), 0.25 - np.sin(a)]) * 0.8
    elif name == "smiley":
        part = rng.choice(4, m, p=[0.5, 0.12, 0.12, 0.26])
        a = t * 2 * math.pi
        face = np.c_[0.9 * np.cos(a), 0.9 * np.sin(a)]
        eyeL = np.c_[-0.32 + 0.1 * np.cos(a), 0.3 + 0.12 * np.sin(a)]
        eyeR = np.c_[0.32 + 0.1 * np.cos(a), 0.3 + 0.12 * np.sin(a)]
        b = math.pi * (1.15 + 0.7 * t)
        mouth = np.c_[0.5 * np.cos(b), 0.5 * np.sin(b) + 0.05]
        P = np.choose(part[:, None], [face, eyeL, eyeR, mouth])
    else:
        raise ValueError(f"unknown shape {name}")
    return P + rng.normal(0, 0.012, P.shape)


def diffusion(shape: str = "spiral", particles: int = 400, steps: int = 50, sampler: str = "ddpm",
              creativity: float = 0.05, seed: int = 3) -> dict:
    """Forward-noise a 2-D dataset, then generate new points by reverse diffusion.

    The denoiser here is *exact*: for a Gaussian-blurred empirical distribution, the best guess of the clean
    point E[x₀ | xₜ] is a softmax-weighted average of the data. A trained network learns an approximation of the
    same function. ``creativity`` adds kernel width so samples land *near* (not exactly on) training points."""
    rng = np.random.default_rng(int(seed))
    shape = shape if shape in SHAPES else "spiral"
    N = int(min(800, max(50, particles)))
    T = int(min(120, max(8, steps)))
    h2 = float(min(0.2, max(0.0, creativity))) ** 2
    data = _shape(shape, 700, rng)
    s = 0.008
    f = lambda t: math.cos((t / T + s) / (1 + s) * math.pi / 2) ** 2
    ab = np.array([f(t) / f(0) for t in range(T + 1)]).clip(1e-5, 1)

    def denoise(x: np.ndarray, t: int) -> np.ndarray:
        mu = math.sqrt(ab[t]) * data
        var = (1 - ab[t]) + ab[t] * h2 + 1e-6
        d2 = ((x[:, None, :] - mu[None, :, :]) ** 2).sum(-1)
        lw = -d2 / (2 * var)
        lw -= lw.max(1, keepdims=True)
        w = np.exp(lw)
        w /= w.sum(1, keepdims=True)
        return w @ data

    x = rng.normal(0, 1, (N, 2))
    frames = [np.round(x, 3).tolist()]
    keep = max(1, T // 40)
    for t in range(T, 0, -1):
        x0 = denoise(x, t)
        eps = (x - math.sqrt(ab[t]) * x0) / math.sqrt(max(1e-8, 1 - ab[t]))
        if sampler == "ddim":
            x = math.sqrt(ab[t - 1]) * x0 + math.sqrt(1 - ab[t - 1]) * eps
        else:
            beta = 1 - ab[t] / ab[t - 1]
            sig = math.sqrt(max(0.0, (1 - ab[t - 1]) / (1 - ab[t]) * beta))
            x = math.sqrt(ab[t - 1]) * x0 + math.sqrt(max(0.0, 1 - ab[t - 1] - sig ** 2)) * eps + sig * rng.normal(0, 1, x.shape)
        if (t - 1) % keep == 0 or t == 1:
            frames.append(np.round(x, 3).tolist())
    forward = []
    sub = data[:N]
    for t in np.linspace(0, T, 9).astype(int):
        forward.append({"t": int(t), "points": np.round(math.sqrt(ab[t]) * sub + math.sqrt(1 - ab[t]) * rng.normal(0, 1, sub.shape), 3).tolist()})
    d_near = np.sqrt(((x[:, None, :] - data[None, :, :]) ** 2).sum(-1)).min(1)
    return {
        "shape": shape, "particles": N, "steps": T, "sampler": sampler, "creativity": math.sqrt(h2),
        "data": np.round(data, 3).tolist(), "frames": frames, "forward": forward,
        "alpha_bar": np.round(ab, 4).tolist(), "mean_distance_to_data": round(float(d_near.mean()), 4),
        "on_shape_pct": round(float((d_near < 0.05).mean() * 100), 1),
    }


# --------------------------------------------------------------------------------------- embeddings
DIMS = ["person", "royal", "male", "female", "young", "animal", "pet", "wild", "food", "fruit", "sweet", "drink",
        "place", "country", "capital", "france", "india", "japan", "italy", "tech", "science", "verb", "fast"]
WORDS = {
    "king": "person royal male", "queen": "person royal female", "prince": "person royal male young", "princess": "person royal female young",
    "man": "person male", "woman": "person female", "boy": "person male young", "girl": "person female young",
    "father": "person male .5royal", "mother": "person female .5royal",
    "dog": "animal pet", "puppy": "animal pet young", "cat": "animal pet .3wild", "kitten": "animal pet young .3wild",
    "lion": "animal wild", "cub": "animal wild young", "tiger": "animal wild .2fast", "horse": "animal .4pet fast",
    "apple": "food fruit sweet", "mango": "food fruit sweet .5india", "banana": "food fruit sweet", "grape": "food fruit sweet .4drink",
    "bread": "food .3france", "pizza": "food italy", "sushi": "food japan", "biryani": "food india", "croissant": "food france sweet",
    "tea": "drink .6india", "coffee": "drink .4italy", "juice": "drink fruit sweet",
    "france": "place country france", "india": "place country india", "japan": "place country japan", "italy": "place country italy",
    "paris": "place capital france", "delhi": "place capital india", "tokyo": "place capital japan", "rome": "place capital italy",
    "computer": "tech", "laptop": "tech .4young", "robot": "tech science .3person", "qubit": "tech science .3fast",
    "algorithm": "tech science", "neuron": "science .5tech .3person", "atom": "science",
    "run": "verb fast", "walk": "verb", "think": "verb .3science .3person", "learn": "verb .4science .3young",
}
GROUPS = {"people": ["person"], "animals": ["animal"], "food": ["food", "drink"], "places": ["place"], "tech": ["tech", "science"], "verbs": ["verb"]}


def _vecs(seed: int, noise: float) -> tuple[list[str], np.ndarray]:
    rng = np.random.default_rng(seed)
    words = list(WORDS)
    M = np.zeros((len(words), len(DIMS)))
    for i, w in enumerate(words):
        for tok in WORDS[w].split():
            val = 1.0
            if tok[0] == ".":
                num = "".join(ch for ch in tok if ch in ".0123456789")
                val, tok = float(num), tok[len(num):]
            M[i, DIMS.index(tok)] = val
    M = M + rng.normal(0, noise, M.shape)
    return words, M


def embeddings(word: str = "king", a: str = "king", b: str = "man", c: str = "woman", noise: float = 0.06, seed: int = 1) -> dict:
    noise = float(min(0.5, max(0.0, noise)))
    words, M = _vecs(int(seed), noise)
    U = M / np.linalg.norm(M, axis=1, keepdims=True)
    idx = {w: i for i, w in enumerate(words)}

    def group(w):
        v = M[idx[w]]
        for g, keys in GROUPS.items():
            if any(v[DIMS.index(k)] > 0.5 for k in keys):
                return g
        return "other"

    def nearest(vec, exclude=(), k=6):
        v = vec / (np.linalg.norm(vec) or 1)
        sims = U @ v
        order = [j for j in np.argsort(-sims) if words[j] not in exclude]
        return [{"word": words[j], "cos": round(float(sims[j]), 3)} for j in order[:k]]

    word = word if word in idx else "king"
    Z = M - M.mean(0)
    _, S, Vt = np.linalg.svd(Z, full_matrices=False)
    P = Z @ Vt[:3].T
    P /= np.abs(P).max()
    analogy = None
    if all(w in idx for w in (a, b, c)):
        target = M[idx[a]] - M[idx[b]] + M[idx[c]]
        res = nearest(target, exclude=(a, b, c), k=5)
        tz = (target - M.mean(0)) @ Vt[:3].T / np.abs(Z @ Vt[:3].T).max()
        analogy = {"a": a, "b": b, "c": c, "results": res, "answer": res[0]["word"], "target3d": np.round(tz, 4).tolist()}
    return {
        "dims": DIMS, "words": [{"word": w, "group": group(w), "pos": np.round(P[i], 4).tolist()} for i, w in enumerate(words)],
        "selected": word, "vector": {d: round(float(v), 3) for d, v in zip(DIMS, M[idx[word]])},
        "neighbours": nearest(M[idx[word]], exclude=(word,), k=8), "analogy": analogy,
        "explained_3d": round(float((S[:3] ** 2).sum() / (S ** 2).sum()), 3), "noise": noise,
        "vocab": words,
    }
