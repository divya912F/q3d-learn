"""Classic-AI engine: search on grids, minimax with alpha–beta, tabular Q-learning and a tiny
n-gram language model. Every algorithm returns a step-by-step trace for visualisation."""
from __future__ import annotations

import heapq
import math
import re
from collections import Counter, defaultdict, deque
from typing import Any

import numpy as np

# ================================================================================ search
MAX_ROWS, MAX_COLS = 30, 44
MOVES = [(-1, 0), (0, 1), (1, 0), (0, -1)]


def generate_maze(rows: int = 21, cols: int = 31, seed: int = 0, loops: float = 0.12) -> list[list[int]]:
    """Randomised DFS maze (+ a few extra openings so there are multiple routes)."""
    rows, cols = rows | 1, cols | 1
    rng = np.random.default_rng(seed)
    walls = [[1] * cols for _ in range(rows)]
    stack = [(1, 1)]
    walls[1][1] = 0
    while stack:
        r, c = stack[-1]
        nbrs = [(r + dr * 2, c + dc * 2, dr, dc) for dr, dc in MOVES if 0 < r + dr * 2 < rows - 1 and 0 < c + dc * 2 < cols - 1 and walls[r + dr * 2][c + dc * 2]]
        if not nbrs:
            stack.pop()
            continue
        nr, nc, dr, dc = nbrs[rng.integers(len(nbrs))]
        walls[r + dr][c + dc] = 0
        walls[nr][nc] = 0
        stack.append((nr, nc))
    for r in range(1, rows - 1):
        for c in range(1, cols - 1):
            if walls[r][c] and rng.random() < loops:
                walls[r][c] = 0
    return [[r, c] for r in range(rows) for c in range(cols) if walls[r][c]]


def maze_preset(name: str) -> dict:
    if name == "maze":
        rows, cols = 21, 31
        walls = generate_maze(rows, cols, seed=4)
        return {"rows": rows, "cols": cols, "walls": walls, "mud": [], "start": [1, 1], "goal": [rows - 2, cols - 2]}
    if name == "mud":
        rows, cols = 18, 30
        walls = [[r, 14] for r in range(0, 13)] + [[r, 7] for r in range(5, 18)] + [[r, 22] for r in range(5, 18)]
        mud = [[r, c] for r in range(13, 18) for c in range(8, 22)]
        return {"rows": rows, "cols": cols, "walls": walls, "mud": mud, "start": [9, 2], "goal": [9, 27]}
    if name == "trap":
        rows, cols = 18, 30
        walls = [[r, 20] for r in range(3, 15)] + [[3, c] for c in range(12, 21)] + [[14, c] for c in range(12, 21)]
        return {"rows": rows, "cols": cols, "walls": walls, "mud": [], "start": [9, 4], "goal": [9, 26]}
    return {"rows": 18, "cols": 30, "walls": [], "mud": [], "start": [9, 4], "goal": [9, 25]}


def _h(a, b, kind):
    if kind == "manhattan":
        return abs(a[0] - b[0]) + abs(a[1] - b[1])
    if kind == "euclidean":
        return math.hypot(a[0] - b[0], a[1] - b[1])
    return 0.0


def search(rows: int, cols: int, walls: list, start: list, goal: list, algorithm: str = "astar", heuristic: str = "manhattan",
           mud: list | None = None, mud_cost: float = 5.0) -> dict:
    rows, cols = int(min(max(rows, 2), MAX_ROWS)), int(min(max(cols, 2), MAX_COLS))
    wall = {tuple(w) for w in walls}
    mud_set = {tuple(m) for m in (mud or [])}
    start, goal = tuple(start), tuple(goal)
    for p in (start, goal):
        if not (0 <= p[0] < rows and 0 <= p[1] < cols):
            raise ValueError("Start and goal must be inside the grid")
    wall.discard(start)
    wall.discard(goal)

    def cost(p):
        return mud_cost if p in mud_set else 1.0

    def neighbours(p):
        for dr, dc in MOVES:
            q = (p[0] + dr, p[1] + dc)
            if 0 <= q[0] < rows and 0 <= q[1] < cols and q not in wall:
                yield q

    order: list[list[int]] = []
    frontier_sizes: list[int] = []
    parent: dict = {start: None}
    g = {start: 0.0}
    found = False
    tie = 0
    if algorithm == "bfs":
        q = deque([start])
        seen = {start}
        while q:
            p = q.popleft()
            order.append(list(p))
            frontier_sizes.append(len(q))
            if p == goal:
                found = True
                break
            for nb in neighbours(p):
                if nb not in seen:
                    seen.add(nb)
                    parent[nb] = p
                    g[nb] = g[p] + cost(nb)
                    q.append(nb)
    elif algorithm == "dfs":
        st = [start]
        seen = set()
        while st:
            p = st.pop()
            if p in seen:
                continue
            seen.add(p)
            order.append(list(p))
            frontier_sizes.append(len(st))
            if p == goal:
                found = True
                break
            for nb in reversed(list(neighbours(p))):
                if nb not in seen:
                    parent[nb] = p
                    g[nb] = g[p] + cost(nb)
                    st.append(nb)
    elif algorithm in ("ucs", "greedy", "astar"):
        pq = [(0.0, 0, start)]
        closed = set()
        while pq:
            _, _, p = heapq.heappop(pq)
            if p in closed:
                continue
            closed.add(p)
            order.append(list(p))
            frontier_sizes.append(len(pq))
            if p == goal:
                found = True
                break
            for nb in neighbours(p):
                ng = g[p] + cost(nb)
                if nb in closed:
                    continue
                if algorithm == "greedy":
                    if nb in g:
                        continue
                    g[nb], parent[nb] = ng, p
                    pri = _h(nb, goal, heuristic if heuristic != "zero" else "manhattan")
                else:
                    if nb in g and g[nb] <= ng:
                        continue
                    g[nb], parent[nb] = ng, p
                    pri = ng + (_h(nb, goal, heuristic) if algorithm == "astar" else 0)
                tie += 1
                heapq.heappush(pq, (pri, tie, nb))
    else:
        raise ValueError(f"Unknown algorithm '{algorithm}'")

    path = []
    if found:
        p = goal
        while p is not None:
            path.append(list(p))
            p = parent[p]
        path.reverse()
    path_cost = sum(cost(tuple(p)) for p in path[1:]) if path else None
    return {"order": order, "path": path, "found": found, "expanded": len(order), "path_cost": path_cost,
            "path_length": len(path) - 1 if path else None, "max_frontier": max(frontier_sizes) if frontier_sizes else 0,
            "algorithm": algorithm, "heuristic": heuristic}


def optimal_cost(**kw) -> float | None:
    return search(**{**kw, "algorithm": "ucs"})["path_cost"]


# ============================================================================== minimax
LINES = [(0, 1, 2), (3, 4, 5), (6, 7, 8), (0, 3, 6), (1, 4, 7), (2, 5, 8), (0, 4, 8), (2, 4, 6)]


def winner(b: list) -> str | None:
    for a, c, d in LINES:
        if b[a] and b[a] == b[c] == b[d]:
            return b[a]
    return "draw" if all(b) else None


def minimax_analyse(board: list, player: str = "O", alpha_beta: bool = True, max_depth: int = 9) -> dict:
    """Score every legal move for `player` (+1 win, 0 draw, −1 loss, faster wins score higher)."""
    board = [c if c in ("X", "O") else "" for c in board][:9]
    if len(board) != 9:
        raise ValueError("Board must have 9 cells")
    opp = "X" if player == "O" else "O"
    stats = {"nodes": 0}

    def mm(b, turn, depth, alpha, beta):
        stats["nodes"] += 1
        w = winner(b)
        if w == player:
            return 10 - depth
        if w == opp:
            return depth - 10
        if w == "draw" or depth >= max_depth:
            return 0
        maximizing = turn == player
        best = -math.inf if maximizing else math.inf
        for i in range(9):
            if b[i]:
                continue
            b[i] = turn
            v = mm(b, opp if turn == player else player, depth + 1, alpha, beta)
            b[i] = ""
            if maximizing:
                best = max(best, v)
                alpha = max(alpha, v)
            else:
                best = min(best, v)
                beta = min(beta, v)
            if alpha_beta and beta <= alpha:
                break
        return best

    if winner(board):
        return {"scores": {}, "best": None, "nodes": 0, "winner": winner(board)}
    scores = {}
    for i in range(9):
        if board[i]:
            continue
        board[i] = player
        scores[i] = mm(board, opp, 1, -math.inf, math.inf)
        board[i] = ""
    best_score = max(scores.values())
    best_moves = [i for i, s in scores.items() if s == best_score]
    # nodes needed without pruning, for comparison
    plain = None
    if alpha_beta and sum(1 for c in board if not c) <= 8:
        plain = minimax_analyse(board, player, False, max_depth)["nodes"]
    return {"scores": {str(k): v for k, v in scores.items()}, "best": best_moves[0], "best_moves": best_moves,
            "nodes": stats["nodes"], "nodes_without_pruning": plain, "winner": None,
            "verdict": "win" if best_score > 0 else ("loss" if best_score < 0 else "draw")}


# ============================================================================ Q-learning
GRIDWORLD = [
    "S....#....",
    ".##..#.##.",
    "....X...#.",
    ".#.###.#..",
    ".#...X.#.G",
    "...#......",
]


def parse_world(layout: list[str]) -> dict:
    cells = {"walls": [], "pits": [], "start": None, "goal": None}
    for r, row in enumerate(layout):
        for c, ch in enumerate(row):
            if ch == "#":
                cells["walls"].append([r, c])
            elif ch == "X":
                cells["pits"].append([r, c])
            elif ch == "S":
                cells["start"] = [r, c]
            elif ch == "G":
                cells["goal"] = [r, c]
    return {"rows": len(layout), "cols": len(layout[0]), **cells}


def q_learning(episodes: int = 300, alpha: float = 0.5, gamma: float = 0.95, epsilon: float = 0.3, epsilon_decay: float = 0.99,
               step_reward: float = -0.04, layout: list[str] | None = None, seed: int = 0, slip: float = 0.0) -> dict:
    layout = layout or GRIDWORLD
    world = parse_world(layout)
    R, C = world["rows"], world["cols"]
    walls = {tuple(w) for w in world["walls"]}
    pits = {tuple(p) for p in world["pits"]}
    start, goal = tuple(world["start"]), tuple(world["goal"])
    rng = np.random.default_rng(seed)
    Q = np.zeros((R, C, 4))
    episodes = int(min(max(episodes, 1), 3000))
    max_steps = R * C * 3

    def step(s, a):
        if slip and rng.random() < slip:
            a = int(rng.integers(4))
        nr, nc = s[0] + MOVES[a][0], s[1] + MOVES[a][1]
        if not (0 <= nr < R and 0 <= nc < C) or (nr, nc) in walls:
            nr, nc = s
        ns = (nr, nc)
        if ns == goal:
            return ns, 10.0, True
        if ns in pits:
            return ns, -10.0, True
        return ns, step_reward, False

    rewards, successes, steps_list, snaps = [], [], [], []
    eps = epsilon
    every = max(1, episodes // 24)
    for ep in range(episodes):
        s, total, done, n = start, 0.0, False, 0
        while not done and n < max_steps:
            a = int(rng.integers(4)) if rng.random() < eps else int(np.argmax(Q[s] + rng.random(4) * 1e-9))
            ns, rwd, done = step(s, a)
            target = rwd if done else rwd + gamma * Q[ns].max()
            Q[s][a] += alpha * (target - Q[s][a])
            s, total, n = ns, total + rwd, n + 1
        rewards.append(round(total, 3))
        successes.append(s == goal)
        steps_list.append(n)
        eps *= epsilon_decay
        if ep % every == 0 or ep == episodes - 1:
            snaps.append({"episode": ep + 1, "values": np.round(Q.max(axis=2), 2).tolist(), "policy": Q.argmax(axis=2).tolist(),
                          "epsilon": round(eps, 3)})

    # greedy roll-out of the learned policy
    s, path, done = start, [list(start)], False
    for _ in range(max_steps):
        a = int(np.argmax(Q[s]))
        nr, nc = s[0] + MOVES[a][0], s[1] + MOVES[a][1]
        if not (0 <= nr < R and 0 <= nc < C) or (nr, nc) in walls:
            break
        s = (nr, nc)
        path.append(list(s))
        if s in (goal,) or s in pits:
            done = True
            break
        if path.count(list(s)) > 2:
            break
    window = successes[-50:]
    return {"world": world, "rewards": rewards, "successes": [bool(x) for x in successes], "steps": steps_list, "snapshots": snaps,
            "greedy_path": path, "greedy_reaches_goal": bool(done and s == goal),
            "final": {"success_rate_last50": round(sum(window) / len(window), 3), "avg_reward_last50": round(float(np.mean(rewards[-50:])), 3),
                      "greedy_steps": len(path) - 1, "episodes": episodes}}


# ======================================================================= language model
CORPUS = """
students learn best when they study a little every day . students who sleep well remember more .
a good study plan has short sessions and regular breaks . practice problems help students learn faster .
machine learning models learn patterns from data . a model learns from examples and makes predictions .
data science turns raw data into useful insight . good data makes good models .
artificial intelligence helps computers make smart decisions . an intelligent agent learns from experience .
quantum computers use qubits . a qubit can be in a superposition of zero and one .
the teacher explains the idea and the students ask questions . the students solve the problem together .
every expert was once a beginner . learning is a journey not a race .
the model predicts the next word by looking at the words before it . language models predict the next word .
"""


def tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9']+|[.!?]", text.lower())


class NGram:
    def __init__(self, text: str, n: int = 2):
        self.n = max(1, min(int(n), 4))
        toks = tokenize(text)
        self.vocab = Counter(toks)
        self.table: dict[tuple, Counter] = defaultdict(Counter)
        for i in range(len(toks)):
            for k in range(0, self.n):
                if i - k < 0:
                    continue
                ctx = tuple(toks[i - k:i])
                self.table[ctx][toks[i]] += 1

    def dist(self, context: list[str]) -> tuple[list[tuple[str, float]], int]:
        for k in range(self.n - 1, -1, -1):
            ctx = tuple(context[-k:]) if k else ()
            if k and len(context) < k:
                continue
            counts = self.table.get(ctx)
            if counts:
                total = sum(counts.values())
                return [(w, c / total) for w, c in counts.most_common()], k
        return [], 0


def language_model(text: str | None = None, prompt: str = "the students", n: int = 2, temperature: float = 0.8,
                   length: int = 15, seed: int = 0) -> dict:
    text = (text or CORPUS)[:20000]
    model = NGram(text, n)
    rng = np.random.default_rng(seed)
    ctx = tokenize(prompt) or ["the"]
    steps = []
    generated = []
    for _ in range(int(min(max(length, 1), 60))):
        options, used = model.dist(ctx)
        if not options:
            break
        words = [w for w, _ in options]
        p = np.array([q for _, q in options])
        if temperature <= 0.01:
            choice = 0
        else:
            logits = np.log(p + 1e-12) / temperature
            pt = np.exp(logits - logits.max())
            pt /= pt.sum()
            choice = int(rng.choice(len(words), p=pt))
            p = pt
        steps.append({"context": ctx[-(n - 1):] if n > 1 else [], "backoff": used, "top": [[w, round(float(q), 3)] for w, q in zip(words, p)][:8],
                      "chosen": words[choice]})
        generated.append(words[choice])
        ctx = ctx + [words[choice]]
    toks = tokenize(text)
    return {"prompt": prompt, "generated": generated, "steps": steps, "n": model.n, "temperature": temperature,
            "vocab_size": len(model.vocab), "tokens": len(toks), "top_words": model.vocab.most_common(12),
            "next": [[w, round(q, 3)] for w, q in model.dist(tokenize(prompt) or ["the"])[0][:10]]}


def run(kind: str, **kw) -> Any:  # pragma: no cover - convenience
    return {"search": search, "minimax": minimax_analyse, "qlearn": q_learning, "lm": language_model}[kind](**kw)
