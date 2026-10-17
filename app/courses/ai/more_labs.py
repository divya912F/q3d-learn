"""AI labs added in v2.3: a genetic algorithm for the travelling-salesperson problem and N-Queens backtracking."""
from __future__ import annotations

import math

import numpy as np


def _tour_len(tour, D) -> float:
    return float(D[tour, np.roll(tour, -1)].sum())


def _cities(n: int, layout: str, rng) -> np.ndarray:
    if layout == "circle":
        a = np.sort(rng.uniform(0, 2 * math.pi, n))
        rng.shuffle(a)
        return np.c_[0.5 + 0.42 * np.cos(a), 0.5 + 0.42 * np.sin(a)]
    if layout == "clusters":
        c = rng.uniform(0.15, 0.85, (4, 2))
        return np.clip(c[rng.integers(0, 4, n)] + rng.normal(0, 0.07, (n, 2)), 0.02, 0.98)
    return rng.uniform(0.04, 0.96, (n, 2))


def genetic_tsp(cities: int = 24, layout: str = "random", population: int = 100, generations: int = 160,
                mutation: float = 0.15, elite: int = 4, crossover: str = "ordered", seed: int = 9) -> dict:
    """Order-crossover GA with tournament selection, swap/2-opt-reversal mutation and elitism."""
    n = int(min(60, max(5, cities)))
    pop_n = int(min(200, max(10, population)))
    gens = int(min(400, max(5, generations), 40000 // pop_n))  # keep each run to a few seconds
    mut = float(min(1.0, max(0.0, mutation)))
    elite = int(min(pop_n // 2, max(0, elite)))
    rng = np.random.default_rng(int(seed))
    P = _cities(n, layout, rng)
    D = np.sqrt(((P[:, None, :] - P[None, :, :]) ** 2).sum(-1))
    pop = [rng.permutation(n) for _ in range(pop_n)]

    def ox(a, b):
        i, j = sorted(rng.choice(n, 2, replace=False))
        child = -np.ones(n, dtype=int)
        child[i:j] = a[i:j]
        seg = set(a[i:j].tolist())
        fill = [c for c in b if c not in seg]
        child[child < 0] = fill
        return child

    def mutate(t):
        t = t.copy()
        if rng.random() < mut:
            i, j = sorted(rng.choice(n, 2, replace=False))
            t[i:j + 1] = t[i:j + 1][::-1]  # reversal mutation = a random 2-opt move
        if rng.random() < mut / 2:
            i, j = rng.choice(n, 2, replace=False)
            t[i], t[j] = t[j], t[i]
        return t

    history, snaps = [], []
    snap_every = max(1, gens // 40)
    best, best_len = None, math.inf
    for g in range(gens + 1):
        arr = np.array(pop)
        lens = D[arr, np.roll(arr, -1, axis=1)].sum(1)
        order = np.argsort(lens)
        if lens[order[0]] < best_len:
            best_len, best = float(lens[order[0]]), pop[order[0]].copy()
        history.append({"gen": g, "best": round(best_len, 4), "mean": round(float(lens.mean()), 4), "worst": round(float(lens.max()), 4)})
        if g % snap_every == 0 or g == gens:
            ghosts = [pop[order[k]].tolist() for k in range(1, min(pop_n, 6))]
            snaps.append({"gen": g, "best": best.tolist(), "length": round(best_len, 4), "ghosts": ghosts,
                          "diversity": round(float(len({tuple(t) for t in pop}) / pop_n), 3)})
        if g == gens:
            break
        new = [pop[i].copy() for i in order[:elite]]
        while len(new) < pop_n:
            def pick():
                c = rng.choice(pop_n, 3, replace=False)
                return pop[c[np.argmin(lens[c])]]
            a, b = pick(), pick()
            child = ox(a, b) if crossover == "ordered" else a.copy()
            new.append(mutate(child))
        pop = new
    # nearest-neighbour heuristic for comparison
    unv, cur, nn = set(range(1, n)), 0, [0]
    while unv:
        cur = min(unv, key=lambda j: D[cur, j])
        unv.remove(cur)
        nn.append(cur)
    nn_len = _tour_len(np.array(nn), D)
    rand_len = float(np.mean([_tour_len(rng.permutation(n), D) for _ in range(50)]))
    return {
        "cities": np.round(P, 4).tolist(), "n": n, "layout": layout, "population": pop_n, "generations": gens,
        "mutation": mut, "elite": elite, "history": history[:: max(1, gens // 200)] + ([history[-1]] if gens % max(1, gens // 200) else []),
        "snapshots": snaps, "best": best.tolist(), "best_length": round(best_len, 4),
        "nearest_neighbour": {"tour": nn, "length": round(nn_len, 4)}, "random_length": round(rand_len, 4),
        "improvement_pct": round(100 * (1 - best_len / rand_len), 1),
    }


def n_queens(n: int = 8, method: str = "backtracking", find_all: bool = False, max_events: int = 6000) -> dict:
    """Place N queens row by row. Records place / conflict / remove events for the animation.

    method: 'brute' (place then check), 'backtracking' (check before placing),
            'forward' (forward checking: prune rows that have no safe square left)."""
    n = int(min(14, max(4, n)))
    max_events = int(min(20000, max(100, max_events)))
    events: list[list] = []
    cols, d1, d2 = set(), set(), set()
    queens: list[int] = []
    solutions: list[list[int]] = []
    stats = {"nodes": 0, "backtracks": 0, "pruned": 0}

    def ev(*e):
        if len(events) < max_events:
            events.append(list(e))

    def safe(r, c):
        return c not in cols and (r - c) not in d1 and (r + c) not in d2

    def solve(r):
        if r == n:
            solutions.append(list(queens))
            ev("solution", len(solutions))
            return not find_all
        for c in range(n):
            stats["nodes"] += 1
            if method == "brute":
                ev("try", r, c)
                if not safe(r, c):
                    ev("conflict", r, c)
                    continue
            elif not safe(r, c):
                continue
            queens.append(c); cols.add(c); d1.add(r - c); d2.add(r + c)
            ev("place", r, c)
            ok = True
            if method == "forward":
                for rr in range(r + 1, n):
                    if not any(safe(rr, cc) for cc in range(n)):
                        ok = False
                        stats["pruned"] += 1
                        ev("dead", rr)
                        break
            if ok and solve(r + 1):
                return True
            queens.pop(); cols.discard(c); d1.discard(r - c); d2.discard(r + c)
            stats["backtracks"] += 1
            ev("remove", r, c)
            if len(solutions) >= 200:
                return True
        return False

    solve(0)
    return {
        "n": n, "method": method, "find_all": bool(find_all), "events": events, "truncated": len(events) >= max_events,
        "solutions": solutions[:24], "solution_count": len(solutions), "solution_count_capped": len(solutions) >= 200,
        **stats, "search_space": n ** n,
    }
