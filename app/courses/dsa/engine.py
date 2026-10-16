"""Data Structures & Algorithms engine.

Everything the DSA labs animate is produced here by running the real algorithm and recording an
event trace, so the visual is always faithful to the code:

* sorting  — compact events ``["c", i, j]`` compare, ``["s", i, j]`` swap, ``["w", i, v]`` write,
             ``["p", i]`` pivot, ``["d", i]`` final position; plus exact comparison/write counts
* graphs   — BFS, DFS, Dijkstra, Prim and Kruskal on a seeded weighted graph with a ready-made layout
* trees    — BST vs. AVL insert/delete snapshots (with every rotation), heights and traversals
"""
from __future__ import annotations

import heapq
import math
import random
from collections import deque

SORTS = ["bubble", "insertion", "selection", "merge", "quick", "heap"]
ORDERS = ["random", "reversed", "nearly", "few"]
MAX_N = 64


# ------------------------------------------------------------------ sorting
def make_array(n: int = 24, order: str = "random", seed: int = 7) -> list[int]:
    n = max(4, min(MAX_N, int(n)))
    rng = random.Random(seed)
    if order == "few":
        return [rng.choice([12, 30, 55, 80]) + rng.randint(0, 2) for _ in range(n)]
    base = [round(5 + 95 * (i + 1) / n) for i in range(n)]
    if order == "reversed":
        return base[::-1]
    if order == "nearly":
        a = base[:]
        for _ in range(max(1, n // 10)):
            i = rng.randrange(n - 1)
            a[i], a[i + 1] = a[i + 1], a[i]
        return a
    rng.shuffle(base)
    return base


class _Tracer:
    def __init__(self, a: list[int]):
        self.a = list(a)
        self.ev: list[list] = []
        self.comparisons = 0
        self.writes = 0

    def lt(self, i: int, j: int) -> bool:
        self.comparisons += 1
        self.ev.append(["c", i, j])
        return self.a[i] < self.a[j]

    def le_val(self, i: int, v: int) -> bool:  # compare a[i] with a held value
        self.comparisons += 1
        self.ev.append(["c", i, i])
        return self.a[i] <= v

    def swap(self, i: int, j: int) -> None:
        if i == j:
            return
        self.a[i], self.a[j] = self.a[j], self.a[i]
        self.writes += 2
        self.ev.append(["s", i, j])

    def write(self, i: int, v: int) -> None:
        self.a[i] = v
        self.writes += 1
        self.ev.append(["w", i, v])

    def done(self, i: int) -> None:
        self.ev.append(["d", i])


def _bubble(t: _Tracer) -> None:
    n = len(t.a)
    for end in range(n - 1, 0, -1):
        swapped = False
        for i in range(end):
            if t.lt(i + 1, i):
                t.swap(i, i + 1)
                swapped = True
        t.done(end)
        if not swapped:
            break
    for i in range(n):
        t.done(i)


def _insertion(t: _Tracer) -> None:
    for i in range(1, len(t.a)):
        j = i
        while j > 0 and t.lt(j, j - 1):
            t.swap(j, j - 1)
            j -= 1
    for i in range(len(t.a)):
        t.done(i)


def _selection(t: _Tracer) -> None:
    n = len(t.a)
    for i in range(n - 1):
        m = i
        for j in range(i + 1, n):
            if t.lt(j, m):
                m = j
        t.swap(i, m)
        t.done(i)
    t.done(n - 1)


def _merge(t: _Tracer) -> None:
    def rec(lo: int, hi: int) -> None:
        if hi - lo <= 1:
            return
        mid = (lo + hi) // 2
        rec(lo, mid)
        rec(mid, hi)
        left, right = t.a[lo:mid], t.a[mid:hi]
        i = j = 0
        k = lo
        while i < len(left) and j < len(right):
            t.comparisons += 1
            t.ev.append(["c", lo + i, mid + j])
            if left[i] <= right[j]:
                t.write(k, left[i]); i += 1
            else:
                t.write(k, right[j]); j += 1
            k += 1
        while i < len(left):
            t.write(k, left[i]); i += 1; k += 1
        while j < len(right):
            t.write(k, right[j]); j += 1; k += 1
    rec(0, len(t.a))
    for i in range(len(t.a)):
        t.done(i)


def _quick(t: _Tracer) -> None:
    def part(lo: int, hi: int) -> int:  # Lomuto, last element as pivot
        t.ev.append(["p", hi])
        i = lo
        for j in range(lo, hi):
            if t.lt(j, hi):
                t.swap(i, j)
                i += 1
        t.swap(i, hi)
        t.done(i)
        return i

    stack = [(0, len(t.a) - 1)]
    while stack:
        lo, hi = stack.pop()
        if lo > hi:
            continue
        if lo == hi:
            t.done(lo)
            continue
        p = part(lo, hi)
        stack.append((p + 1, hi))
        stack.append((lo, p - 1))


def _heap(t: _Tracer) -> None:
    n = len(t.a)

    def sift(i: int, size: int) -> None:
        while True:
            l, r, big = 2 * i + 1, 2 * i + 2, i
            if l < size and t.lt(big, l):
                big = l
            if r < size and t.lt(big, r):
                big = r
            if big == i:
                return
            t.swap(i, big)
            i = big

    for i in range(n // 2 - 1, -1, -1):
        sift(i, n)
    for end in range(n - 1, 0, -1):
        t.swap(0, end)
        t.done(end)
        sift(0, end)
    t.done(0)


_IMPL = {"bubble": _bubble, "insertion": _insertion, "selection": _selection, "merge": _merge, "quick": _quick, "heap": _heap}
BIG_O = {
    "bubble": ("O(n)", "O(n²)", "O(n²)", "O(1)", True), "insertion": ("O(n)", "O(n²)", "O(n²)", "O(1)", True),
    "selection": ("O(n²)", "O(n²)", "O(n²)", "O(1)", False), "merge": ("O(n log n)", "O(n log n)", "O(n log n)", "O(n)", True),
    "quick": ("O(n log n)", "O(n log n)", "O(n²)", "O(log n)", False), "heap": ("O(n log n)", "O(n log n)", "O(n log n)", "O(1)", False),
}


def sort_trace(algorithm: str = "quick", n: int = 24, order: str = "random", seed: int = 7, values: list[int] | None = None) -> dict:
    if algorithm not in _IMPL:
        raise ValueError(f"unknown algorithm '{algorithm}'")
    a = [int(v) for v in values][:MAX_N] if values else make_array(n, order, seed)
    t = _Tracer(a)
    _IMPL[algorithm](t)
    assert t.a == sorted(a)
    best, avg, worst, space, stable = BIG_O[algorithm]
    return {"algorithm": algorithm, "order": order, "n": len(a), "values": a, "sorted": t.a, "events": t.ev,
            "comparisons": t.comparisons, "writes": t.writes, "steps": len(t.ev),
            "complexity": {"best": best, "average": avg, "worst": worst, "space": space, "stable": stable}}


def sort_race(n: int = 32, order: str = "random", seed: int = 7, algorithms: list[str] | None = None) -> dict:
    algs = [a for a in (algorithms or SORTS) if a in _IMPL]
    values = make_array(n, order, seed)
    runs = [sort_trace(a, values=values) for a in algs]
    sizes = [8, 16, 32, 64, 128, 256]
    growth = {}
    for alg in algs:  # how comparisons grow with n for this input shape (no events kept)
        pts = []
        for m in sizes:
            t = _Tracer(make_array(min(m, 256), order, seed) if m <= MAX_N else _big_array(m, order, seed))
            _IMPL[alg](t)
            pts.append(t.comparisons)
        growth[alg] = pts
    return {"order": order, "n": len(values), "values": values, "runs": runs, "growth": {"sizes": sizes, "comparisons": growth},
            "winner": min(runs, key=lambda r: (r["comparisons"] + r["writes"]))["algorithm"]}


def _big_array(m: int, order: str, seed: int) -> list[int]:
    rng = random.Random(seed)
    base = list(range(1, m + 1))
    if order == "reversed":
        return base[::-1]
    if order == "nearly":
        for _ in range(max(1, m // 10)):
            i = rng.randrange(m - 1)
            base[i], base[i + 1] = base[i + 1], base[i]
        return base
    if order == "few":
        return [rng.choice([1, 2, 3, 4]) for _ in range(m)]
    rng.shuffle(base)
    return base


# ------------------------------------------------------------------ graphs
GRAPH_ALGOS = ["bfs", "dfs", "dijkstra", "prim", "kruskal"]


def make_graph(nodes: int = 10, density: float = 0.35, seed: int = 3, weighted: bool = True) -> dict:
    nodes = max(4, min(18, int(nodes)))
    rng = random.Random(seed)
    # points on a jittered ring → readable layout without crossings everywhere
    pos = []
    for i in range(nodes):
        ang = 2 * math.pi * i / nodes + rng.uniform(-0.18, 0.18)
        rad = rng.uniform(0.62, 0.95)
        pos.append([round(0.5 + 0.45 * rad * math.cos(ang), 4), round(0.5 + 0.45 * rad * math.sin(ang), 4)])
    edges: dict[tuple[int, int], int] = {}

    def w(i: int, j: int) -> int:
        d = math.dist(pos[i], pos[j])
        return max(1, round(d * 20 + rng.randint(0, 4))) if weighted else 1

    for i in range(nodes):  # ring keeps it connected
        j = (i + 1) % nodes
        edges[(min(i, j), max(i, j))] = w(i, j)
    for i in range(nodes):
        for j in range(i + 2, nodes):
            if (i, j) in edges or (i == 0 and j == nodes - 1):
                continue
            if rng.random() < density * (1.2 - math.dist(pos[i], pos[j])):
                edges[(i, j)] = w(i, j)
    labels = [chr(65 + i) for i in range(nodes)]
    return {"nodes": [{"id": i, "label": labels[i], "x": p[0], "y": p[1]} for i, p in enumerate(pos)],
            "edges": [{"u": u, "v": v, "w": wt} for (u, v), wt in sorted(edges.items())]}


def _adj(g: dict) -> dict[int, list[tuple[int, int]]]:
    adj: dict[int, list[tuple[int, int]]] = {n["id"]: [] for n in g["nodes"]}
    for e in g["edges"]:
        adj[e["u"]].append((e["v"], e["w"]))
        adj[e["v"]].append((e["u"], e["w"]))
    for k in adj:
        adj[k].sort()
    return adj


def graph_run(algorithm: str = "dijkstra", nodes: int = 10, density: float = 0.35, seed: int = 3, start: int = 0,
              graph: dict | None = None) -> dict:
    if algorithm not in GRAPH_ALGOS:
        raise ValueError(f"unknown algorithm '{algorithm}'")
    g = graph or make_graph(nodes, density, seed)
    n = len(g["nodes"])
    start = max(0, min(n - 1, int(start)))
    adj = _adj(g)
    events: list[list] = []
    out: dict = {"algorithm": algorithm, "graph": g, "start": start}
    if algorithm in ("bfs", "dfs"):
        order: list[int] = []
        parent: dict[int, int | None] = {}
        if algorithm == "bfs":
            parent[start] = None
            q = deque([start])
            events.append(["frontier", start, None])
            while q:
                u = q.popleft()
                order.append(u)
                events.append(["visit", u, parent[u]])
                for v, _ in adj[u]:
                    if v not in parent:
                        parent[v] = u
                        q.append(v)
                        events.append(["frontier", v, u])
        else:
            stack: list[tuple[int, int | None]] = [(start, None)]
            events.append(["frontier", start, None])
            while stack:
                u, p = stack.pop()
                if u in parent:
                    continue
                parent[u] = p
                order.append(u)
                events.append(["visit", u, p])
                for v, _ in reversed(adj[u]):
                    if v not in parent:
                        stack.append((v, u))
                        events.append(["frontier", v, u])
        depth: dict[int, int] = {}
        for u in order:
            depth[u] = 0 if parent[u] is None else depth[parent[u]] + 1
        out |= {"order": order, "tree": [[p, c] for c, p in parent.items() if p is not None], "levels": depth}
    elif algorithm == "dijkstra":
        dist = {i: math.inf for i in range(n)}
        prev: dict[int, int | None] = {start: None}
        dist[start] = 0
        pq = [(0, start)]
        done: set[int] = set()
        while pq:
            d, u = heapq.heappop(pq)
            if u in done:
                continue
            done.add(u)
            events.append(["visit", u, prev.get(u), d])
            for v, w in adj[u]:
                if v in done:
                    continue
                nd = d + w
                if nd < dist[v]:
                    dist[v] = nd
                    prev[v] = u
                    heapq.heappush(pq, (nd, v))
                    events.append(["relax", u, v, nd])
                else:
                    events.append(["skip", u, v, nd])
        out |= {"dist": [None if dist[i] == math.inf else dist[i] for i in range(n)],
                "tree": [[p, c] for c, p in prev.items() if p is not None],
                "paths": {i: _path(prev, i) for i in range(n) if dist[i] != math.inf}}
    elif algorithm == "prim":
        in_tree = {start}
        pq = [(w, start, v) for v, w in adj[start]]
        heapq.heapify(pq)
        tree, total = [], 0
        events.append(["visit", start, None])
        while pq and len(in_tree) < n:
            w, u, v = heapq.heappop(pq)
            events.append(["consider", u, v, w])
            if v in in_tree:
                events.append(["reject", u, v, w])
                continue
            in_tree.add(v)
            tree.append([u, v]); total += w
            events.append(["take", u, v, w])
            for x, wx in adj[v]:
                if x not in in_tree:
                    heapq.heappush(pq, (wx, v, x))
        out |= {"tree": tree, "total": total}
    else:  # kruskal
        parent = list(range(n))

        def find(x: int) -> int:
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        tree, total = [], 0
        for e in sorted(g["edges"], key=lambda e: (e["w"], e["u"], e["v"])):
            u, v, w = e["u"], e["v"], e["w"]
            events.append(["consider", u, v, w])
            ru, rv = find(u), find(v)
            if ru == rv:
                events.append(["reject", u, v, w])
                continue
            parent[ru] = rv
            tree.append([u, v]); total += w
            events.append(["take", u, v, w])
        out |= {"tree": tree, "total": total}
    out["events"] = events
    return out


def _path(prev: dict, t: int) -> list[int]:
    path = []
    cur: int | None = t
    while cur is not None:
        path.append(cur)
        cur = prev.get(cur)
    return path[::-1]


# ------------------------------------------------------------------ trees (BST / AVL)
class _Node:
    __slots__ = ("key", "left", "right", "h")

    def __init__(self, key: int):
        self.key, self.left, self.right, self.h = key, None, None, 1


def _h(n: _Node | None) -> int:
    return n.h if n else 0


def _fix(n: _Node) -> None:
    n.h = 1 + max(_h(n.left), _h(n.right))


def _rot_right(y: _Node, log: list) -> _Node:
    x = y.left
    y.left, x.right = x.right, y
    _fix(y); _fix(x)
    log.append(f"rotate right at {y.key}")
    return x


def _rot_left(x: _Node, log: list) -> _Node:
    y = x.right
    x.right, y.left = y.left, x
    _fix(x); _fix(y)
    log.append(f"rotate left at {x.key}")
    return y


def _balance(n: _Node, log: list) -> _Node:
    _fix(n)
    bf = _h(n.left) - _h(n.right)
    if bf > 1:
        if _h(n.left.left) < _h(n.left.right):
            n.left = _rot_left(n.left, log)
        return _rot_right(n, log)
    if bf < -1:
        if _h(n.right.right) < _h(n.right.left):
            n.right = _rot_right(n.right, log)
        return _rot_left(n, log)
    return n


def _insert(n: _Node | None, key: int, avl: bool, log: list, path: list) -> _Node:
    if n is None:
        return _Node(key)
    path.append(n.key)
    if key < n.key:
        n.left = _insert(n.left, key, avl, log, path)
    elif key > n.key:
        n.right = _insert(n.right, key, avl, log, path)
    else:
        return n
    return _balance(n, log) if avl else (_fix(n) or n)


def _min(n: _Node) -> _Node:
    while n.left:
        n = n.left
    return n


def _delete(n: _Node | None, key: int, avl: bool, log: list, path: list) -> _Node | None:
    if n is None:
        return None
    path.append(n.key)
    if key < n.key:
        n.left = _delete(n.left, key, avl, log, path)
    elif key > n.key:
        n.right = _delete(n.right, key, avl, log, path)
    else:
        if not n.left or not n.right:
            return n.left or n.right
        s = _min(n.right)
        n.key = s.key
        n.right = _delete(n.right, s.key, avl, log, [])
    return _balance(n, log) if avl else (_fix(n) or n)


def _export(n: _Node | None) -> dict | None:
    if n is None:
        return None
    return {"key": n.key, "h": n.h, "bf": _h(n.left) - _h(n.right), "left": _export(n.left), "right": _export(n.right)}


def _traversals(n: _Node | None) -> dict:
    ino, pre, post, level = [], [], [], []

    def walk(x: _Node | None) -> None:
        if not x:
            return
        pre.append(x.key); walk(x.left); ino.append(x.key); walk(x.right); post.append(x.key)

    walk(n)
    q = deque([n] if n else [])
    while q:
        x = q.popleft()
        level.append(x.key)
        q.extend(c for c in (x.left, x.right) if c)
    return {"inorder": ino, "preorder": pre, "postorder": post, "levelorder": level}


def tree_ops(kind: str = "avl", values: list[int] | None = None, delete: list[int] | None = None, preset: str = "random", seed: int = 5) -> dict:
    if kind not in ("bst", "avl"):
        raise ValueError("kind must be 'bst' or 'avl'")
    if not values:
        n = 12
        if preset == "sorted":
            values = list(range(10, 10 + 5 * n, 5))
        else:
            rng = random.Random(seed)
            values = rng.sample(range(1, 100), n)
    values = [int(v) for v in values][:31]
    avl = kind == "avl"
    root = None
    snaps = []
    for v in values:
        log: list[str] = []
        path: list[int] = []
        root = _insert(root, v, avl, log, path)
        snaps.append({"op": "insert", "key": v, "path": path, "rotations": log, "tree": _export(root), "height": _h(root)})
    for v in (delete or [])[:10]:
        log, path = [], []
        root = _delete(root, int(v), avl, log, path)
        snaps.append({"op": "delete", "key": int(v), "path": path, "rotations": log, "tree": _export(root), "height": _h(root)})
    count = len(set(values) - set(int(d) for d in (delete or [])))
    return {"kind": kind, "values": values, "snapshots": snaps, "height": _h(root), "nodes": count,
            "min_height": math.ceil(math.log2(count + 1)) if count else 0,
            "rotations": sum(len(s["rotations"]) for s in snaps), "traversals": _traversals(root)}
