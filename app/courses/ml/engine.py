"""Machine-learning engine (pure NumPy) that returns *animation-ready* training traces.

Every trainer records checkpoints (parameters, loss, accuracy, decision-boundary grids)
so the browser can replay training step by step.
"""
from __future__ import annotations

import math
from typing import Any

import numpy as np

GRID = 56  # decision-boundary resolution
MAX_POINTS = 600


# =============================================================================== datasets
def make_classification(name: str, n: int = 240, noise: float = 0.15, seed: int = 0) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    n = int(min(max(n, 20), MAX_POINTS))
    if name == "blobs":
        centers = np.array([[-1.2, -0.8], [1.2, 0.9]])
        y = rng.integers(0, 2, n)
        X = centers[y] + rng.normal(0, 0.45 + noise, (n, 2))
    elif name == "blobs3":
        centers = np.array([[-1.4, -0.9], [1.4, -0.9], [0.0, 1.3]])
        y = rng.integers(0, 3, n)
        X = centers[y] + rng.normal(0, 0.4 + noise, (n, 2))
    elif name == "moons":
        h = n // 2
        t1 = rng.uniform(0, math.pi, h)
        t2 = rng.uniform(0, math.pi, n - h)
        X = np.vstack([np.c_[np.cos(t1), np.sin(t1)], np.c_[1 - np.cos(t2), 0.5 - np.sin(t2)]])
        X = (X - [0.5, 0.25]) * 1.6 + rng.normal(0, noise, (n, 2))
        y = np.r_[np.zeros(h, int), np.ones(n - h, int)]
    elif name == "circles":
        h = n // 2
        t = rng.uniform(0, 2 * math.pi, n)
        r = np.r_[np.full(h, 0.6), np.full(n - h, 1.6)]
        X = np.c_[r * np.cos(t), r * np.sin(t)] + rng.normal(0, noise, (n, 2))
        y = np.r_[np.zeros(h, int), np.ones(n - h, int)]
    elif name == "xor":
        X = rng.uniform(-2, 2, (n, 2))
        y = ((X[:, 0] > 0) ^ (X[:, 1] > 0)).astype(int)
        X = X + rng.normal(0, noise * 0.5, (n, 2))
    elif name == "spiral":
        h = n // 2
        t = np.sqrt(rng.uniform(0, 1, h)) * 3 * math.pi
        a = np.c_[t * np.cos(t), t * np.sin(t)] / 4.5
        X = np.vstack([a, -a]) + rng.normal(0, noise * 0.6, (2 * h, 2))
        y = np.r_[np.zeros(h, int), np.ones(h, int)]
    else:
        raise ValueError(f"Unknown dataset '{name}'")
    return X.astype(float), y.astype(int)


def make_regression(name: str, n: int = 60, noise: float = 0.3, seed: int = 0) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    x = np.sort(rng.uniform(-3, 3, n))
    if name == "linear":
        y = 1.6 * x + 2.0
    elif name == "sine":
        y = 2.2 * np.sin(1.1 * x)
    elif name == "quadratic":
        y = 0.6 * x**2 - 1.0 * x - 1.5
    else:
        raise ValueError(f"Unknown dataset '{name}'")
    return x, y + rng.normal(0, noise * 1.5, n)


def split(n: int, seed: int = 0, test_frac: float = 0.25) -> tuple[np.ndarray, np.ndarray]:
    idx = np.random.default_rng(seed + 99).permutation(n)
    k = max(1, int(round(n * test_frac)))
    return idx[k:], idx[:k]


def r(v: Any, nd: int = 4):
    """Round for JSON; non-finite values (diverged training) become safe numbers / None."""
    if isinstance(v, np.ndarray):
        return np.round(np.nan_to_num(v, nan=0.0, posinf=1e9, neginf=-1e9), nd).tolist()
    v = float(v)
    if not math.isfinite(v):
        return None
    return round(v, nd)


# ============================================================================ regression
def _poly(x: np.ndarray, degree: int) -> np.ndarray:
    return np.vstack([x**d for d in range(degree + 1)]).T  # bias column first


def train_regression(points: list[list[float]] | None = None, dataset: str = "linear", degree: int = 1, lr: float = 0.05,
                     epochs: int = 150, noise: float = 0.3, seed: int = 0) -> dict[str, Any]:
    degree = int(min(max(degree, 1), 9))
    epochs = int(min(max(epochs, 1), 2000))
    lr = float(lr)
    if points and len(points) >= 3:
        P = np.array(points, float)[:MAX_POINTS]
        x_raw, y = P[:, 0], P[:, 1]
    else:
        x_raw, y = make_regression(dataset, noise=noise, seed=seed)
    n = len(x_raw)
    tr, te = split(n, seed)
    mu, sd = x_raw[tr].mean(), x_raw[tr].std() or 1.0
    x = (x_raw - mu) / sd
    Xtr, Xte = _poly(x[tr], degree), _poly(x[te], degree)
    # scale polynomial columns so plain gradient descent is well-conditioned
    col_scale = np.maximum(np.abs(Xtr).max(axis=0), 1e-9)
    Xtr_s, Xte_s = Xtr / col_scale, Xte / col_scale
    w = np.zeros(degree + 1)
    xs = np.linspace(x_raw.min() - 0.3, x_raw.max() + 0.3, 120)
    Xs = _poly((xs - mu) / sd, degree) / col_scale

    def mse(Xm, yv, wv):
        return float(np.mean((Xm @ wv - yv) ** 2))

    history, snaps, path = [], [], []
    every = max(1, epochs // 40)
    diverged = False
    for ep in range(epochs + 1):
        if ep % every == 0 or ep == epochs:
            snaps.append({"epoch": ep, "curve": r(Xs @ w, 3), "weights": r(w / col_scale)})
        tr_loss, te_loss = mse(Xtr_s, y[tr], w), mse(Xte_s, y[te], w)
        history.append({"epoch": ep, "train": r(tr_loss), "test": r(te_loss)})
        if degree == 1:
            path.append([r(w[1] / col_scale[1]), r(w[0])])
        if not math.isfinite(tr_loss) or tr_loss > 1e8:
            diverged = True
            break
        if ep == epochs:
            break
        grad = 2 / len(tr) * Xtr_s.T @ (Xtr_s @ w - y[tr])
        w = w - lr * grad

    # closed-form least squares for comparison
    w_ls, *_ = np.linalg.lstsq(Xtr_s, y[tr], rcond=None)
    out: dict[str, Any] = {
        "points": [[r(a, 3), r(b, 3)] for a, b in zip(x_raw, y)],
        "train_idx": tr.tolist(), "test_idx": te.tolist(),
        "xs": r(xs, 3), "snapshots": snaps, "history": history,
        "final": {"train_mse": history[-1]["train"], "test_mse": history[-1]["test"],
                  "best_possible_test_mse": r(mse(Xte_s, y[te], w_ls)), "epochs_run": history[-1]["epoch"]},
        "diverged": diverged, "degree": degree, "lr": lr,
        "equation": _equation(w / col_scale, mu, sd),
    }
    if degree == 1 and not diverged:
        # loss landscape over (slope, intercept) in standardised-x units
        W = np.linspace(-1.5, 1.5, 41) * max(1.0, abs(w_ls[1] / col_scale[1]) * 1.6) + 0
        B = np.linspace(-1.5, 1.5, 41) * max(1.0, abs(w_ls[0]) * 1.6)
        xt, yt = x[tr], y[tr]
        Z = np.array([[float(np.mean((m * xt + b - yt) ** 2)) for m in W] for b in B])
        out["landscape"] = {"slopes": r(W, 3), "intercepts": r(B, 3), "loss": r(Z, 3), "path": path,
                            "optimum": [r(w_ls[1] / col_scale[1]), r(w_ls[0])]}
    return out


def _equation(w: np.ndarray, mu: float, sd: float) -> str:
    terms = []
    for d, c in enumerate(w):
        if abs(c) < 1e-4:
            continue
        z = "z" if d == 1 else (f"z^{d}" if d > 1 else "")
        terms.append(f"{c:+.3f}{('·' + z) if z else ''}")
    s = " ".join(terms).lstrip("+") or "0"
    shift = f"x − {mu:.2f}" if mu >= 0 else f"x + {-mu:.2f}"
    return f"ŷ = {s}   (z = ({shift}) / {sd:.2f})"


def degree_sweep(dataset: str = "sine", noise: float = 0.3, seed: int = 0, max_degree: int = 9) -> list[dict]:
    """Closed-form fit for each polynomial degree → train/test MSE (bias–variance picture)."""
    x_raw, y = make_regression(dataset, noise=noise, seed=seed)
    tr, te = split(len(x_raw), seed)
    mu, sd = x_raw[tr].mean(), x_raw[tr].std() or 1.0
    x = (x_raw - mu) / sd
    out = []
    for d in range(1, max_degree + 1):
        w, *_ = np.linalg.lstsq(_poly(x[tr], d), y[tr], rcond=None)
        out.append({"degree": d, "train": r(np.mean((_poly(x[tr], d) @ w - y[tr]) ** 2)),
                    "test": r(np.mean((_poly(x[te], d) @ w - y[te]) ** 2))})
    return out


# ======================================================================== classification
def _grid(X: np.ndarray) -> tuple[np.ndarray, list[float]]:
    lo, hi = X.min(axis=0) - 0.6, X.max(axis=0) + 0.6
    gx = np.linspace(lo[0], hi[0], GRID)
    gy = np.linspace(lo[1], hi[1], GRID)
    G = np.array([[a, b] for b in gy for a in gx])
    return G, [float(lo[0]), float(hi[0]), float(lo[1]), float(hi[1])]


def _features(X: np.ndarray, degree: int) -> np.ndarray:
    cols = [np.ones(len(X))]
    for d in range(1, degree + 1):
        for i in range(d + 1):
            cols.append(X[:, 0] ** (d - i) * X[:, 1] ** i)
    return np.vstack(cols).T


def _softmax(z: np.ndarray) -> np.ndarray:
    z = z - z.max(axis=1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)


def _onehot(y: np.ndarray, k: int) -> np.ndarray:
    o = np.zeros((len(y), k))
    o[np.arange(len(y)), y] = 1
    return o


def _boundary(proba: np.ndarray) -> dict:
    return {"cls": proba.argmax(axis=1).tolist(), "conf": np.round(proba.max(axis=1), 2).tolist()}


def _metrics(y_true: np.ndarray, y_pred: np.ndarray, k: int) -> dict:
    cm = np.zeros((k, k), int)
    for t, p in zip(y_true, y_pred):
        cm[t, p] += 1
    prec = [r(cm[i, i] / cm[:, i].sum()) if cm[:, i].sum() else 0.0 for i in range(k)]
    rec = [r(cm[i, i] / cm[i, :].sum()) if cm[i, :].sum() else 0.0 for i in range(k)]
    return {"accuracy": r((y_true == y_pred).mean()), "confusion": cm.tolist(), "precision": prec, "recall": rec}


class _MLP:
    def __init__(self, sizes: list[int], activation: str, rng: np.random.Generator):
        self.W = [rng.normal(0, math.sqrt(2 / a), (a, b)) for a, b in zip(sizes[:-1], sizes[1:])]
        self.b = [np.zeros(b) for b in sizes[1:]]
        self.act = activation
        self.m = [np.zeros_like(p) for p in self.W + self.b]
        self.v = [np.zeros_like(p) for p in self.W + self.b]
        self.t = 0

    def f(self, z):
        if self.act == "tanh":
            return np.tanh(z)
        if self.act == "sigmoid":
            return 1 / (1 + np.exp(-z))
        return np.maximum(0, z)

    def df(self, a):
        if self.act == "tanh":
            return 1 - a**2
        if self.act == "sigmoid":
            return a * (1 - a)
        return (a > 0).astype(float)

    def forward(self, X):
        acts = [X]
        for i, (W, b) in enumerate(zip(self.W, self.b)):
            z = acts[-1] @ W + b
            acts.append(_softmax(z) if i == len(self.W) - 1 else self.f(z))
        return acts

    def step(self, X, Y, lr, l2):
        acts = self.forward(X)
        delta = (acts[-1] - Y) / len(X)
        gW, gb = [], []
        for i in range(len(self.W) - 1, -1, -1):
            gW.insert(0, acts[i].T @ delta + l2 * self.W[i])
            gb.insert(0, delta.sum(axis=0))
            if i:
                delta = (delta @ self.W[i].T) * self.df(acts[i])
        # Adam
        self.t += 1
        params, grads = self.W + self.b, gW + gb
        for j, (p, g) in enumerate(zip(params, grads)):
            self.m[j] = 0.9 * self.m[j] + 0.1 * g
            self.v[j] = 0.999 * self.v[j] + 0.001 * g * g
            mh = self.m[j] / (1 - 0.9**self.t)
            vh = self.v[j] / (1 - 0.999**self.t)
            p -= lr * mh / (np.sqrt(vh) + 1e-8)
        return float(-np.mean(np.sum(Y * np.log(acts[-1] + 1e-12), axis=1)))


def _tree_build(X, y, k, depth, max_depth, min_samples, node_id):
    counts = np.bincount(y, minlength=k)
    node = {"id": node_id[0], "samples": int(len(y)), "counts": counts.tolist(), "cls": int(counts.argmax()),
            "gini": r(1 - np.sum((counts / max(len(y), 1)) ** 2))}
    node_id[0] += 1
    if depth >= max_depth or len(y) < min_samples or node["gini"] == 0:
        return node
    best = None
    for f in range(X.shape[1]):
        vals = np.unique(X[:, f])
        cands = (vals[:-1] + vals[1:]) / 2
        if len(cands) > 40:
            cands = np.quantile(X[:, f], np.linspace(0.02, 0.98, 40))
        for t in cands:
            left = X[:, f] <= t
            nl, nr = left.sum(), (~left).sum()
            if nl == 0 or nr == 0:
                continue
            gl = 1 - np.sum((np.bincount(y[left], minlength=k) / nl) ** 2)
            gr = 1 - np.sum((np.bincount(y[~left], minlength=k) / nr) ** 2)
            score = (nl * gl + nr * gr) / len(y)
            if best is None or score < best[0]:
                best = (score, f, float(t), left)
    if best is None or best[0] >= node["gini"] - 1e-9:
        return node
    _, f, t, left = best
    node["feature"], node["threshold"] = f, r(t)
    node["left"] = _tree_build(X[left], y[left], k, depth + 1, max_depth, min_samples, node_id)
    node["right"] = _tree_build(X[~left], y[~left], k, depth + 1, max_depth, min_samples, node_id)
    return node


def _tree_predict(node, X, k):
    out = np.zeros((len(X), k))
    for i, x in enumerate(X):
        n = node
        while "feature" in n:
            n = n["left"] if x[n["feature"]] <= n["threshold"] else n["right"]
        c = np.array(n["counts"], float)
        out[i] = c / c.sum()
    return out


def _tree_depth(node) -> int:
    if "feature" not in node:
        return 0
    return 1 + max(_tree_depth(node["left"]), _tree_depth(node["right"]))


def train_classifier(dataset: str = "moons", model: str = "mlp", noise: float = 0.15, n: int = 240, seed: int = 0,
                     points: list[list[float]] | None = None, labels: list[int] | None = None,
                     lr: float = 0.03, epochs: int = 300, degree: int = 1, k: int = 5, max_depth: int = 4,
                     min_samples: int = 2, hidden: list[int] | None = None, activation: str = "relu", l2: float = 0.0) -> dict:
    if points and labels and len(points) >= 4:
        X = np.array(points, float)[:MAX_POINTS]
        y = np.array(labels, int)[: len(X)]
    else:
        X, y = make_classification(dataset, n=n, noise=noise, seed=seed)
    K = int(max(2, y.max() + 1))
    tr, te = split(len(X), seed)
    mu, sd = X[tr].mean(axis=0), X[tr].std(axis=0) + 1e-9
    Xs = (X - mu) / sd
    G, extent = _grid(X)
    Gs = (G - mu) / sd
    snaps: list[dict] = []
    history: list[dict] = []
    extra: dict[str, Any] = {}
    epochs = int(min(max(epochs, 1), 3000))

    if model == "logistic":
        degree = int(min(max(degree, 1), 5))
        Ftr, Fall, Fg = _features(Xs[tr], degree), _features(Xs, degree), _features(Gs, degree)
        W = np.zeros((Ftr.shape[1], K))
        Y = _onehot(y[tr], K)
        every = max(1, epochs // 30)
        m = np.zeros_like(W)
        v = np.zeros_like(W)
        for ep in range(epochs + 1):
            P = _softmax(Ftr @ W)
            loss = float(-np.mean(np.sum(Y * np.log(P + 1e-12), axis=1)))
            pred_all = _softmax(Fall @ W).argmax(axis=1)
            history.append({"epoch": ep, "loss": r(loss), "train_acc": r((pred_all[tr] == y[tr]).mean()),
                            "test_acc": r((pred_all[te] == y[te]).mean())})
            if ep % every == 0 or ep == epochs:
                snaps.append({"epoch": ep, **_boundary(_softmax(Fg @ W))})
            if ep == epochs:
                break
            g = Ftr.T @ (P - Y) / len(tr) + l2 * W
            m = 0.9 * m + 0.1 * g
            v = 0.999 * v + 0.001 * g * g
            W -= lr * 10 * (m / (1 - 0.9 ** (ep + 1))) / (np.sqrt(v / (1 - 0.999 ** (ep + 1))) + 1e-8)
        pred = _softmax(Fall @ W).argmax(axis=1)
    elif model == "knn":
        k = int(min(max(k, 1), 50))

        def knn_proba(Q):
            d = ((Q[:, None, :] - Xs[tr][None, :, :]) ** 2).sum(-1)
            nn = np.argsort(d, axis=1)[:, :k]
            votes = np.zeros((len(Q), K))
            for c in range(K):
                votes[:, c] = (y[tr][nn] == c).sum(axis=1)
            return votes / k
        snaps.append({"epoch": 0, **_boundary(knn_proba(Gs))})
        pred = knn_proba(Xs).argmax(axis=1)
        history.append({"epoch": 0, "loss": None, "train_acc": r((pred[tr] == y[tr]).mean()), "test_acc": r((pred[te] == y[te]).mean())})
    elif model == "tree":
        max_depth = int(min(max(max_depth, 1), 10))
        # grow depth by depth so the UI can animate the tree growing
        tree = None
        for d in range(1, max_depth + 1):
            tree = _tree_build(Xs[tr], y[tr], K, 0, d, max(2, int(min_samples)), [0])
            pred_d = _tree_predict(tree, Xs, K).argmax(axis=1)
            snaps.append({"epoch": d, **_boundary(_tree_predict(tree, Gs, K))})
            history.append({"epoch": d, "loss": None, "train_acc": r((pred_d[tr] == y[tr]).mean()),
                            "test_acc": r((pred_d[te] == y[te]).mean())})
            if _tree_depth(tree) < d:  # tree stopped growing
                break
        pred = _tree_predict(tree, Xs, K).argmax(axis=1)
        extra["tree"] = tree
        extra["feature_names"] = ["x₁", "x₂"]
        extra["scaler"] = {"mean": r(mu), "std": r(sd)}
    elif model == "mlp":
        hidden = [int(min(max(h, 1), 32)) for h in (hidden or [8, 8])][:4]
        rng = np.random.default_rng(seed + 7)
        net = _MLP([2, *hidden, K], activation if activation in ("relu", "tanh", "sigmoid") else "relu", rng)
        Y = _onehot(y[tr], K)
        every = max(1, epochs // 30)
        for ep in range(epochs + 1):
            pred_all = net.forward(Xs)[-1].argmax(axis=1)
            if ep % every == 0 or ep == epochs:
                snaps.append({"epoch": ep, **_boundary(net.forward(Gs)[-1])})
            if ep == epochs:
                loss = float(-np.mean(np.sum(Y * np.log(net.forward(Xs[tr])[-1] + 1e-12), axis=1)))
            else:
                loss = net.step(Xs[tr], Y, lr, l2)
            history.append({"epoch": ep, "loss": r(loss), "train_acc": r((pred_all[tr] == y[tr]).mean()),
                            "test_acc": r((pred_all[te] == y[te]).mean())})
            if ep == epochs:
                break
        pred = net.forward(Xs)[-1].argmax(axis=1)
        extra["network"] = {"sizes": [2, *hidden, K], "weights": [r(W, 3) for W in net.W], "activation": net.act}
        extra["params"] = int(sum(W.size for W in net.W) + sum(b.size for b in net.b))
    else:
        raise ValueError(f"Unknown model '{model}'")

    m_test = _metrics(y[te], pred[te], K)
    return {
        "points": r(X, 3), "labels": y.tolist(), "train_idx": tr.tolist(), "test_idx": te.tolist(),
        "classes": K, "extent": extent, "grid": GRID, "snapshots": snaps, "history": history,
        "final": {"train_acc": r((pred[tr] == y[tr]).mean()), "test_acc": m_test["accuracy"],
                  "confusion": m_test["confusion"], "precision": m_test["precision"], "recall": m_test["recall"]},
        "model": model, **extra,
    }


# ============================================================================== k-means
def _kmeanspp(X, k, rng):
    C = [X[rng.integers(len(X))]]
    for _ in range(1, k):
        d = np.min(((X[:, None] - np.array(C)[None]) ** 2).sum(-1), axis=1)
        C.append(X[rng.choice(len(X), p=d / d.sum())])
    return np.array(C)


def _kmeans(X, k, rng, init="kmeans++", iters=30, record=False):
    C = _kmeanspp(X, k, rng) if init == "kmeans++" else X[rng.choice(len(X), k, replace=False)]
    steps = []
    labels = np.zeros(len(X), int)
    for it in range(iters):
        labels = ((X[:, None] - C[None]) ** 2).sum(-1).argmin(axis=1)
        inertia = float(((X - C[labels]) ** 2).sum())
        if record:
            steps.append({"iter": it, "phase": "assign", "centroids": r(C, 3), "labels": labels.tolist(), "inertia": r(inertia, 2)})
        newC = np.array([X[labels == j].mean(axis=0) if np.any(labels == j) else C[j] for j in range(k)])
        moved = float(np.abs(newC - C).max())
        C = newC
        if record:
            steps.append({"iter": it, "phase": "update", "centroids": r(C, 3), "labels": labels.tolist(), "inertia": r(inertia, 2)})
        if moved < 1e-6:
            break
    inertia = float(((X - C[labels]) ** 2).sum())
    return C, labels, inertia, steps


def silhouette(X, labels) -> float:
    k = labels.max() + 1
    if k < 2:
        return 0.0
    D = np.sqrt(((X[:, None] - X[None]) ** 2).sum(-1))
    s = []
    for i in range(len(X)):
        same = labels == labels[i]
        a = D[i, same].sum() / max(same.sum() - 1, 1)
        b = min(D[i, labels == j].mean() for j in range(k) if j != labels[i] and np.any(labels == j))
        s.append((b - a) / max(a, b) if max(a, b) > 0 else 0)
    return float(np.mean(s))


def make_blobs(n_clusters: int = 4, n: int = 240, spread: float = 0.55, seed: int = 0) -> np.ndarray:
    rng = np.random.default_rng(seed + 31)
    centers = rng.uniform(-3, 3, (n_clusters, 2))
    lab = rng.integers(0, n_clusters, n)
    return centers[lab] + rng.normal(0, spread, (n, 2))


def run_kmeans(k: int = 3, true_clusters: int = 4, n: int = 240, spread: float = 0.55, init: str = "kmeans++",
               seed: int = 0, points: list[list[float]] | None = None, dataset: str | None = None) -> dict:
    if points and len(points) >= 3:
        X = np.array(points, float)[:MAX_POINTS]
    elif dataset and dataset not in ("blobs",):
        X, _ = make_classification(dataset, n=n, seed=seed)
    else:
        X = make_blobs(true_clusters, n, spread, seed)
    k = int(min(max(k, 1), 10))
    rng = np.random.default_rng(seed + 5)
    C, labels, inertia, steps = _kmeans(X, k, rng, init, record=True)
    elbow = []
    for kk in range(1, 9):
        _, lab, inn, _ = _kmeans(X, kk, np.random.default_rng(seed + 5))
        elbow.append({"k": kk, "inertia": r(inn, 2), "silhouette": r(silhouette(X, lab)) if kk > 1 else None})
    return {"points": r(X, 3), "steps": steps, "final": {"centroids": r(C, 3), "labels": labels.tolist(), "inertia": r(inertia, 2),
            "silhouette": r(silhouette(X, labels)) if k > 1 else None, "iterations": len(steps) // 2}, "elbow": elbow, "k": k}
