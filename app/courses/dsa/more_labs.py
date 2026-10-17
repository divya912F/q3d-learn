"""DSA labs added in v2.3: dynamic-programming table filler and the recursion-tree explorer."""
from __future__ import annotations


def dp_table(problem: str = "lcs", a: str = "STUDENT", b: str = "SUDDEN", weights: str = "1,3,4,5",
             values: str = "15,20,30,45", capacity: int = 7, coins: str = "1,3,4", amount: int = 10) -> dict:
    """Fill a DP table cell by cell, remembering which earlier cells each value came from, then trace back."""
    fills: list[dict] = []
    if problem in ("lcs", "edit"):
        a = (a or "")[:14].upper()
        b = (b or "")[:14].upper()
        R, C = len(a) + 1, len(b) + 1
        T = [[0] * C for _ in range(R)]
        for i in range(R):
            for j in range(C):
                if problem == "lcs":
                    if i == 0 or j == 0:
                        val, src, why = 0, [], "empty prefix"
                    elif a[i - 1] == b[j - 1]:
                        val, src, why = T[i - 1][j - 1] + 1, [[i - 1, j - 1]], f"match '{a[i - 1]}' → diagonal + 1"
                    else:
                        up, left = T[i - 1][j], T[i][j - 1]
                        val = max(up, left)
                        src = [[i - 1, j]] if up >= left else [[i, j - 1]]
                        why = "no match → max(up, left)"
                else:  # edit distance (Levenshtein)
                    if i == 0:
                        val, src, why = j, ([[0, j - 1]] if j else []), "insert all"
                    elif j == 0:
                        val, src, why = i, [[i - 1, 0]], "delete all"
                    elif a[i - 1] == b[j - 1]:
                        val, src, why = T[i - 1][j - 1], [[i - 1, j - 1]], f"'{a[i - 1]}' matches → free"
                    else:
                        opts = [(T[i - 1][j - 1] + 1, [i - 1, j - 1], "replace"), (T[i - 1][j] + 1, [i - 1, j], "delete"), (T[i][j - 1] + 1, [i, j - 1], "insert")]
                        val, s, why = min(opts, key=lambda o: o[0])
                        src = [s]
                        why = f"{why} (+1)"
                T[i][j] = val
                fills.append({"r": i, "c": j, "v": val, "from": src, "why": why})
        # traceback
        path, ops = [], []
        i, j = R - 1, C - 1
        if problem == "lcs":
            word = []
            while i > 0 and j > 0:
                path.append([i, j])
                if a[i - 1] == b[j - 1]:
                    word.append(a[i - 1]); i -= 1; j -= 1
                elif T[i - 1][j] >= T[i][j - 1]:
                    i -= 1
                else:
                    j -= 1
            answer = "".join(reversed(word))
            result = {"length": T[-1][-1], "subsequence": answer}
        else:
            while i > 0 or j > 0:
                path.append([i, j])
                if i and j and a[i - 1] == b[j - 1] and T[i][j] == T[i - 1][j - 1]:
                    ops.append(f"keep {a[i - 1]}"); i -= 1; j -= 1
                elif i and j and T[i][j] == T[i - 1][j - 1] + 1:
                    ops.append(f"replace {a[i - 1]}→{b[j - 1]}"); i -= 1; j -= 1
                elif i and T[i][j] == T[i - 1][j] + 1:
                    ops.append(f"delete {a[i - 1]}"); i -= 1
                else:
                    ops.append(f"insert {b[j - 1]}"); j -= 1
            result = {"distance": T[-1][-1], "operations": list(reversed(ops))}
        path.append([i, j])
        return {"problem": problem, "rows": [""] + list(a), "cols": [""] + list(b), "table": T, "fills": fills,
                "path": path, "result": result, "cells": R * C, "naive_calls": 3 ** min(len(a), len(b)) if problem == "edit" else 2 ** (len(a) + len(b))}

    if problem == "knapsack":
        w = [max(1, min(20, int(x))) for x in str(weights).split(",") if x.strip()][:8]
        v = [max(0, min(999, int(x))) for x in str(values).split(",") if x.strip()][:len(w)]
        w = w[:len(v)]
        W = int(min(20, max(1, capacity)))
        R, C = len(w) + 1, W + 1
        T = [[0] * C for _ in range(R)]
        for i in range(R):
            for c in range(C):
                if i == 0:
                    val, src, why = 0, [], "no items"
                else:
                    skip = T[i - 1][c]
                    if w[i - 1] <= c and T[i - 1][c - w[i - 1]] + v[i - 1] > skip:
                        val, src, why = T[i - 1][c - w[i - 1]] + v[i - 1], [[i - 1, c - w[i - 1]]], f"take item {i} (w{w[i - 1]}, +{v[i - 1]})"
                    else:
                        val, src, why = skip, [[i - 1, c]], f"skip item {i}" if w[i - 1] > c else f"skip item {i} (better)"
                T[i][c] = val
                fills.append({"r": i, "c": c, "v": val, "from": src, "why": why})
        path, take, c = [], [], W
        for i in range(R - 1, 0, -1):
            path.append([i, c])
            if T[i][c] != T[i - 1][c]:
                take.append(i)
                c -= w[i - 1]
        path.append([0, c])
        return {"problem": problem, "rows": ["∅"] + [f"#{i + 1} w{w[i]} v{v[i]}" for i in range(len(w))], "cols": [str(x) for x in range(C)],
                "table": T, "fills": fills, "path": path, "result": {"best_value": T[-1][-1], "items": sorted(take)},
                "cells": R * C, "naive_calls": 2 ** len(w)}

    if problem == "coins":
        cs = sorted({max(1, min(50, int(x))) for x in str(coins).split(",") if x.strip()})[:6]
        A = int(min(40, max(1, amount)))
        INF = 10 ** 9
        T = [[0] + [INF] * A]
        for x in range(1, A + 1):
            best, src, why = INF, [], "unreachable"
            for coin in cs:
                if coin <= x and T[0][x - coin] + 1 < best:
                    best, src, why = T[0][x - coin] + 1, [[0, x - coin]], f"use coin {coin}: dp[{x - coin}] + 1"
            T[0][x] = best
            fills.append({"r": 0, "c": x, "v": best if best < INF else None, "from": src, "why": why})
        fills.insert(0, {"r": 0, "c": 0, "v": 0, "from": [], "why": "0 coins make 0"})
        used, x, path = [], A, []
        while x > 0 and T[0][x] < INF:
            path.append([0, x])
            for coin in cs:
                if coin <= x and T[0][x - coin] == T[0][x] - 1:
                    used.append(coin); x -= coin; break
        path.append([0, x])
        greedy, g = [], A
        for coin in reversed(cs):
            while g >= coin:
                greedy.append(coin); g -= coin
        return {"problem": problem, "rows": ["dp"], "cols": [str(x) for x in range(A + 1)],
                "table": [[v if v < INF else None for v in T[0]]], "fills": fills, "path": path,
                "result": {"min_coins": T[0][A] if T[0][A] < INF else None, "coins_used": used,
                           "greedy": greedy if g == 0 else None, "greedy_count": len(greedy) if g == 0 else None},
                "cells": A + 1, "naive_calls": None}
    raise ValueError(f"unknown problem {problem}")


def recursion_tree(problem: str = "fib", n: int = 6, memo: bool = False) -> dict:
    """Record every call (id, parent, label, return value, cache hit) in call order."""
    nodes: list[dict] = []
    cache: dict = {}
    moves: list[list[int]] = []

    def add(parent, label, depth):
        nodes.append({"id": len(nodes), "parent": parent, "label": label, "depth": depth, "value": None, "hit": False, "end": None})
        return len(nodes) - 1

    clock = [0]

    def fib(k, parent, depth):
        me = add(parent, f"fib({k})", depth)
        if memo and k in cache:
            nodes[me].update(value=cache[k], hit=True)
        elif k < 2:
            nodes[me]["value"] = k
        else:
            v = fib(k - 1, me, depth + 1) + fib(k - 2, me, depth + 1)
            nodes[me]["value"] = v
            if memo:
                cache[k] = v
        clock[0] += 1
        nodes[me]["end"] = clock[0]
        return nodes[me]["value"]

    def hanoi(k, a, b, c, parent, depth):
        me = add(parent, f"move {k}: {'ABC'[a]}→{'ABC'[c]}", depth)
        if k == 1:
            moves.append([1, a, c])
        else:
            hanoi(k - 1, a, c, b, me, depth + 1)
            moves.append([k, a, c])
            hanoi(k - 1, b, a, c, me, depth + 1)
        nodes[me]["value"] = 2 ** k - 1
        clock[0] += 1
        nodes[me]["end"] = clock[0]

    def power(x, k, parent, depth):
        me = add(parent, f"pow(2,{k})", depth)
        if k == 0:
            v = 1
        else:
            half = power(x, k // 2, me, depth + 1)
            v = half * half * (x if k % 2 else 1)
        nodes[me]["value"] = v
        clock[0] += 1
        nodes[me]["end"] = clock[0]
        return v

    def subsets(items, i, chosen, parent, depth):
        me = add(parent, "{" + ",".join(chosen) + "}" if i == len(items) else ("+" + items[i] if chosen else f"[{i}]"), depth)
        if i == len(items):
            nodes[me]["value"] = 1
        else:
            subsets(items, i + 1, chosen + [items[i]], me, depth + 1)
            subsets(items, i + 1, chosen, me, depth + 1)
            nodes[me]["value"] = 2 ** (len(items) - i)
        clock[0] += 1
        nodes[me]["end"] = clock[0]

    if problem == "fib":
        n = int(min(15 if memo else 11, max(1, n)))
        result = fib(n, None, 0)
    elif problem == "hanoi":
        n = int(min(6, max(1, n)))
        hanoi(n, 0, 1, 2, None, 0)
        result = 2 ** n - 1
    elif problem == "power":
        n = int(min(1000, max(0, n)))
        result = power(2, n, None, 0)
        result = str(result) if result > 10 ** 15 else result
    elif problem == "subsets":
        n = int(min(5, max(1, n)))
        subsets(list("ABCDE"[:n]), 0, [], None, 0)
        result = 2 ** n
    else:
        raise ValueError(f"unknown problem {problem}")
    return {"problem": problem, "n": n, "memo": bool(memo), "nodes": nodes, "calls": len(nodes),
            "max_depth": max(nd["depth"] for nd in nodes) + 1, "cache_hits": sum(nd["hit"] for nd in nodes),
            "result": result, "moves": moves}
