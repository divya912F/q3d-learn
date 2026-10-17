"""Artificial Intelligence — expanded curriculum (v2.3). Merged by content.py."""
from __future__ import annotations

TOPICS_EXTRA = {
    "optimization": "Optimisation",
    "constraints": "Constraint solving",
    "knowledge": "Knowledge & logic",
    "planning": "Planning",
    "uncertainty": "Uncertainty",
    "modern": "Modern AI",
}

# Existing labs: search, minimax, rl, nlp, genetic, nqueens
LESSONS_EXTRA = [
    {
        "id": "ai-local-search", "order": 8, "title": "Local Search & Optimisation", "topic": "optimization", "level": "Intermediate", "minutes": 8,
        "summary": "When the path doesn't matter, only the destination — hill climbing, annealing and genetic algorithms.",
        "blocks": [
            {"type": "text", "html": "For problems like scheduling or route design, you don't care <i>how</i> you reach a good solution, only that it's good. <b>Local search</b> starts somewhere and repeatedly moves to a better neighbour."},
            {"type": "text", "html": "Plain <b>hill climbing</b> gets stuck on <b>local optima</b>. <b>Simulated annealing</b> escapes by sometimes accepting worse moves early on (then 'cooling'). <b>Genetic algorithms</b> evolve a population with crossover and mutation."},
            {"type": "callout", "kind": "insight", "html": "The core tension of all search is <b>exploration vs exploitation</b>: wander enough to find new peaks, but exploit the good region once you're near the top."},
            {"type": "try", "target": "lab", "lab": "genetic", "label": "Evolve the shortest delivery route", "preset": {}},
        ],
        "quiz": [
            {"q": "Hill climbing can get stuck in a…", "options": ["Global optimum", "Local optimum", "Dead end only", "Loop forever always"], "answer": 1, "explain": "It only moves uphill, so it stops at the nearest peak."},
            {"q": "Simulated annealing escapes local optima by…", "options": ["Never moving", "Sometimes accepting worse moves early", "Removing the goal", "Using more memory"], "answer": 1, "explain": "A 'temperature' lets it jump out of small peaks, then cools."},
            {"q": "Genetic algorithms use crossover and…", "options": ["Mutation", "Sorting", "Hashing", "Recursion only"], "answer": 0, "explain": "Selection, crossover and mutation evolve the population."},
        ],
    },
    {
        "id": "ai-csp", "order": 9, "title": "Constraint Satisfaction", "topic": "constraints", "level": "Intermediate", "minutes": 8,
        "summary": "Sudoku, scheduling and N-Queens — problems defined by rules, solved by smart backtracking.",
        "blocks": [
            {"type": "text", "html": "A <b>constraint satisfaction problem</b> has variables, domains of possible values, and <b>constraints</b> that rule out combinations. Sudoku, timetables, map colouring and N-Queens all fit."},
            {"type": "text", "html": "Brute force is hopeless, so we use <b>backtracking</b>: assign one variable, check constraints, and retreat the moment a partial assignment becomes impossible. <b>Forward checking</b> and <b>constraint propagation</b> prune dead branches even earlier."},
            {"type": "callout", "kind": "tip", "html": "In the N-Queens lab, compare brute force with backtracking + forward checking and watch how many dead ends each one avoids."},
            {"type": "try", "target": "lab", "lab": "nqueens", "label": "Watch backtracking place the queens", "preset": {}},
        ],
        "quiz": [
            {"q": "A CSP is defined by variables, domains and…", "options": ["Rewards", "Constraints", "Layers", "Gradients"], "answer": 1, "explain": "Constraints forbid certain value combinations."},
            {"q": "Backtracking retreats as soon as…", "options": ["The goal is found", "A partial assignment violates a constraint", "It runs out of memory", "It feels like it"], "answer": 1, "explain": "Pruning impossible partials early saves huge work."},
            {"q": "Forward checking helps by…", "options": ["Adding variables", "Pruning values that can no longer work", "Removing constraints", "Shuffling"], "answer": 1, "explain": "It eliminates doomed options before exploring them."},
        ],
    },
    {
        "id": "ai-adversarial", "order": 10, "title": "Adversarial Search & Alpha–Beta", "topic": "games", "level": "Intermediate", "minutes": 8,
        "summary": "Playing against an opponent who is trying just as hard to beat you.",
        "blocks": [
            {"type": "text", "html": "In two-player games, <b>minimax</b> assumes the opponent plays optimally: you maximise your score, they minimise it, alternating down the game tree to a value you can act on."},
            {"type": "text", "html": "The tree explodes exponentially, so <b>alpha–beta pruning</b> skips branches that can't change the decision — often letting you search twice as deep for free."},
            {"type": "formula", "tex": r"\text{value}(s) = \begin{cases}\max_a \text{value}(s') & \text{your move}\\ \min_a \text{value}(s') & \text{their move}\end{cases}"},
            {"type": "callout", "kind": "insight", "html": "Deep Blue beat Kasparov with minimax + pruning + hand-tuned evaluation. Modern game AI (AlphaZero) swaps the hand-tuned part for a neural network and self-play."},
            {"type": "try", "target": "lab", "lab": "minimax", "label": "See the score minimax gives every move", "preset": {}},
        ],
        "quiz": [
            {"q": "Minimax assumes the opponent plays…", "options": ["Randomly", "Optimally against you", "Not at all", "Cooperatively"], "answer": 1, "explain": "You plan for their best reply at each step."},
            {"q": "Alpha–beta pruning…", "options": ["Changes the answer", "Skips branches that can't affect the decision", "Adds randomness", "Needs more memory than minimax"], "answer": 1, "explain": "It returns the same move while exploring far fewer nodes."},
            {"q": "AlphaZero replaced hand-tuned evaluation with…", "options": ["A bigger tree", "A neural network trained by self-play", "Random moves", "A database only"], "answer": 1, "explain": "Learned evaluation + search beat human-crafted heuristics."},
        ],
    },
    {
        "id": "ai-logic", "order": 11, "title": "Knowledge & Logic", "topic": "knowledge", "level": "Intermediate", "minutes": 7,
        "summary": "The other half of classical AI: representing facts and reasoning to new ones.",
        "blocks": [
            {"type": "text", "html": "Before machine learning dominated, AI reasoned with <b>explicit knowledge</b>. <b>Propositional</b> and <b>first-order logic</b> let an agent store facts (<i>All humans are mortal</i>) and <b>infer</b> new ones (<i>Socrates is mortal</i>)."},
            {"type": "text", "html": "<b>Expert systems</b> packed thousands of IF–THEN rules from human specialists and powered 1980s medical and finance tools. <b>Knowledge graphs</b> (the relationships behind search engines and assistants) are today's descendant."},
            {"type": "callout", "kind": "warning", "html": "Pure logic is brittle: it struggles with exceptions and messy real-world uncertainty. That brittleness is exactly why statistical and neural methods took over — but logic is returning in <b>neuro-symbolic</b> systems."},
        ],
        "quiz": [
            {"q": "Inference means…", "options": ["Storing facts", "Deriving new facts from known ones", "Deleting rules", "Training a network"], "answer": 1, "explain": "Logic rules let you conclude new statements."},
            {"q": "Expert systems were built from…", "options": ["Neural networks", "Thousands of IF–THEN rules", "Random forests", "Game trees"], "answer": 1, "explain": "Hand-authored rules captured specialist knowledge."},
            {"q": "A weakness of pure logic AI is…", "options": ["Too much data", "Brittleness with exceptions and uncertainty", "Being too fast", "No rules"], "answer": 1, "explain": "Rigid rules break on messy, uncertain reality."},
        ],
    },
    {
        "id": "ai-uncertainty", "order": 12, "title": "Reasoning Under Uncertainty", "topic": "uncertainty", "level": "Advanced", "minutes": 8,
        "summary": "The real world is probabilistic — Bayes' rule and belief networks handle it.",
        "blocks": [
            {"type": "text", "html": "Agents rarely know the world for certain. <b>Probability</b> is the language of belief, and <b>Bayes' rule</b> is how an agent updates belief when new evidence arrives:"},
            {"type": "formula", "tex": r"P(H\mid E) = \frac{P(E\mid H)\,P(H)}{P(E)}"},
            {"type": "text", "html": "A <b>Bayesian network</b> links many variables by their dependencies — a doctor's model of symptoms and diseases, say — so evidence about one updates beliefs about the rest. This is the backbone of medical diagnosis, spam filters and robot localisation."},
            {"type": "callout", "kind": "insight", "html": "The classic surprise: a 99%-accurate test for a rare disease still yields mostly false positives, because the <b>prior</b> (how rare it is) dominates. Base rates matter."},
        ],
        "quiz": [
            {"q": "Bayes' rule updates…", "options": ["The learning rate", "a prior belief into a posterior using evidence", "The game tree", "The loss"], "answer": 1, "explain": "P(H|E) combines the prior and the likelihood."},
            {"q": "A Bayesian network represents…", "options": ["Neurons", "Variables and their probabilistic dependencies", "A maze", "A sorted list"], "answer": 1, "explain": "Nodes are variables; edges encode conditional dependence."},
            {"q": "A 99%-accurate test for a rare disease gives many false positives because…", "options": ["The test is broken", "The low base rate (prior) dominates", "Bayes fails", "Accuracy is 0"], "answer": 1, "explain": "With a rare condition, false positives outnumber true ones."},
        ],
    },
    {
        "id": "ai-mdp", "order": 13, "title": "MDPs: The Theory Behind RL", "topic": "rl", "level": "Advanced", "minutes": 8,
        "summary": "States, actions, rewards and the Bellman equation that Q-learning approximates.",
        "blocks": [
            {"type": "text", "html": "Reinforcement learning rests on the <b>Markov Decision Process</b>: states, actions, a reward for each transition, and the <b>Markov property</b> — the future depends only on the present state, not the whole history."},
            {"type": "text", "html": "The agent wants a <b>policy</b> that maximises <i>discounted</i> future reward. The <b>Bellman equation</b> ties each state's value to its neighbours and underlies Q-learning:"},
            {"type": "formula", "tex": r"Q(s,a) = r + \gamma \max_{a'} Q(s', a')"},
            {"type": "text", "html": "The discount γ (0–1) trades immediate vs long-term reward; the exploration rate ε balances trying new actions against exploiting known-good ones."},
            {"type": "callout", "kind": "tip", "html": "In the Q-learning lab, lower γ and the agent becomes short-sighted; raise ε and it wanders more before settling on a policy."},
            {"type": "try", "target": "lab", "lab": "rl", "label": "Tune γ and ε and watch the policy form", "preset": {}},
        ],
        "quiz": [
            {"q": "The Markov property says the future depends on…", "options": ["The whole history", "Only the current state", "The reward only", "Nothing"], "answer": 1, "explain": "The present state summarises all you need to decide."},
            {"q": "The discount factor γ controls…", "options": ["Exploration", "How much future reward is valued now", "The number of states", "The learning rate only"], "answer": 1, "explain": "Lower γ makes the agent short-sighted."},
            {"q": "The Bellman equation relates a state's value to…", "options": ["Its colour", "The reward plus the best next state's value", "The number of actions", "The policy name"], "answer": 1, "explain": "Q(s,a) = r + γ·max Q(s′,a′)."},
        ],
    },
    {
        "id": "ai-deep-rl", "order": 14, "title": "Deep RL: From Q-Tables to AlphaGo", "topic": "rl", "level": "Advanced", "minutes": 8,
        "summary": "Swap the lookup table for a neural network and RL scales to Atari, Go and robots.",
        "blocks": [
            {"type": "text", "html": "A Q-table needs one entry per state — impossible when states are raw pixels. <b>Deep Q-Networks (DQN)</b> replace the table with a neural network that <i>predicts</i> Q-values, letting RL learn Atari from the screen alone."},
            {"type": "text", "html": "<b>Policy-gradient</b> methods instead learn the policy directly, and <b>actor–critic</b> combines both. <b>AlphaGo</b> fused deep RL with tree search and self-play to beat the world champion at Go — a game once thought a decade away."},
            {"type": "callout", "kind": "warning", "html": "Deep RL is powerful but notoriously finicky: unstable training, huge sample needs and reward-hacking (the agent games a poorly-specified reward). Reward design is half the battle."},
        ],
        "quiz": [
            {"q": "A DQN replaces the Q-table with…", "options": ["A bigger table", "A neural network that predicts Q-values", "A game tree", "A database"], "answer": 1, "explain": "The network generalises across huge state spaces like pixels."},
            {"q": "AlphaGo combined deep RL with…", "options": ["Only random play", "Tree search and self-play", "A Q-table", "Logic rules"], "answer": 1, "explain": "Neural networks guided Monte-Carlo tree search trained by self-play."},
            {"q": "Reward hacking is when the agent…", "options": ["Trains too slowly", "Exploits a badly-specified reward", "Has no reward", "Uses a Q-table"], "answer": 1, "explain": "It maximises the stated reward in unintended ways."},
        ],
    },
    {
        "id": "ai-transformers", "order": 15, "title": "From n-grams to Transformers", "topic": "language", "level": "Advanced", "minutes": 9,
        "summary": "How language models went from counting word pairs to powering ChatGPT.",
        "blocks": [
            {"type": "text", "html": "The n-gram model in the lab predicts the next word from the previous few — simple, but blind to anything further back. Neural language models fixed the memory; the <b>transformer</b> (2017) fixed everything else."},
            {"type": "text", "html": "Its key idea is <b>self-attention</b>: every word looks at every other word and decides what's relevant, so the model captures long-range meaning and trains in parallel. Scale it up on the whole internet and you get a <b>large language model</b>."},
            {"type": "callout", "kind": "insight", "html": "An LLM is still, at heart, the lab's next-word predictor — just with billions of parameters and attention instead of counts. 'Predict the next token' turns out to be shockingly powerful at scale."},
            {"type": "try", "target": "lab", "lab": "nlp", "label": "Play with the n-gram predictor's temperature", "preset": {}},
        ],
        "quiz": [
            {"q": "An n-gram model predicts the next word from…", "options": ["The whole document", "Only the previous few words", "The future", "Nothing"], "answer": 1, "explain": "It conditions on a short fixed window."},
            {"q": "The transformer's key mechanism is…", "options": ["Recursion", "Self-attention", "Sorting", "Backtracking"], "answer": 1, "explain": "Attention lets every token weigh every other."},
            {"q": "At its core, an LLM is doing…", "options": ["Next-token prediction at huge scale", "Database lookups", "Pure logic", "Clustering"], "answer": 0, "explain": "It predicts the next token — just massively scaled."},
        ],
    },
    {
        "id": "ai-agents-llm", "order": 16, "title": "Agents, Tools & Alignment", "topic": "modern", "level": "Intermediate", "minutes": 8,
        "summary": "Modern AI agents that plan, call tools and act — and the safety that must come with them.",
        "blocks": [
            {"type": "text", "html": "A modern <b>AI agent</b> wraps a language model in a loop: observe, think, act. Give it <b>tools</b> (search, a calculator, code execution, APIs) and it can break a goal into steps and carry them out — the pattern behind this very platform's tutor."},
            {"type": "text", "html": "Techniques like <b>chain-of-thought</b> (reasoning step by step) and <b>retrieval-augmented generation</b> (fetching facts before answering) make agents more reliable and less prone to making things up (<b>hallucination</b>)."},
            {"type": "callout", "kind": "warning", "html": "With autonomy comes <b>alignment</b> risk: an agent optimising a goal can take harmful shortcuts. Guardrails, human oversight and honest uncertainty are not optional extras — they're core engineering."},
        ],
        "quiz": [
            {"q": "An AI agent's basic loop is…", "options": ["Sort, filter, print", "Observe, think, act", "Train, test, deploy", "Encrypt, send, decrypt"], "answer": 1, "explain": "It perceives, reasons, then takes an action, repeating."},
            {"q": "Retrieval-augmented generation reduces hallucination by…", "options": ["Guessing more", "Fetching real facts before answering", "Removing tools", "Training longer"], "answer": 1, "explain": "Grounding answers in retrieved sources improves accuracy."},
            {"q": "Alignment is about…", "options": ["Faster GPUs", "Making agents pursue intended goals safely", "Bigger models only", "More data"], "answer": 1, "explain": "It ensures autonomous systems behave as humans intend."},
        ],
    },
    {
        "id": "ai-history", "order": 17, "title": "A Short History & the Big Picture", "topic": "agents", "level": "Beginner", "minutes": 7,
        "summary": "Winters, springs and where classical AI meets the deep-learning era.",
        "blocks": [
            {"type": "text", "html": "AI has boomed and busted since 1956. <b>Symbolic AI</b> and expert systems ruled, then disappointed (the <b>AI winters</b>). Statistical learning revived the field in the 2000s; <b>deep learning</b> (2012 onward) and transformers (2017) brought today's spring."},
            {"type": "text", "html": "The through-line of this course: <b>search</b> (find a path), <b>games</b> (plan against an adversary), <b>logic</b> (reason over facts), <b>probability</b> (handle uncertainty) and <b>learning</b> (improve from data). Modern systems blend all five."},
            {"type": "callout", "kind": "insight", "html": "Today's frontier is <b>neuro-symbolic</b> and agentic AI — joining the pattern-power of neural nets with the structured reasoning of classical AI. The old ideas never really left."},
        ],
        "quiz": [
            {"q": "The 'AI winters' were periods of…", "options": ["Rapid progress", "Lost funding and disappointment", "Cold weather", "Perfect accuracy"], "answer": 1, "explain": "Overpromising led to funding collapses."},
            {"q": "Deep learning's modern surge began around…", "options": ["1956", "2012", "1990", "2024"], "answer": 1, "explain": "The 2012 ImageNet result reignited the field."},
            {"q": "Neuro-symbolic AI combines…", "options": ["Two neural nets", "Neural learning with symbolic reasoning", "Only logic", "Only search"], "answer": 1, "explain": "It fuses pattern recognition with structured reasoning."},
        ],
    },
]

KNOWLEDGE_EXTRA = {
    "local-search": {"keys": ["local search", "hill climbing", "simulated annealing", "genetic algorithm", "exploration exploitation"], "lesson": "ai-local-search",
                     "text": "**Local search** improves a solution by moving to better neighbours. Hill climbing gets stuck in local optima; simulated annealing and genetic algorithms escape them, balancing exploration and exploitation."},
    "csp": {"keys": ["constraint satisfaction", "csp", "backtracking", "forward checking", "n-queens", "sudoku"], "lesson": "ai-csp",
            "text": "A **constraint satisfaction problem** has variables, domains and constraints. **Backtracking** retreats when a partial assignment breaks a rule; forward checking prunes doomed options early."},
    "minimax": {"keys": ["minimax", "alpha-beta", "adversarial", "game tree", "alphazero"], "lesson": "ai-adversarial",
                "text": "**Minimax** plans against an optimal opponent by maximising your value and minimising theirs. **Alpha–beta pruning** skips branches that can't change the decision, searching far deeper."},
    "logic-ai": {"keys": ["logic", "inference", "expert system", "knowledge graph", "first-order logic", "neuro-symbolic"], "lesson": "ai-logic",
                 "text": "Symbolic AI stores facts in **logic** and **infers** new ones. Expert systems and knowledge graphs descend from it; it is brittle with uncertainty, which is why learning methods rose."},
    "bayesian": {"keys": ["bayes", "bayesian network", "prior", "posterior", "base rate", "uncertainty"], "lesson": "ai-uncertainty",
                 "text": "**Bayes' rule** updates a prior belief into a posterior given evidence. **Bayesian networks** link variables by dependency, powering diagnosis and robot localisation. Base rates dominate rare-event tests."},
    "mdp": {"keys": ["mdp", "markov decision process", "bellman", "policy", "discount", "reward"], "lesson": "ai-mdp",
            "text": "A **Markov Decision Process** (states, actions, rewards, Markov property) formalises RL. The **Bellman equation** Q(s,a)=r+γ·max Q(s′,a′) defines optimal value; γ discounts the future."},
    "deep-rl": {"keys": ["deep rl", "dqn", "deep q-network", "policy gradient", "actor-critic", "reward hacking"], "lesson": "ai-deep-rl",
                "text": "**Deep RL** replaces the Q-table with a neural network (DQN) or learns the policy directly (policy gradients). AlphaGo fused it with tree search and self-play. Beware reward hacking."},
    "transformer": {"keys": ["transformer", "self-attention", "language model", "llm", "n-gram", "next token"], "lesson": "ai-transformers",
                    "text": "The **transformer** uses **self-attention** so every token weighs every other, capturing long-range meaning in parallel. Scaled up, next-token prediction becomes a large language model."},
    "ai-agent": {"keys": ["ai agent", "agent", "tools", "chain-of-thought", "rag", "hallucination"], "lesson": "ai-agents-llm",
                 "text": "An **AI agent** loops observe→think→act and can call tools. Chain-of-thought and retrieval-augmented generation cut hallucination; autonomy makes **alignment** and oversight essential."},
    "ai-history": {"keys": ["ai winter", "history of ai", "symbolic ai", "deep learning era"], "lesson": "ai-history",
                   "text": "AI has cycled through booms and **AI winters** since 1956: symbolic AI, statistical learning, then deep learning (2012) and transformers (2017). Today blends search, logic, probability and learning."},
}

TERMS_EXTRA = {
    "local-search": ("Local search & optimisation", ["hill climbing", "simulated annealing"]),
    "csp": ("Constraint satisfaction", ["backtracking"]),
    "minimax": ("Minimax & alpha–beta", ["alpha-beta"]),
    "logic-ai": ("Knowledge & logic", ["expert system"]),
    "bayesian": ("Bayesian reasoning", ["bayesian network"]),
    "mdp": ("Markov Decision Process", ["bellman equation"]),
    "deep-rl": ("Deep reinforcement learning", ["dqn"]),
    "transformer": ("Transformers & attention", ["self-attention", "llm"]),
    "ai-agent": ("AI agents & alignment", ["rag", "hallucination"]),
    "ai-history": ("History of AI", ["ai winter"]),
}
