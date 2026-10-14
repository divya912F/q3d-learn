"""Data-science engine: built-in datasets, descriptive statistics, charts data, a cleaning
pipeline and probability simulations (pure Python + NumPy, no pandas required)."""
from __future__ import annotations

import math
from typing import Any

import numpy as np

Table = dict[str, list]  # column name -> values (None = missing)


def _rnd(v, nd=3):
    if v is None:
        return None
    if isinstance(v, (float, np.floating)):
        return None if not math.isfinite(v) else round(float(v), nd)
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, np.bool_):
        return bool(v)
    return v


# ================================================================================ datasets
def _students(seed: int = 7, n: int = 300) -> Table:
    rng = np.random.default_rng(seed)
    hours = np.clip(rng.gamma(4, 1.6, n), 0.5, 20)
    sleep = np.clip(rng.normal(7, 1.1, n), 4, 10)
    attendance = np.clip(rng.normal(82, 10, n), 40, 100)
    previous = np.clip(rng.normal(64, 12, n), 25, 100)
    group = rng.choice(["Morning", "Evening", "Weekend"], n, p=[0.45, 0.35, 0.2])
    phone = np.clip(rng.gamma(3, 1.0, n), 0, 10)
    final = (18 + 2.1 * hours + 1.8 * (sleep - 7) + 0.22 * attendance + 0.35 * previous - 1.2 * phone
             + np.where(group == "Morning", 2.5, 0) + rng.normal(0, 5, n))
    final = np.clip(final, 0, 100)
    return {
        "student_id": [f"S{i + 1:03d}" for i in range(n)],
        "study_group": group.tolist(),
        "hours_studied": np.round(hours, 1).tolist(),
        "sleep_hours": np.round(sleep, 1).tolist(),
        "attendance_pct": np.round(attendance, 0).tolist(),
        "phone_hours": np.round(phone, 1).tolist(),
        "previous_score": np.round(previous, 0).tolist(),
        "final_score": np.round(final, 1).tolist(),
        "passed": (final >= 50).tolist(),
    }


def _housing(seed: int = 11, n: int = 280) -> Table:
    rng = np.random.default_rng(seed)
    city = rng.choice(["Delhi", "Mumbai", "Pune", "Bengaluru"], n, p=[0.3, 0.25, 0.2, 0.25])
    area = np.clip(rng.normal(1150, 380, n), 380, 3200)
    beds = np.clip(np.round(area / 480 + rng.normal(0, 0.6, n)), 1, 5)
    age = np.clip(rng.exponential(9, n), 0, 45)
    dist = np.clip(rng.gamma(2.2, 4.5, n), 0.5, 40)
    base = {"Delhi": 0.95, "Mumbai": 1.55, "Pune": 0.7, "Bengaluru": 1.0}
    price = (np.array([base[c] for c in city]) * (area * 0.075) * (1 - 0.006 * age) * (1 - 0.009 * dist)
             + rng.normal(0, 6, n))
    return {
        "city": city.tolist(), "area_sqft": np.round(area, 0).tolist(), "bedrooms": beds.astype(int).tolist(),
        "age_years": np.round(age, 1).tolist(), "distance_km": np.round(dist, 1).tolist(),
        "price_lakh": np.round(np.clip(price, 12, None), 1).tolist(),
    }


def _flowers(seed: int = 3, n: int = 150) -> Table:
    """Synthetic, iris-inspired measurements (three species)."""
    rng = np.random.default_rng(seed)
    specs = {"setosa": (5.0, 3.4, 1.5, 0.25), "versicolor": (5.9, 2.8, 4.3, 1.3), "virginica": (6.6, 3.0, 5.6, 2.0)}
    sd = (0.35, 0.33, 0.35, 0.18)
    rows = {"sepal_length": [], "sepal_width": [], "petal_length": [], "petal_width": [], "species": []}
    for i in range(n):
        sp = list(specs)[i % 3]
        m = specs[sp]
        vals = [max(0.1, rng.normal(m[j], sd[j])) for j in range(4)]
        for key, v in zip(list(rows)[:4], vals):
            rows[key].append(round(float(v), 1))
        rows["species"].append(sp)
    return rows


def _dirty_students(seed: int = 21) -> Table:
    """Students data with realistic problems: missing values, outliers, duplicates."""
    t = _students(seed=7, n=220)
    rng = np.random.default_rng(seed)
    n = len(t["student_id"])
    for col, frac in [("sleep_hours", 0.08), ("attendance_pct", 0.06), ("previous_score", 0.05), ("study_group", 0.04)]:
        for i in rng.choice(n, int(n * frac), replace=False):
            t[col][i] = None
    for i in rng.choice(n, 6, replace=False):
        t["hours_studied"][i] = float(rng.choice([95.0, 120.0, -4.0]))  # data-entry errors
    for i in rng.choice(n, 4, replace=False):
        t["final_score"][i] = float(rng.choice([180.0, -20.0]))
    dup = rng.choice(n, 12, replace=False)
    for col in t:
        t[col] = t[col] + [t[col][i] for i in dup]
    return t


DATASETS: dict[str, dict[str, Any]] = {
    "students": {"title": "Student performance", "builder": _students, "target": "final_score",
                 "description": "300 students: study habits, sleep, attendance and exam scores (synthetic)."},
    "housing": {"title": "Housing prices", "builder": _housing, "target": "price_lakh",
                "description": "280 homes in four Indian cities with area, age, distance and price in lakh ₹ (synthetic)."},
    "flowers": {"title": "Flower measurements", "builder": _flowers, "target": "species",
                "description": "150 flowers of three species with sepal and petal sizes (iris-inspired, synthetic)."},
    "dirty_students": {"title": "Messy student records", "builder": _dirty_students, "target": "final_score",
                       "description": "Student data with missing values, impossible outliers and duplicate rows — clean me!"},
}

_CACHE: dict[str, Table] = {}


def load(name: str) -> Table:
    if name not in DATASETS:
        raise ValueError(f"Unknown dataset '{name}'")
    if name not in _CACHE:
        _CACHE[name] = DATASETS[name]["builder"]()
    return {k: list(v) for k, v in _CACHE[name].items()}


def list_datasets() -> list[dict]:
    out = []
    for k, d in DATASETS.items():
        t = load(k)
        out.append({"id": k, "title": d["title"], "description": d["description"], "rows": len(next(iter(t.values()))),
                    "columns": list(t), "target": d["target"]})
    return out


# ============================================================================ statistics
def is_numeric(values: list) -> bool:
    vals = [v for v in values if v is not None]
    return bool(vals) and all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in vals)


def num(values: list) -> np.ndarray:
    return np.array([v for v in values if v is not None], float)


def describe(t: Table) -> list[dict]:
    rows = []
    for col, vals in t.items():
        missing = sum(v is None for v in vals)
        info: dict[str, Any] = {"column": col, "count": len(vals) - missing, "missing": missing}
        if is_numeric(vals):
            a = num(vals)
            q1, med, q3 = np.percentile(a, [25, 50, 75]) if len(a) else (None, None, None)
            info.update(type="numeric", mean=_rnd(a.mean()), std=_rnd(a.std(ddof=1) if len(a) > 1 else 0), min=_rnd(a.min()),
                        q1=_rnd(q1), median=_rnd(med), q3=_rnd(q3), max=_rnd(a.max()),
                        skew=_rnd(float(((a - a.mean()) ** 3).mean() / (a.std() ** 3 + 1e-12))))
        else:
            present = [str(v) for v in vals if v is not None]
            uniq, counts = np.unique(present, return_counts=True) if present else ([], [])
            top = int(np.argmax(counts)) if len(counts) else None
            info.update(type="boolean" if all(isinstance(v, bool) for v in vals if v is not None) else "categorical",
                        unique=len(uniq), top=str(uniq[top]) if top is not None else None,
                        freq=int(counts[top]) if top is not None else 0,
                        values={str(u): int(c) for u, c in zip(uniq, counts)} if len(uniq) <= 12 else None)
        rows.append(info)
    return rows


def histogram(values: list, bins: int = 20) -> dict:
    a = num(values)
    if not len(a):
        return {"edges": [], "counts": []}
    counts, edges = np.histogram(a, bins=int(min(max(bins, 3), 60)))
    return {"edges": [_rnd(e) for e in edges], "counts": counts.tolist(), "mean": _rnd(a.mean()), "median": _rnd(float(np.median(a))),
            "std": _rnd(a.std(ddof=1) if len(a) > 1 else 0.0)}


def correlation(t: Table) -> dict:
    cols = [c for c, v in t.items() if is_numeric(v)]
    n = len(next(iter(t.values())))
    M = np.full((len(cols), len(cols)), np.nan)
    for i, a in enumerate(cols):
        for j, b in enumerate(cols):
            pairs = [(t[a][k], t[b][k]) for k in range(n) if t[a][k] is not None and t[b][k] is not None]
            if len(pairs) > 2:
                x, y = np.array(pairs, float).T
                if x.std() > 0 and y.std() > 0:
                    M[i, j] = np.corrcoef(x, y)[0, 1]
    return {"columns": cols, "matrix": [[_rnd(v) for v in row] for row in M]}


def scatter(t: Table, x: str, y: str, color: str | None = None, limit: int = 600) -> dict:
    n = len(t[x])
    pts = []
    for k in range(n):
        if t[x][k] is None or t[y][k] is None:
            continue
        pts.append([t[x][k], t[y][k], (str(t[color][k]) if color and t[color][k] is not None else None)])
    pts = pts[:limit]
    xs = np.array([p[0] for p in pts], float)
    ys = np.array([p[1] for p in pts], float)
    fit = None
    if len(pts) > 2 and xs.std() > 0:
        slope, intercept = np.polyfit(xs, ys, 1)
        fit = {"slope": _rnd(slope, 4), "intercept": _rnd(intercept, 4), "r": _rnd(float(np.corrcoef(xs, ys)[0, 1]))}
    return {"points": [[_rnd(a), _rnd(b), c] for a, b, c in pts], "fit": fit}


def group_mean(t: Table, by: str, value: str) -> list[dict]:
    groups: dict[str, list[float]] = {}
    for g, v in zip(t[by], t[value]):
        if g is None or v is None:
            continue
        groups.setdefault(str(g), []).append(float(v))
    return [{"group": g, "mean": _rnd(float(np.mean(v))), "count": len(v)} for g, v in sorted(groups.items())]


def preview(t: Table, rows: int = 12) -> dict:
    cols = list(t)
    n = len(t[cols[0]])
    return {"columns": cols, "rows": [[_rnd(t[c][i]) for c in cols] for i in range(min(rows, n))], "total": n}


def explore(name: str, x: str | None = None, y: str | None = None, color: str | None = None, hist: str | None = None,
            bins: int = 20) -> dict:
    t = load(name)
    desc = describe(t)
    numeric = [d["column"] for d in desc if d["type"] == "numeric"]
    cats = [d["column"] for d in desc if d["type"] in ("categorical", "boolean") and (d.get("unique") or 0) <= 12]
    target = DATASETS[name]["target"]
    x = x if x in t else (numeric[0] if numeric else None)
    y = y if y in t else (target if target in numeric else (numeric[1] if len(numeric) > 1 else x))
    hist = hist if hist in t else y
    color = color if color in t else None
    out = {"dataset": name, "info": DATASETS[name]["description"], "describe": desc, "preview": preview(t),
           "numeric": numeric, "categorical": cats, "correlation": correlation(t), "x": x, "y": y, "hist_col": hist, "color": color}
    if x and y:
        out["scatter"] = scatter(t, x, y, color)
    if hist and is_numeric(t[hist]):
        out["histogram"] = histogram(t[hist], bins)
    if cats and numeric:
        by = color if color in cats else cats[0]
        out["group"] = {"by": by, "value": y if y in numeric else numeric[0], "rows": group_mean(t, by, y if y in numeric else numeric[0])}
    return out


# ============================================================================== pipeline
STEP_TYPES = {
    "drop_duplicates": "Remove duplicate rows",
    "drop_missing": "Drop rows with missing values",
    "fill_missing": "Fill missing values (mean / median / mode)",
    "remove_outliers": "Remove outliers by z-score",
    "clip_range": "Remove values outside a valid range",
    "standardize": "Standardise a column (z-score)",
    "normalize": "Min–max normalise a column to [0, 1]",
    "drop_column": "Drop a column",
    "filter": "Keep rows matching a condition",
}


def _rows(t: Table) -> int:
    return len(next(iter(t.values()))) if t else 0


def _keep(t: Table, mask: list[bool]) -> Table:
    return {c: [v for v, m in zip(vals, mask) if m] for c, vals in t.items()}


def apply_step(t: Table, step: dict) -> tuple[Table, str]:
    kind = step.get("type")
    col = step.get("column")
    cols = [col] if col and col != "*" else list(t)
    if col and col != "*" and col not in t:
        raise ValueError(f"Column '{col}' does not exist (maybe it was dropped earlier?)")
    n0 = _rows(t)
    if kind == "drop_duplicates":
        seen, mask = set(), []
        for i in range(n0):
            key = tuple(t[c][i] for c in t)
            mask.append(key not in seen)
            seen.add(key)
        t = _keep(t, mask)
        return t, f"removed {n0 - _rows(t)} duplicate rows"
    if kind == "drop_missing":
        mask = [all(t[c][i] is not None for c in cols) for i in range(n0)]
        t = _keep(t, mask)
        return t, f"removed {n0 - _rows(t)} rows with missing values"
    if kind == "fill_missing":
        strategy = step.get("strategy", "median")
        filled = 0
        for c in cols:
            vals = t[c]
            if not any(v is None for v in vals):
                continue
            if is_numeric(vals) and strategy in ("mean", "median"):
                a = num(vals)
                fill = float(np.mean(a) if strategy == "mean" else np.median(a))
                fill = round(fill, 2)
            else:
                present = [v for v in vals if v is not None]
                fill = max(set(map(str, present)), key=[str(p) for p in present].count) if present else None
                if present and not isinstance(present[0], str):
                    fill = next(p for p in present if str(p) == fill)
            filled += sum(v is None for v in vals)
            t[c] = [fill if v is None else v for v in vals]
        return t, f"filled {filled} missing values using the {strategy}"
    if kind == "remove_outliers":
        z = float(step.get("z", 3))
        mask = [True] * n0
        for c in cols:
            if not is_numeric(t[c]):
                continue
            a = num(t[c])
            mu, sd = a.mean(), a.std() or 1
            for i, v in enumerate(t[c]):
                if v is not None and abs((v - mu) / sd) > z:
                    mask[i] = False
        t = _keep(t, mask)
        return t, f"removed {n0 - _rows(t)} rows with |z| > {z:g}"
    if kind == "clip_range":
        lo, hi = float(step.get("min", -math.inf)), float(step.get("max", math.inf))
        mask = [all(t[c][i] is None or not isinstance(t[c][i], (int, float)) or lo <= t[c][i] <= hi for c in cols) for i in range(n0)]
        t = _keep(t, mask)
        return t, f"removed {n0 - _rows(t)} rows outside [{lo:g}, {hi:g}]"
    if kind in ("standardize", "normalize"):
        for c in cols:
            if not is_numeric(t[c]):
                continue
            a = num(t[c])
            if kind == "standardize":
                mu, sd = a.mean(), a.std() or 1
                t[c] = [None if v is None else round((v - mu) / sd, 4) for v in t[c]]
            else:
                lo, hi = a.min(), a.max()
                span = (hi - lo) or 1
                t[c] = [None if v is None else round((v - lo) / span, 4) for v in t[c]]
        return t, f"{'standardised' if kind == 'standardize' else 'normalised'} {', '.join(c for c in cols if is_numeric(t[c]))}"
    if kind == "drop_column":
        if not col or col == "*":
            raise ValueError("Choose a column to drop")
        t = {c: v for c, v in t.items() if c != col}
        return t, f"dropped column '{col}'"
    if kind == "filter":
        op, val = step.get("op", ">="), step.get("value")
        ops = {">=": lambda a, b: a >= b, "<=": lambda a, b: a <= b, ">": lambda a, b: a > b, "<": lambda a, b: a < b,
               "==": lambda a, b: str(a) == str(b), "!=": lambda a, b: str(a) != str(b)}
        if op not in ops:
            raise ValueError(f"Unknown operator {op}")
        try:
            val_num = float(val)
        except (TypeError, ValueError):
            val_num = None
        mask = []
        for v in t[col]:
            if v is None:
                mask.append(False)
            elif op in ("==", "!=") or val_num is None or not isinstance(v, (int, float)):
                mask.append(ops[op](v, val))
            else:
                mask.append(ops[op](v, val_num))
        t = _keep(t, mask)
        return t, f"kept {_rows(t)} of {n0} rows where {col} {op} {val}"
    raise ValueError(f"Unknown step type '{kind}'")


def quality(t: Table) -> dict:
    n = _rows(t)
    missing = sum(v is None for vals in t.values() for v in vals)
    keys = [tuple(t[c][i] for c in t) for i in range(n)]
    dups = n - len(set(keys))
    outliers = 0
    for c, vals in t.items():
        if is_numeric(vals) and len(num(vals)) > 2:
            a = num(vals)
            sd = a.std() or 1
            outliers += int(np.sum(np.abs((a - a.mean()) / sd) > 3))
    return {"rows": n, "columns": len(t), "missing": missing, "duplicates": dups, "outliers": outliers}


def run_pipeline(name: str, steps: list[dict], focus: str | None = None) -> dict:
    t = load(name)
    before = quality(t)
    focus = focus if focus in t else next((c for c in t if is_numeric(t[c])), None)
    hist_before = histogram(t[focus]) if focus else None
    trace = [{"step": "start", "label": "Raw data", **before}]
    error = None
    for i, s in enumerate(steps[:20]):
        try:
            t, msg = apply_step(t, dict(s))
        except Exception as exc:  # report the failing step but keep the partial result
            error = {"index": i, "message": str(exc)}
            break
        trace.append({"step": s.get("type"), "label": msg, **quality(t)})
    after = quality(t)
    return {
        "dataset": name, "before": before, "after": after, "trace": trace, "error": error,
        "describe": describe(t), "preview": preview(t, 10), "columns": list(t), "focus": focus,
        "hist_before": hist_before, "hist_after": histogram(t[focus]) if focus and focus in t else None,
        "kept_fraction": _rnd(after["rows"] / max(before["rows"], 1)),
    }


# ========================================================================= probability
def _pdf(dist: str, p: dict, xs: np.ndarray) -> np.ndarray:
    if dist == "normal":
        mu, sd = p.get("mean", 0.0), max(p.get("std", 1.0), 1e-6)
        return np.exp(-0.5 * ((xs - mu) / sd) ** 2) / (sd * math.sqrt(2 * math.pi))
    if dist == "uniform":
        a, b = p.get("low", 0.0), p.get("high", 1.0)
        return np.where((xs >= a) & (xs <= b), 1 / max(b - a, 1e-9), 0)
    if dist == "exponential":
        m = max(p.get("mean", 1.0), 1e-6)
        return np.where(xs >= 0, np.exp(-xs / m) / m, 0)
    return np.zeros_like(xs)


def _sample(dist: str, p: dict, size, rng):
    if dist == "normal":
        return rng.normal(p.get("mean", 0.0), max(p.get("std", 1.0), 1e-6), size)
    if dist == "uniform":
        return rng.uniform(p.get("low", 0.0), p.get("high", 1.0), size)
    if dist == "exponential":
        return rng.exponential(max(p.get("mean", 1.0), 1e-6), size)
    if dist == "binomial":
        return rng.binomial(int(p.get("n", 10)), min(max(p.get("p", 0.5), 0), 1), size).astype(float)
    if dist == "dice":
        return rng.integers(1, 7, size).astype(float)
    raise ValueError(f"Unknown distribution '{dist}'")


def _theory(dist: str, p: dict) -> tuple[float, float]:
    if dist == "normal":
        return p.get("mean", 0.0), p.get("std", 1.0)
    if dist == "uniform":
        a, b = p.get("low", 0.0), p.get("high", 1.0)
        return (a + b) / 2, (b - a) / math.sqrt(12)
    if dist == "exponential":
        return p.get("mean", 1.0), p.get("mean", 1.0)
    if dist == "binomial":
        n, q = int(p.get("n", 10)), p.get("p", 0.5)
        return n * q, math.sqrt(n * q * (1 - q))
    if dist == "dice":
        return 3.5, math.sqrt(35 / 12)
    return 0.0, 1.0


def sample_distribution(dist: str = "normal", params: dict | None = None, n: int = 500, seed: int = 0, bins: int = 30) -> dict:
    p = params or {}
    rng = np.random.default_rng(seed)
    n = int(min(max(n, 1), 20000))
    s = _sample(dist, p, n, rng)
    counts, edges = np.histogram(s, bins=int(min(max(bins, 5), 60)) if dist not in ("dice", "binomial") else np.arange(s.min() - 0.5, s.max() + 1.5))
    xs = np.linspace(edges[0], edges[-1], 120)
    width = edges[1] - edges[0]
    mu, sd = _theory(dist, p)
    curve = (_pdf(dist, p, xs) * n * width).tolist() if dist in ("normal", "uniform", "exponential") else None
    return {"edges": [_rnd(e) for e in edges], "counts": counts.tolist(), "curve_x": [_rnd(x) for x in xs],
            "curve_y": [_rnd(y) for y in curve] if curve else None,
            "sample_mean": _rnd(s.mean()), "sample_std": _rnd(s.std(ddof=1) if n > 1 else 0), "theory_mean": _rnd(mu), "theory_std": _rnd(sd),
            "first": [_rnd(v) for v in s[:20]]}


def clt(dist: str = "exponential", params: dict | None = None, sample_size: int = 30, n_samples: int = 1000, seed: int = 0) -> dict:
    p = params or {"mean": 2.0}
    rng = np.random.default_rng(seed)
    sample_size = int(min(max(sample_size, 1), 500))
    n_samples = int(min(max(n_samples, 10), 5000))
    means = _sample(dist, p, (n_samples, sample_size), rng).mean(axis=1)
    counts, edges = np.histogram(means, bins=35)
    mu, sd = _theory(dist, p)
    se = sd / math.sqrt(sample_size)
    xs = np.linspace(edges[0], edges[-1], 120)
    width = edges[1] - edges[0]
    normal = np.exp(-0.5 * ((xs - mu) / se) ** 2) / (se * math.sqrt(2 * math.pi)) * n_samples * width
    population = sample_distribution(dist, p, 4000, seed + 1)
    return {"edges": [_rnd(e) for e in edges], "counts": counts.tolist(), "curve_x": [_rnd(x) for x in xs], "curve_y": [_rnd(y) for y in normal],
            "mean_of_means": _rnd(means.mean()), "std_of_means": _rnd(means.std(ddof=1)), "theory_mean": _rnd(mu),
            "theory_se": _rnd(se), "population": population, "sample_size": sample_size, "n_samples": n_samples}
