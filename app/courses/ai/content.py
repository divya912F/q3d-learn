"""Artificial Intelligence course: lessons, quizzes, challenges and tutor knowledge."""
from __future__ import annotations

from . import engine

COURSE = {
    "id": "ai",
    "title": "Artificial Intelligence",
    "short": "AI",
    "tagline": "Agents that search, plan, play games, learn from reward and generate language.",
    "description": "Classic and modern AI made visible: watch BFS and A* explore a maze, play tic-tac-toe against minimax, "
                   "train a Q-learning agent and peek inside a language model's next-word predictions.",
    "color": "#7048e8",
    "icon": "bot",
    "level": "Beginner → Intermediate",
    "labs": [
        {"id": "search", "title": "Pathfinding Visualiser", "icon": "route",
         "description": "Draw walls and mud, then race BFS, DFS, UCS, Greedy and A* to the goal."},
        {"id": "minimax", "title": "Minimax Tic-Tac-Toe", "icon": "grid",
         "description": "Play against a perfect opponent and see the score it gives every possible move."},
        {"id": "rl", "title": "Q-Learning Gridworld", "icon": "target",
         "description": "Train an agent by trial and error; watch values and the policy appear over episodes."},
        {"id": "nlp", "title": "Next-Word Predictor", "icon": "chat",
         "description": "Build an n-gram language model and sample text with a temperature dial — how LLMs pick words."},
        {"id": "genetic", "title": "Genetic Algorithm", "icon": "dna",
         "description": "Evolve the shortest delivery route generation by generation with crossover, mutation and survival of the fittest."},
        {"id": "nqueens", "title": "N-Queens Solver", "icon": "crown",
         "description": "Watch brute force, backtracking and forward checking place queens — and count how many dead ends each avoids."},
    ],
    "topics": {
        "agents": "Agents", "search": "Search", "heuristics": "Heuristics", "games": "Game playing",
        "rl": "Reinforcement learning", "language": "Language models", "ethics": "Responsible AI",
    },
}

LESSONS = [
    {
        "id": "ai-intro", "order": 1, "title": "What is AI?", "topic": "agents", "level": "Beginner", "minutes": 6,
        "summary": "Agents, environments and the main families of AI techniques.",
        "blocks": [
            {"type": "text", "html": "AI builds <b>agents</b> that perceive an environment and choose actions to reach a goal. A thermostat, a chess engine and a chatbot are all agents of different power."},
            {"type": "formula", "tex": r"\text{percepts} \xrightarrow{\ \text{agent}\ } \text{actions} \quad\text{chosen to maximise performance}"},
            {"type": "text", "html": "<ul><li><b>Search & planning</b> — find a sequence of actions (route planning).</li><li><b>Game playing</b> — act against an opponent (minimax).</li><li><b>Learning</b> — improve from data or reward (ML, reinforcement learning).</li><li><b>Language</b> — understand and generate text (language models).</li></ul>"},
            {"type": "callout", "kind": "insight", "html": "Describe a task with <b>PEAS</b>: Performance measure, Environment, Actuators, Sensors."},
            {"type": "try", "target": "lab", "lab": "search", "label": "Watch a search agent find a route", "preset": {"preset": "open", "algorithm": "bfs"}},
        ],
        "quiz": [
            {"q": "An agent maps…", "options": ["Actions to percepts", "Percepts to actions", "Data to charts", "Labels to features"], "answer": 1, "explain": "It senses, then acts."},
            {"q": "Choosing a route on a map is mainly a…", "options": ["Search problem", "Clustering problem", "Regression problem", "Language problem"], "answer": 0, "explain": "Find a sequence of moves to a goal."},
            {"q": "In PEAS, the “S” stands for…", "options": ["Strategy", "Sensors", "Search", "Score"], "answer": 1, "explain": "Performance, Environment, Actuators, Sensors."},
        ],
    },
    {
        "id": "ai-search", "order": 2, "title": "Uninformed Search: BFS, DFS, UCS", "topic": "search", "level": "Beginner", "minutes": 8,
        "summary": "Explore a state space systematically with a frontier.",
        "blocks": [
            {"type": "text", "html": "Search keeps a <b>frontier</b> of states still to explore. The data structure of the frontier decides the strategy:<ul><li><b>BFS</b> (queue) — expands in rings; finds the shortest path when every step costs the same.</li><li><b>DFS</b> (stack) — dives deep; uses little memory but paths can be long.</li><li><b>Uniform-cost search</b> (priority queue by path cost g) — optimal even when steps cost different amounts.</li></ul>"},
            {"type": "callout", "kind": "tip", "html": "In the visualiser, paint some <b>mud</b> (cost 5). BFS walks straight through it; UCS goes around because it counts cost."},
            {"type": "try", "target": "lab", "lab": "search", "label": "Race BFS against DFS", "preset": {"preset": "open", "algorithm": "dfs"}},
        ],
        "quiz": [
            {"q": "BFS uses which frontier?", "options": ["Stack", "Queue (FIFO)", "Priority queue by heuristic", "Random"], "answer": 1, "explain": "First in, first out → expands level by level."},
            {"q": "With equal step costs, which always finds the shortest path?", "options": ["DFS", "BFS", "Greedy best-first", "Random walk"], "answer": 1, "explain": "BFS reaches every distance-d cell before distance d+1."},
            {"q": "When steps have different costs, the optimal uninformed algorithm is…", "options": ["BFS", "DFS", "Uniform-cost search", "Hill climbing"], "answer": 2, "explain": "UCS expands the cheapest path first."},
        ],
    },
    {
        "id": "ai-astar", "order": 3, "title": "Heuristic Search & A*", "topic": "heuristics", "level": "Intermediate", "minutes": 9,
        "summary": "Use an estimate of the remaining distance to search smarter.",
        "blocks": [
            {"type": "text", "html": "A <b>heuristic</b> h(n) estimates the cost from n to the goal (e.g. Manhattan distance on a grid). A* expands the node with the smallest"},
            {"type": "formula", "tex": r"f(n) = g(n) + h(n)"},
            {"type": "text", "html": "where g is the cost so far. If h never over-estimates (<b>admissible</b>), A* is guaranteed to find the optimal path — usually expanding far fewer nodes than UCS. <b>Greedy best-first</b> uses only h: fast, but not always optimal."},
            {"type": "callout", "kind": "insight", "html": "UCS is just A* with h = 0. A better heuristic → fewer expansions, as long as it stays admissible."},
            {"type": "try", "target": "lab", "lab": "search", "label": "A* through the maze", "preset": {"preset": "maze", "algorithm": "astar", "heuristic": "manhattan"}},
        ],
        "quiz": [
            {"q": "In A*, g(n) is…", "options": ["The estimated remaining cost", "The cost from the start to n", "The number of neighbours", "The depth limit"], "answer": 1, "explain": "f = g (so far) + h (estimate to go)."},
            {"q": "An admissible heuristic…", "options": ["Never over-estimates the true cost", "Always equals zero", "Always over-estimates", "Ignores walls"], "answer": 0, "explain": "That is what keeps A* optimal."},
            {"q": "Greedy best-first search orders nodes by…", "options": ["g only", "h only", "g + h", "depth"], "answer": 1, "explain": "It rushes towards the goal and can miss cheaper routes."},
        ],
    },
    {
        "id": "ai-games", "order": 4, "title": "Game Playing: Minimax & Alpha–Beta", "topic": "games", "level": "Intermediate", "minutes": 8,
        "summary": "Look ahead, assume the opponent plays perfectly, prune what doesn't matter.",
        "blocks": [
            {"type": "text", "html": "In a two-player game, <b>MAX</b> picks the move with the highest value and <b>MIN</b> the lowest. Minimax recursively scores the game tree:"},
            {"type": "formula", "tex": r"V(s) = \begin{cases}\max_a V(s') & \text{MAX to move}\\ \min_a V(s') & \text{MIN to move}\end{cases}"},
            {"type": "text", "html": "<b>Alpha–beta pruning</b> skips branches that cannot change the decision — same answer, far fewer positions. In the lab, compare the node counts with and without pruning."},
            {"type": "callout", "kind": "tip", "html": "Perfect tic-tac-toe is always a draw. Try to beat the AI — you can't!"},
            {"type": "try", "target": "lab", "lab": "minimax", "label": "Play tic-tac-toe against minimax", "preset": {}},
        ],
        "quiz": [
            {"q": "Minimax assumes the opponent…", "options": ["Plays randomly", "Plays optimally", "Always passes", "Copies you"], "answer": 1, "explain": "MIN chooses the move worst for MAX."},
            {"q": "Alpha–beta pruning changes…", "options": ["The chosen move", "Only the amount of work", "The rules of the game", "The winner"], "answer": 1, "explain": "It returns the same value with fewer nodes."},
            {"q": "With perfect play from both sides, tic-tac-toe ends in…", "options": ["A win for X", "A win for O", "A draw", "It depends on luck"], "answer": 2, "explain": "It is a solved game: a draw."},
        ],
    },
    {
        "id": "ai-rl", "order": 5, "title": "Reinforcement Learning & Q-Learning", "topic": "rl", "level": "Intermediate", "minutes": 10,
        "summary": "Learn what to do from rewards, by trial and error.",
        "blocks": [
            {"type": "text", "html": "In reinforcement learning an agent tries actions, receives <b>rewards</b> and learns a <b>policy</b> that maximises long-term reward. Q-learning keeps a table Q(s, a) — how good action a is in state s — and updates it after every step:"},
            {"type": "formula", "tex": r"Q(s,a) \leftarrow Q(s,a) + \alpha\big[r + \gamma \max_{a'} Q(s',a') - Q(s,a)\big]"},
            {"type": "text", "html": "α is the learning rate, γ the discount (how much the future matters) and ε the <b>exploration</b> rate — how often the agent tries a random action instead of the best known one."},
            {"type": "callout", "kind": "insight", "html": "Explore vs. exploit: with ε = 0 the agent never discovers better routes; with ε too high it never uses what it learnt."},
            {"type": "try", "target": "lab", "lab": "rl", "label": "Train an agent to avoid the pits", "preset": {"episodes": 300, "alpha": 0.5, "gamma": 0.95, "epsilon": 0.3}},
        ],
        "quiz": [
            {"q": "In Q-learning, γ (gamma) controls…", "options": ["Exploration", "How much future rewards count", "The grid size", "The number of actions"], "answer": 1, "explain": "γ discounts rewards further in the future."},
            {"q": "ε-greedy means…", "options": ["Always take the best action", "Take a random action with probability ε", "Never explore", "Stop after ε episodes"], "answer": 1, "explain": "Balance exploration and exploitation."},
            {"q": "The learned policy picks, in each state, the action with…", "options": ["The lowest Q", "The highest Q", "A random Q", "The most visits"], "answer": 1, "explain": "Greedy with respect to Q."},
        ],
    },
    {
        "id": "ai-lm", "order": 6, "title": "Language Models: from n-grams to LLMs", "topic": "language", "level": "Intermediate", "minutes": 9,
        "summary": "Predict the next word — the idea behind chatbots.",
        "blocks": [
            {"type": "text", "html": "A <b>language model</b> assigns a probability to the next token given the previous ones. The simplest is an <b>n-gram</b> model that counts word sequences:"},
            {"type": "formula", "tex": r"P(w_t \mid w_{t-1}) = \mathrm{count}(w_{t-1}\,w_t)\ /\ \mathrm{count}(w_{t-1})"},
            {"type": "text", "html": "Large language models (LLMs) replace counting with a huge neural network (a <b>transformer</b>) that reads thousands of previous tokens — but they still generate text one token at a time by sampling from a probability distribution."},
            {"type": "text", "html": "<b>Temperature</b> reshapes that distribution: low temperature → safe, repetitive, predictable; high temperature → creative but more random."},
            {"type": "callout", "kind": "warning", "html": "Because they predict likely words, language models can sound confident while being wrong (“hallucination”). Always verify facts."},
            {"type": "try", "target": "lab", "lab": "nlp", "label": "Generate text with a bigram model", "preset": {"n": 2, "temperature": 0.8, "prompt": "the students"}},
        ],
        "quiz": [
            {"q": "A bigram model predicts the next word using…", "options": ["No context", "The previous word", "The whole document", "Images"], "answer": 1, "explain": "Bi-gram = pairs of words."},
            {"q": "Lowering the temperature makes generation…", "options": ["More random", "More predictable", "Longer", "Multilingual"], "answer": 1, "explain": "Probability mass concentrates on the top word."},
            {"q": "LLMs generate text…", "options": ["All at once", "One token at a time", "By copying the internet", "Without probabilities"], "answer": 1, "explain": "Autoregressive sampling, token by token."},
        ],
    },
    {
        "id": "ai-ethics", "order": 7, "title": "Responsible AI", "topic": "ethics", "level": "Beginner", "minutes": 6,
        "summary": "Bias, fairness, privacy and transparency.",
        "blocks": [
            {"type": "text", "html": "AI systems learn from data made by people, so they can inherit people's biases. Responsible AI asks:<ul><li><b>Fairness</b> — does it work equally well for every group?</li><li><b>Privacy</b> — is personal data protected and used with consent?</li><li><b>Transparency</b> — can we explain a decision?</li><li><b>Accountability</b> — who is responsible when it is wrong?</li><li><b>Safety</b> — could it cause harm if misused?</li></ul>"},
            {"type": "callout", "kind": "insight", "html": "A model that is 95% accurate overall may be only 70% accurate for a minority group. Always evaluate per group."},
            {"type": "callout", "kind": "tip", "html": "Q-Bot in this platform shows the simulation facts it relied on — a small example of transparency."},
        ],
        "quiz": [
            {"q": "A hiring model trained on past decisions may…", "options": ["Repeat historical bias", "Be automatically fair", "Ignore its data", "Never make mistakes"], "answer": 0, "explain": "Models learn patterns in their data, including unfair ones."},
            {"q": "Checking accuracy separately for each group tests…", "options": ["Speed", "Fairness", "Privacy", "Memory use"], "answer": 1, "explain": "Overall accuracy can hide poor performance for a group."},
            {"q": "Being able to explain why a model decided something is…", "options": ["Transparency", "Overfitting", "Imputation", "Pruning"], "answer": 0, "explain": "Explainability builds trust and catches errors."},
        ],
    },
]

MINIMAX_BOARD = ["X", "", "", "", "O", "", "", "", "X"]


def _ngram_answer() -> str:
    lm = engine.language_model(prompt="students", n=2, temperature=0, length=1)
    return lm["next"][0][0]


CHALLENGES = [
    {"id": "ai-optimal", "title": "Smart Explorer", "difficulty": "Medium", "points": 100, "topic": "heuristics",
     "kind": "lab", "lab": "search",
     "description": "On the maze, find the cheapest path while expanding FEWER nodes than uniform-cost search does.",
     "goal": "Optimal path cost · fewer expansions than UCS.",
     "hint": "You need an algorithm that is both optimal and guided by the goal.",
     "preset": {"preset": "maze", "algorithm": "bfs", "heuristic": "manhattan"}, "lock": ["preset"]},
    {"id": "ai-q", "title": "Fast Learner", "difficulty": "Medium", "points": 100, "topic": "rl",
     "kind": "lab", "lab": "rl",
     "description": "Train the gridworld agent in at most 120 episodes so that it reliably reaches the goal.",
     "goal": "≤ 120 episodes · success in ≥ 90% of the last 50 episodes · greedy policy reaches the goal.",
     "hint": "A higher learning rate learns faster; let exploration decay so the agent exploits what it learnt.",
     "preset": {"episodes": 120, "alpha": 0.05, "gamma": 0.95, "epsilon": 0.6, "epsilon_decay": 1.0}, "lock": []},
    {"id": "ai-minimax", "title": "Don't Fall for the Fork", "difficulty": "Medium", "points": 80, "topic": "games",
     "kind": "answer", "answer_type": "choice", "options": [str(i) for i in range(9)],
     "description": "X has two opposite corners and O holds the centre (board shown in the lab). O to move: which square (0–8, reading row by row) keeps the draw?",
     "goal": "Pick a square that minimax rates as not losing.",
     "hint": "Load the position in the minimax lab and read the score on each empty square.",
     "board": MINIMAX_BOARD,
     "open_lab": {"lab": "minimax", "preset": {"board": MINIMAX_BOARD, "turn": "O"}}, "compute": "minimax"},
    {"id": "ai-ngram", "title": "Mind Reader", "difficulty": "Easy", "points": 50, "topic": "language",
     "kind": "answer", "answer_type": "choice", "options": ["learn", "who", "ask", "solve", "sleep"],
     "description": "Using the built-in corpus and a bigram model, what is the most likely word after “students”?",
     "goal": "Pick the word.", "hint": "Type “students” as the prompt in the next-word lab and read the probability bars.",
     "open_lab": {"lab": "nlp", "preset": {"prompt": "students", "n": 2}}, "compute": "ngram"},
]


def check_challenge(ch: dict, payload: dict) -> dict:
    if ch["kind"] == "answer":
        given = str(payload.get("answer"))
        if ch["compute"] == "minimax":
            res = engine.minimax_analyse(list(ch["board"]), "O")
            ok = given.isdigit() and int(given) in res["best_moves"]
            if ok:
                fb = "Correct! Taking an edge forces X to block, so X never gets a double threat."
            elif given.isdigit() and str(int(given)) in res["scores"]:
                fb = f"Square {given} scores {res['scores'][str(int(given))]} — X can create a fork. Try another."
            else:
                fb = "That square is already taken."
        else:
            ok = given == _ngram_answer()
            fb = "Correct — that's the highest-probability next word." if ok else "Not the top word — check the probability bars."
        return {"solved": bool(ok), "score": 1.0 if ok else 0.0, "feedback": [fb]}

    cfg = {**dict(payload.get("config") or {}), **{k: ch["preset"][k] for k in ch.get("lock", [])}}
    if ch["id"] == "ai-optimal":
        maze = engine.maze_preset("maze")
        res = engine.search(**maze, algorithm=cfg.get("algorithm", "bfs"), heuristic=cfg.get("heuristic", "manhattan"))
        ucs = engine.search(**maze, algorithm="ucs")
        optimal = res["path_cost"] == ucs["path_cost"]
        fewer = res["expanded"] < ucs["expanded"]
        fb = [("✅ " if optimal else "❌ ") + f"Path cost {res['path_cost']} (optimal is {ucs['path_cost']})",
              ("✅ " if fewer else "❌ ") + f"Expanded {res['expanded']} nodes (UCS expands {ucs['expanded']})"]
        return {"solved": optimal and fewer, "score": round((optimal + fewer) / 2, 2), "feedback": fb}
    # ai-q
    episodes = int(cfg.get("episodes", 120))
    res = engine.q_learning(**{k: cfg[k] for k in ("episodes", "alpha", "gamma", "epsilon", "epsilon_decay") if k in cfg})
    rate = res["final"]["success_rate_last50"]
    checks = [(episodes <= 120, f"Episodes: {episodes} (limit 120)"), (rate >= 0.9, f"Success rate (last 50): {rate * 100:.0f}% (need ≥ 90%)"),
              (res["greedy_reaches_goal"], "Greedy policy reaches the goal" if res["greedy_reaches_goal"] else "Greedy policy does not reach the goal yet")]
    return {"solved": all(c for c, _ in checks), "score": round(sum(c for c, _ in checks) / 3, 2), "feedback": [("✅ " if c else "❌ ") + m for c, m in checks]}


KNOWLEDGE = {
    "ai": {"keys": ["artificial intelligence", "what is ai", " ai "], "lesson": "ai-intro",
           "text": "**Artificial intelligence** builds agents that perceive and act to achieve goals. Major families: search & planning, game playing, machine learning, reinforcement learning and language models."},
    "agent": {"keys": ["agent", "peas", "environment", "percept"], "lesson": "ai-intro",
              "text": "An **agent** maps percepts to actions. Describe a task with **PEAS**: Performance measure, Environment, Actuators, Sensors."},
    "bfs": {"keys": ["bfs", "breadth"], "lesson": "ai-search",
            "text": "**Breadth-first search** uses a FIFO queue and expands in rings. With equal step costs it finds the shortest path, but it may explore a lot of the space."},
    "dfs": {"keys": ["dfs", "depth-first", "depth first"], "lesson": "ai-search",
            "text": "**Depth-first search** uses a stack and dives deep first. It is memory-light but the path it finds can be very long and it is not optimal."},
    "ucs": {"keys": ["ucs", "uniform cost", "uniform-cost", "dijkstra"], "lesson": "ai-search",
            "text": "**Uniform-cost search** (Dijkstra) expands the cheapest path g(n) first, so it is optimal even when steps cost different amounts — like the mud cells in the lab."},
    "frontier": {"keys": ["frontier", "explored", "expanded", "visited"], "lesson": "ai-search",
                 "text": "The **frontier** holds discovered-but-unexpanded states. The order in which it is popped (queue, stack, priority) is what makes BFS, DFS, UCS and A* different."},
    "astar": {"keys": ["a*", "astar", "a-star", "heuristic", "manhattan", "admissible", "greedy"], "lesson": "ai-astar",
              "text": "**A*** expands the node with the smallest f = g + h, where h estimates the remaining cost. With an **admissible** h (never over-estimates) it is optimal and usually much faster than UCS. **Greedy best-first** uses h only — fast but not always optimal."},
    "minimax": {"keys": ["minimax", "game tree", "tic-tac-toe", "tic tac toe", "chess"], "lesson": "ai-games",
                "text": "**Minimax** scores a game tree assuming both players play perfectly: MAX picks the highest value, MIN the lowest. Perfect tic-tac-toe is a draw."},
    "alphabeta": {"keys": ["alpha-beta", "alpha beta", "pruning", "prune"], "lesson": "ai-games",
                  "text": "**Alpha–beta pruning** skips branches that cannot affect the final decision. It returns exactly the minimax value while often evaluating far fewer positions."},
    "rl": {"keys": ["reinforcement", "reward", "policy", "episode"], "lesson": "ai-rl",
           "text": "**Reinforcement learning**: an agent acts, receives rewards and learns a **policy** that maximises long-term reward. No labelled answers — only feedback from experience."},
    "qlearning": {"keys": ["q-learning", "q learning", "q-table", "bellman", "q value", "q-value"], "lesson": "ai-rl",
                  "text": "**Q-learning** updates Q(s,a) ← Q(s,a) + α[r + γ·max Q(s′,·) − Q(s,a)]. α = learning rate, γ = discount factor. The greedy policy picks the action with the highest Q."},
    "exploration": {"keys": ["explor", "exploit", "epsilon", "ε"], "lesson": "ai-rl",
                    "text": "**Exploration vs. exploitation**: with probability ε the agent tries a random action to discover new things; otherwise it exploits its best-known action. Decaying ε over time is a common strategy."},
    "language-model": {"keys": ["language model", "llm", "gpt", "chatbot", "transformer", "n-gram", "ngram", "bigram", "token"], "lesson": "ai-lm",
                       "text": "A **language model** predicts the next token from the previous ones. n-gram models count word sequences; **LLMs** use a transformer neural network over long contexts, but still generate one token at a time by sampling."},
    "temperature": {"keys": ["temperature", "sampling", "random text"], "lesson": "ai-lm",
                    "text": "**Temperature** rescales next-token probabilities before sampling: near 0 → always the most likely word (predictable, repetitive); higher → more varied and creative, but also more mistakes."},
    "hallucination": {"keys": ["hallucinat"], "lesson": "ai-lm",
                      "text": "**Hallucination** is when a language model produces fluent but false statements — it predicts plausible words, not verified facts. Grounding answers in trusted data (as Q-Bot does with simulation facts) reduces it."},
    "ethics": {"keys": ["ethic", "bias", "fair", "privacy", "transparen", "responsible"], "lesson": "ai-ethics",
               "text": "**Responsible AI** covers fairness (equal performance across groups), privacy, transparency (explaining decisions), accountability and safety. Biased data produces biased models, so evaluate per group."},
}

# --- v2.3 expanded curriculum (see extra.py) ---
from .extra import KNOWLEDGE_EXTRA, LESSONS_EXTRA, TOPICS_EXTRA  # noqa: E402

COURSE["topics"].update(TOPICS_EXTRA)
LESSONS = LESSONS + LESSONS_EXTRA
KNOWLEDGE.update(KNOWLEDGE_EXTRA)
