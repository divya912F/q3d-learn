"""ML labs added in v2.3: PCA explorer and the classifier-metrics (threshold / ROC) lab."""
from __future__ import annotations

import math

import numpy as np

PCA_DATASETS = {
    "pancake": "3-D points lying close to a tilted plane — two components capture almost everything.",
    "cigar": "A long thin cloud — one direction explains most of the variance.",
    "blobs": "Three clusters in 3-D — PCA keeps them apart in 2-D.",
    "helix": "A spiral — curved structure that a linear projection squashes.",
    "students": "Five correlated exam scores (maths, physics, chemistry, English, history) for 160 students.",
}


def _rot(rng) -> np.ndarray:
    q, _ = np.linalg.qr(rng.normal(size=(3, 3)))
    return q


def _pca_data(name: str, n: int, noise: float, rng) -> tuple[np.ndarray, list[str], np.ndarray]:
    labels = np.zeros(n, dtype=int)
    if name == "pancake":
        X = np.c_[rng.normal(0, 3, n), rng.normal(0, 1.6, n), rng.normal(0, 0.25 + noise, n)] @ _rot(rng).T
        cols = ["x", "y", "z"]
    elif name == "cigar":
        X = np.c_[rng.normal(0, 4, n), rng.normal(0, 0.5 + noise, n), rng.normal(0, 0.4 + noise, n)] @ _rot(rng).T
        cols = ["x", "y", "z"]
    elif name == "blobs":
        centres = np.array([[3, 0, 1], [-2, 2.5, -1], [-1, -3, 0.5]]) * 1.3
        labels = rng.integers(0, 3, n)
        X = centres[labels] + rng.normal(0, 0.6 + noise, (n, 3))
        cols = ["x", "y", "z"]
    elif name == "helix":
        t = rng.uniform(0, 4 * math.pi, n)
        X = np.c_[2.5 * np.cos(t), 2.5 * np.sin(t), t * 0.45 - 2.8] + rng.normal(0, 0.1 + noise, (n, 3))
        labels = (t / (4 * math.pi) * 4).astype(int)
        cols = ["x", "y", "z"]
    elif name == "students":
        sci = rng.normal(0, 1, n)
        hum = rng.normal(0, 1, n)
        X = np.c_[70 + 12 * sci, 66 + 11 * sci + 3 * hum, 68 + 10 * sci + 2 * hum, 64 + 3 * sci + 11 * hum, 62 + 2 * sci + 10 * hum]
        X += rng.normal(0, 3 + 8 * noise, X.shape)
        labels = (sci > hum).astype(int)
        cols = ["maths", "physics", "chemistry", "english", "history"]
    else:
        raise ValueError(f"unknown dataset {name}")
    return X, cols, labels


def pca_explore(dataset: str = "pancake", n: int = 300, noise: float = 0.0, standardize: bool = False,
                k: int = 2, seed: int = 3) -> dict:
    n = int(min(600, max(40, n)))
    noise = float(min(1.5, max(0.0, noise)))
    rng = np.random.default_rng(int(seed))
    X, cols, labels = _pca_data(dataset, n, noise, rng)
    mu = X.mean(0)
    sd = X.std(0) if standardize else np.ones(X.shape[1])
    Z = (X - mu) / sd
    U, S, Vt = np.linalg.svd(Z, full_matrices=False)
    var = S ** 2 / (n - 1)
    ratio = var / var.sum()
    k = int(min(len(cols), max(1, k)))
    scores = Z @ Vt.T
    recon = scores[:, :k] @ Vt[:k] * sd + mu
    err = [float(((Z - (Z @ Vt[:j].T) @ Vt[:j]) ** 2).sum(1).mean()) for j in range(0, len(cols) + 1)]
    # Show 3-D coordinates: original space if 3-D, else first three PCs
    shown = X if X.shape[1] == 3 else scores[:, :3]
    if X.shape[1] == 3:  # axis tips in the displayed (original) space
        axes = [(2 * math.sqrt(var[i]) * Vt[i] * sd).tolist() for i in range(3)]
    else:
        axes = [[2 * math.sqrt(var[i]) if j == i else 0.0 for j in range(3)] for i in range(3)]
    return {
        "axes3d": np.round(np.array(axes), 4).tolist(),
        "dataset": dataset, "description": PCA_DATASETS.get(dataset, ""), "columns": cols, "n": n, "k": k,
        "standardize": bool(standardize), "points3d": np.round(shown, 3).tolist(),
        "labels": labels.tolist(), "mean": np.round(mu if X.shape[1] == 3 else np.zeros(3), 3).tolist(),
        "components": np.round(Vt, 4).tolist(), "explained": np.round(ratio, 4).tolist(),
        "cumulative": np.round(np.cumsum(ratio), 4).tolist(), "std_dev": np.round(np.sqrt(var), 4).tolist(),
        "projected": np.round(scores[:, :2], 3).tolist(),
        "recon3d": np.round(recon if X.shape[1] == 3 else (scores[:, :k] @ np.eye(len(cols))[:k])[:, :3], 3).tolist(),
        "recon_error": [round(e, 4) for e in err],
        "loadings": [{"pc": i + 1, "weights": {c: round(float(w), 3) for c, w in zip(cols, Vt[i])}} for i in range(min(3, len(cols)))],
    }


def classifier_scores(separation: float = 1.6, positives: float = 0.3, n: int = 600, threshold: float = 0.5,
                      seed: int = 5) -> dict:
    """Simulated model scores for a binary task: positive and negative score distributions overlap.

    Returns all scores/labels so the browser can move the threshold instantly, plus exact ROC and PR curves."""
    n = int(min(3000, max(100, n)))
    p = float(min(0.9, max(0.02, positives)))
    d = float(min(4.0, max(0.0, separation)))
    rng = np.random.default_rng(int(seed))
    y = (rng.random(n) < p).astype(int)
    logits = rng.normal(0, 1, n) + np.where(y == 1, d / 2, -d / 2)
    s = 1 / (1 + np.exp(-1.6 * logits))
    order = np.argsort(-s)
    ys = y[order]
    P, N = int(y.sum()), int(n - y.sum())
    tps = np.cumsum(ys)
    fps = np.cumsum(1 - ys)
    tpr = np.r_[0, tps / max(1, P)]
    fpr = np.r_[0, fps / max(1, N)]
    prec = np.r_[1, tps / np.arange(1, n + 1)]
    _trap = getattr(np, "trapezoid", None) or np.trapz
    auc = float(_trap(tpr, fpr))
    step = max(1, n // 120)
    idx = list(range(0, n + 1, step)) + [n]
    roc = [{"fpr": round(float(fpr[i]), 4), "tpr": round(float(tpr[i]), 4)} for i in idx]
    pr = [{"recall": round(float(tpr[i]), 4), "precision": round(float(prec[i]), 4)} for i in idx]

    def at(th: float) -> dict:
        pred = (s >= th).astype(int)
        tp = int(((pred == 1) & (y == 1)).sum()); fp = int(((pred == 1) & (y == 0)).sum())
        fn = int(((pred == 0) & (y == 1)).sum()); tn = int(((pred == 0) & (y == 0)).sum())
        precision = tp / (tp + fp) if tp + fp else 1.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        return {"threshold": round(th, 3), "tp": tp, "fp": fp, "fn": fn, "tn": tn, "accuracy": round((tp + tn) / n, 4),
                "precision": round(precision, 4), "recall": round(recall, 4), "f1": round(f1, 4),
                "fpr": round(fp / max(1, N), 4)}

    best = max((at(t / 100) for t in range(1, 100)), key=lambda m: m["f1"])
    return {
        "n": n, "positives": P, "negatives": N, "separation": d, "auc": round(auc, 4),
        "scores": np.round(s, 4).tolist(), "labels": y.tolist(), "roc": roc, "pr": pr,
        "at": at(float(threshold)), "best_f1": best, "baseline_accuracy": round(max(P, N) / n, 4),
    }
