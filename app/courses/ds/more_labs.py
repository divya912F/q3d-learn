"""Data-science labs added in v2.3: A/B hypothesis testing and time-series decomposition + forecasting."""
from __future__ import annotations

import math

import numpy as np


def _phi(z: float) -> float:
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


def _z_test(ca: int, na: int, cb: int, nb: int) -> tuple[float, float]:
    pa, pb = ca / na, cb / nb
    pool = (ca + cb) / (na + nb)
    se = math.sqrt(max(1e-12, pool * (1 - pool) * (1 / na + 1 / nb)))
    z = (pb - pa) / se
    return z, 2 * (1 - _phi(abs(z)))


def ab_test(rate_a: float = 0.10, uplift: float = 0.02, n: int = 2000, alpha: float = 0.05,
            permutations: int = 2000, peeking: bool = False, seed: int = 11) -> dict:
    """Two-proportion z-test with CI, power, a permutation null distribution and an A/A false-positive study."""
    pa = float(min(0.9, max(0.01, rate_a)))
    pb = float(min(0.99, max(0.001, pa + float(uplift))))
    n = int(min(50000, max(50, n)))
    alpha = float(min(0.2, max(0.001, alpha)))
    rng = np.random.default_rng(int(seed))
    a = rng.random(n) < pa
    b = rng.random(n) < pb
    ca, cb = int(a.sum()), int(b.sum())
    z, p = _z_test(ca, n, cb, n)
    ra, rb = ca / n, cb / n
    se_d = math.sqrt(ra * (1 - ra) / n + rb * (1 - rb) / n)
    zc = {0.1: 1.645, 0.05: 1.96, 0.01: 2.576}.get(round(alpha, 3), abs(_inv_phi(1 - alpha / 2)))
    ci = [rb - ra - zc * se_d, rb - ra + zc * se_d]
    # power for the true uplift (normal approximation)
    se_true = math.sqrt(pa * (1 - pa) / n + pb * (1 - pb) / n)
    power = 1 - _phi(zc - abs(pb - pa) / se_true) + _phi(-zc - abs(pb - pa) / se_true)
    # sample size for 80% power
    need = ((zc + 0.8416) ** 2 * (pa * (1 - pa) + pb * (1 - pb)) / max(1e-9, (pb - pa) ** 2)) if pb != pa else None
    # permutation test on the difference of rates
    perms = int(min(5000, max(200, permutations)))
    pooled = np.r_[a, b].astype(float)
    diffs = np.empty(perms)
    for i in range(perms):
        rng.shuffle(pooled)
        diffs[i] = pooled[n:].mean() - pooled[:n].mean()
    obs = rb - ra
    p_perm = float((np.abs(diffs) >= abs(obs) - 1e-12).mean())
    hist, edges = np.histogram(diffs, bins=40)
    # A/A tests: no real difference. With peeking, stop as soon as any interim look is "significant".
    aa_runs, looks = 300, 10
    fp_fixed = fp_peek = 0
    for _ in range(aa_runs):
        x1 = rng.random(n) < pa
        x2 = rng.random(n) < pa
        if _z_test(int(x1.sum()), n, int(x2.sum()), n)[1] < alpha:
            fp_fixed += 1
        for L in range(1, looks + 1):
            m = max(10, n * L // looks)
            if _z_test(int(x1[:m].sum()), m, int(x2[:m].sum()), m)[1] < alpha:
                fp_peek += 1
                break
    # cumulative p-value path (what someone peeking would see)
    path = []
    for L in range(1, 41):
        m = max(10, n * L // 40)
        path.append({"n": m, "p": round(_z_test(int(a[:m].sum()), m, int(b[:m].sum()), m)[1], 5)})
    return {
        "rate_a": pa, "rate_b_true": round(pb, 4), "n": n, "alpha": alpha,
        "conversions": {"a": ca, "b": cb}, "observed": {"a": round(ra, 4), "b": round(rb, 4), "diff": round(obs, 5),
                                                         "lift_pct": round(100 * obs / ra, 2) if ra else None},
        "z": round(z, 3), "p_value": round(p, 5), "significant": p < alpha, "ci": [round(c, 5) for c in ci],
        "power": round(power, 3), "n_for_80_power": int(math.ceil(need)) if need else None,
        "permutation": {"p_value": round(p_perm, 4), "hist": hist.tolist(), "edges": np.round(edges, 5).tolist(), "runs": perms},
        "aa": {"runs": aa_runs, "false_positive_fixed": round(fp_fixed / aa_runs, 3),
               "false_positive_peeking": round(fp_peek / aa_runs, 3), "looks": looks},
        "peeking": bool(peeking), "p_path": path,
    }


def _inv_phi(p: float) -> float:
    lo, hi = -10.0, 10.0
    for _ in range(80):
        mid = (lo + hi) / 2
        if _phi(mid) < p:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


SERIES = {
    "shop": "Daily online-shop orders: growth + strong weekly cycle (busy weekends).",
    "temperature": "Monthly city temperature: a yearly cycle and a slow warming trend.",
    "traffic": "Hourly website visits: a daily cycle and a few sudden spikes (anomalies).",
}


def _make_series(name: str, length: int, noise: float, rng) -> tuple[np.ndarray, int, str]:
    t = np.arange(length)
    if name == "shop":
        period = 7
        y = 120 + 0.6 * t + 25 * np.sin(2 * math.pi * (t - 2) / period) + 12 * np.cos(4 * math.pi * t / period)
        unit = "day"
    elif name == "temperature":
        period = 12
        y = 22 + 0.02 * t + 8 * np.sin(2 * math.pi * (t - 3) / period)
        unit = "month"
    elif name == "traffic":
        period = 24
        y = 300 + 0.4 * t + 140 * np.sin(2 * math.pi * (t - 8) / period).clip(-0.6)
        unit = "hour"
    else:
        raise ValueError(f"unknown series {name}")
    y = y + rng.normal(0, (4 + 18 * noise) * (y.std() / 40), length)
    if name == "traffic":
        for k in rng.choice(length - 10, 3, replace=False):
            y[k] += 380
    return y, period, unit


def time_series(series: str = "shop", length: int = 120, noise: float = 0.3, window: int = 7,
                horizon: int = 21, method: str = "holt_winters", alpha: float = 0.4, seed: int = 4) -> dict:
    length = int(min(400, max(48, length)))
    horizon = int(min(60, max(4, horizon)))
    rng = np.random.default_rng(int(seed))
    y, period, unit = _make_series(series, length + horizon, float(min(1.5, max(0, noise))), rng)
    train, test = y[:length], y[length:]
    w = int(min(length // 2, max(2, window)))
    ma = np.convolve(train, np.ones(w) / w, mode="valid")
    ma_full = [None] * (w // 2) + np.round(ma, 2).tolist()
    ma_full += [None] * (length - len(ma_full))
    # classical additive decomposition: trend = centred MA over one period
    pm = np.convolve(train, np.ones(period) / period, mode="same")
    half = period // 2
    trend = pm.copy()
    trend[:half] = np.nan
    trend[-half:] = np.nan
    detr = train - trend
    seas_idx = np.array([np.nanmean(detr[i::period]) for i in range(period)])
    seas_idx -= seas_idx.mean()
    seasonal = np.array([seas_idx[i % period] for i in range(length)])
    resid = train - trend - seasonal
    rs = np.nanstd(resid)
    anomalies = [int(i) for i in np.where(np.abs(np.nan_to_num(resid)) > 3 * rs)[0]]

    def forecast(kind: str) -> np.ndarray:
        if kind == "naive":
            return np.full(horizon, train[-1])
        if kind == "seasonal_naive":
            return np.array([train[length - period + (h % period)] for h in range(horizon)])
        if kind == "moving_average":
            return np.full(horizon, train[-w:].mean())
        # additive Holt–Winters
        a = float(min(0.95, max(0.05, alpha)))
        b, g = 0.05, 0.2
        level = train[:period].mean()
        slope = (train[period:2 * period].mean() - train[:period].mean()) / period
        season = list(train[:period] - level)
        for i in range(length):
            s = season[i % period]
            prev = level
            level = a * (train[i] - s) + (1 - a) * (level + slope)
            slope = b * (level - prev) + (1 - b) * slope
            season[i % period] = g * (train[i] - level) + (1 - g) * s
        return np.array([level + (h + 1) * slope + season[(length + h) % period] for h in range(horizon)])

    errors = {}
    for kind in ("naive", "seasonal_naive", "moving_average", "holt_winters"):
        errors[kind] = round(float(np.abs(forecast(kind) - test).mean()), 3)
    method = method if method in errors else "holt_winters"
    fc = forecast(method)
    sd = float(np.std(train[period:] - train[:-period])) if method != "naive" else float(np.std(np.diff(train)))
    band = [round(1.28 * sd * math.sqrt(1 + h / period), 3) for h in range(horizon)]
    r = lambda v: [None if (isinstance(x, float) and math.isnan(x)) else round(float(x), 3) for x in v]
    return {
        "series": series, "description": SERIES.get(series, ""), "unit": unit, "period": period, "length": length,
        "horizon": horizon, "window": w, "method": method,
        "y": r(train), "actual_future": r(test), "moving_average": ma_full,
        "trend": r(trend), "seasonal": r(seasonal), "residual": r(resid), "seasonal_pattern": r(seas_idx),
        "forecast": r(fc), "band": band, "mae": errors[method], "errors": errors,
        "best_method": min(errors, key=errors.get), "anomalies": anomalies,
    }
