"""Data Structures & Algorithms — expanded curriculum (v2.3). Merged by content.py."""
from __future__ import annotations

TOPICS_EXTRA = {
    "searching": "Searching",
    "heaps": "Heaps & priority queues",
    "dp": "Dynamic programming",
    "greedy": "Greedy",
    "interview": "Interview patterns",
}

# Existing labs: sorting, graphs, trees, dp, recursion
LESSONS_EXTRA = [
    {
        "id": "dsa-arrays", "order": 8, "title": "Arrays, Strings & Two Pointers", "topic": "linear", "level": "Beginner", "minutes": 8,
        "summary": "The workhorse structure — and the two-pointer trick that turns O(n²) into O(n).",
        "blocks": [
            {"type": "text", "html": "An <b>array</b> stores items in one contiguous block, so reading index i is O(1). But inserting in the middle shifts everything after it — O(n). Strings are just arrays of characters."},
            {"type": "text", "html": "The <b>two-pointer</b> pattern walks two indices through an array to avoid a nested loop. \"Is this a palindrome?\" or \"find a pair summing to k in a sorted array\" drop from O(n²) to O(n)."},
            {"type": "formula", "tex": r"\text{access } O(1),\quad \text{search } O(n),\quad \text{insert/delete (middle) } O(n)"},
            {"type": "callout", "kind": "tip", "html": "The <b>sliding window</b> is two pointers in disguise: grow the right edge, shrink the left, and you solve 'longest substring without repeats' in a single pass."},
        ],
        "quiz": [
            {"q": "Reading array element i is…", "options": ["O(1)", "O(n)", "O(log n)", "O(n²)"], "answer": 0, "explain": "Contiguous memory gives constant-time indexing."},
            {"q": "The two-pointer trick usually turns O(n²) into…", "options": ["O(n³)", "O(n)", "O(2ⁿ)", "O(1) always"], "answer": 1, "explain": "One linear pass replaces the nested loop."},
            {"q": "A sliding window is good for…", "options": ["Sorting", "Contiguous-subarray / substring problems", "Hashing", "Tree traversal"], "answer": 1, "explain": "It tracks a moving contiguous range in one pass."},
        ],
    },
    {
        "id": "dsa-stacks", "order": 9, "title": "Stacks, Queues & Deques", "topic": "linear", "level": "Beginner", "minutes": 7,
        "summary": "Last-in-first-out, first-in-first-out — simple rules that solve surprisingly much.",
        "blocks": [
            {"type": "text", "html": "A <b>stack</b> is last-in-first-out (LIFO) — like a stack of plates. Push and pop are O(1). It powers undo buttons, the function call stack, and matching brackets."},
            {"type": "text", "html": "A <b>queue</b> is first-in-first-out (FIFO) — a line at a counter. It drives BFS, task scheduling and buffering. A <b>deque</b> allows both ends and underpins the sliding-window-maximum trick."},
            {"type": "callout", "kind": "insight", "html": "Recursion secretly uses a stack — the call stack. Any recursive algorithm can be rewritten with an explicit stack, which is how you avoid stack-overflow on deep inputs."},
        ],
        "quiz": [
            {"q": "A stack is…", "options": ["FIFO", "LIFO", "Sorted", "Random"], "answer": 1, "explain": "Last in, first out."},
            {"q": "BFS uses which structure?", "options": ["Stack", "Queue", "Heap", "Tree only"], "answer": 1, "explain": "A FIFO queue gives level-by-level exploration."},
            {"q": "Matching brackets '([])' is naturally solved with a…", "options": ["Queue", "Stack", "Hash map", "Heap"], "answer": 1, "explain": "Push openers, pop and check on closers."},
        ],
    },
    {
        "id": "dsa-searching", "order": 10, "title": "Binary Search & the Search Space", "topic": "searching", "level": "Intermediate", "minutes": 8,
        "summary": "Halve the problem every step — and learn to 'binary search the answer'.",
        "blocks": [
            {"type": "text", "html": "On sorted data, <b>binary search</b> checks the middle, then throws away half. log₂(1,000,000) ≈ 20 steps to search a million items:"},
            {"type": "formula", "tex": r"T(n) = T(n/2) + O(1) \;\Rightarrow\; O(\log n)"},
            {"type": "text", "html": "The deeper skill is <b>binary searching the answer</b>: if a yes/no question is monotonic (once true, stays true), you can binary-search the smallest value that works — 'minimum capacity to ship in D days', for instance."},
            {"type": "callout", "kind": "warning", "html": "Off-by-one bugs live here. Fix your invariant — is <code>hi</code> inclusive or exclusive? — and stick to it. Most binary-search bugs are inconsistent bounds."},
        ],
        "quiz": [
            {"q": "Binary search runs in…", "options": ["O(n)", "O(log n)", "O(1)", "O(n log n)"], "answer": 1, "explain": "It halves the range each step."},
            {"q": "Binary search requires the data to be…", "options": ["Random", "Sorted (or the answer-space monotonic)", "Hashed", "A tree"], "answer": 1, "explain": "Discarding half only works on an ordered space."},
            {"q": "'Binary search the answer' works when the check is…", "options": ["Random", "Monotonic (once true, stays true)", "Always false", "O(n²)"], "answer": 1, "explain": "Monotonicity lets you locate the threshold."},
        ],
    },
    {
        "id": "dsa-recursion", "order": 11, "title": "Recursion & Backtracking", "topic": "recursion", "level": "Intermediate", "minutes": 8,
        "summary": "Solve a problem in terms of smaller copies of itself — then explore all possibilities.",
        "blocks": [
            {"type": "text", "html": "A <b>recursive</b> function calls itself on a smaller input until it hits a <b>base case</b>. Every recursion needs two things: a base case that stops it, and progress toward that base case."},
            {"type": "text", "html": "<b>Backtracking</b> is recursion that explores choices and undoes them: permutations, subsets, Sudoku, the N-Queens. Build a partial solution, recurse, and if it fails, step back and try the next option."},
            {"type": "callout", "kind": "warning", "html": "Naive recursion can explode — Fibonacci recomputes the same values exponentially. The recursion-tree lab shows this; switch on <b>memoisation</b> and the tree collapses to linear."},
            {"type": "try", "target": "lab", "lab": "recursion", "label": "Watch memoisation collapse an exponential tree", "preset": {}},
        ],
        "quiz": [
            {"q": "Every recursion needs a…", "options": ["Loop", "Base case", "Hash map", "Sort"], "answer": 1, "explain": "The base case stops the recursion."},
            {"q": "Backtracking is recursion that…", "options": ["Never returns", "Explores choices and undoes them", "Only sorts", "Uses no stack"], "answer": 1, "explain": "It builds partial solutions and retreats on failure."},
            {"q": "Naive recursive Fibonacci is slow because it…", "options": ["Uses a queue", "Recomputes the same subproblems", "Has no base case", "Sorts first"], "answer": 1, "explain": "Overlapping subproblems → memoise them (DP)."},
        ],
    },
    {
        "id": "dsa-heaps", "order": 12, "title": "Heaps & Priority Queues", "topic": "heaps", "level": "Intermediate", "minutes": 7,
        "summary": "Always grab the smallest (or largest) next — in O(log n).",
        "blocks": [
            {"type": "text", "html": "A <b>heap</b> is a binary tree kept in an array where every parent beats its children (min-heap: parent ≤ children). The min (or max) is always at the root — O(1) to peek, O(log n) to insert or remove."},
            {"type": "text", "html": "That makes it the perfect <b>priority queue</b>: it feeds Dijkstra's shortest paths, Prim's MST, Huffman coding, and 'top-k' problems. <b>Heapsort</b> uses it to sort in O(n log n) with no extra memory."},
            {"type": "callout", "kind": "tip", "html": "'Find the k largest elements' doesn't need a full sort — keep a size-k heap and you get O(n log k), which matters when n is huge and k is small."},
        ],
        "quiz": [
            {"q": "Peeking the minimum of a min-heap is…", "options": ["O(1)", "O(n)", "O(log n)", "O(n log n)"], "answer": 0, "explain": "The min sits at the root."},
            {"q": "Inserting into a heap is…", "options": ["O(1)", "O(log n)", "O(n)", "O(n²)"], "answer": 1, "explain": "The new element bubbles up at most tree-height steps."},
            {"q": "A heap is the data structure behind a…", "options": ["Hash map", "Priority queue (Dijkstra, Prim)", "Stack", "Binary search"], "answer": 1, "explain": "It always yields the next-highest-priority item."},
        ],
    },
    {
        "id": "dsa-trees-balanced", "order": 13, "title": "Balanced Trees & BSTs", "topic": "trees", "level": "Advanced", "minutes": 8,
        "summary": "Keep a search tree short so operations stay O(log n) instead of O(n).",
        "blocks": [
            {"type": "text", "html": "A <b>binary search tree</b> keeps smaller keys left, larger keys right, so search is O(height). But insert sorted data and it degrades into a linked list — O(n)."},
            {"type": "text", "html": "<b>Self-balancing</b> trees fix this. An <b>AVL</b> tree rotates after inserts to keep the two sides' heights within 1; <b>red–black</b> trees relax that slightly for faster inserts and back most language library maps/sets."},
            {"type": "callout", "kind": "insight", "html": "Databases use a cousin — the <b>B-tree</b> — with wide nodes to minimise disk reads. Same idea: keep the tree shallow so you touch few nodes per lookup."},
            {"type": "try", "target": "lab", "lab": "trees", "label": "Insert into a BST vs an AVL and watch rotations", "preset": {}},
        ],
        "quiz": [
            {"q": "An unbalanced BST fed sorted data degrades to…", "options": ["O(1)", "O(log n)", "O(n) (a linked list)", "O(n²)"], "answer": 2, "explain": "It becomes a single long chain."},
            {"q": "An AVL tree stays balanced using…", "options": ["Hashing", "Rotations after insert/delete", "Sorting", "A queue"], "answer": 1, "explain": "Rotations keep sub-tree heights within one."},
            {"q": "Databases keep lookups shallow with a…", "options": ["Stack", "B-tree", "Min-heap", "Hash only"], "answer": 1, "explain": "Wide B-tree nodes minimise disk reads."},
        ],
    },
    {
        "id": "dsa-graph-algos", "order": 14, "title": "Shortest Paths & Spanning Trees", "topic": "graphs", "level": "Advanced", "minutes": 9,
        "summary": "Dijkstra, Bellman–Ford and the minimum spanning tree — the algorithms behind maps and networks.",
        "blocks": [
            {"type": "text", "html": "Graphs model roads, networks and dependencies. For <b>shortest paths</b> with non-negative weights, <b>Dijkstra</b> greedily expands the nearest unvisited node using a heap — O(E log V)."},
            {"type": "text", "html": "With negative edges, use <b>Bellman–Ford</b> (and detect negative cycles). To connect all nodes at minimum total cost — a <b>minimum spanning tree</b> — use <b>Prim</b> or <b>Kruskal</b> (with union-find)."},
            {"type": "formula", "tex": r"\text{Dijkstra: } d(v) = \min\big(d(v),\ d(u) + w(u,v)\big)"},
            {"type": "callout", "kind": "warning", "html": "Dijkstra breaks on negative edges — its greedy 'closest first' assumption fails. Know which algorithm your graph needs before you code."},
            {"type": "try", "target": "lab", "lab": "graphs", "label": "Watch Dijkstra relax edges and Prim grow an MST", "preset": {}},
        ],
        "quiz": [
            {"q": "Dijkstra requires edge weights to be…", "options": ["Negative", "Non-negative", "Zero", "Integers only"], "answer": 1, "explain": "Its greedy choice fails with negative edges."},
            {"q": "A minimum spanning tree connects all nodes with…", "options": ["The most edges", "Minimum total edge weight", "A single node", "Negative cycles"], "answer": 1, "explain": "Prim/Kruskal minimise total connecting cost."},
            {"q": "For graphs with negative edges, use…", "options": ["Dijkstra", "Bellman–Ford", "Binary search", "A heap only"], "answer": 1, "explain": "Bellman–Ford handles negatives and finds negative cycles."},
        ],
    },
    {
        "id": "dsa-dp", "order": 15, "title": "Dynamic Programming", "topic": "dp", "level": "Advanced", "minutes": 9,
        "summary": "Remember sub-answers once, reuse them forever — the technique that scares most interviewees.",
        "blocks": [
            {"type": "text", "html": "<b>Dynamic programming</b> applies when a problem has <b>overlapping subproblems</b> and <b>optimal substructure</b> — the best overall answer is built from best answers to smaller pieces."},
            {"type": "text", "html": "Two styles: <b>top-down</b> (recursion + memoisation) and <b>bottom-up</b> (fill a table). Classics: Fibonacci, longest common subsequence, edit distance, knapsack, coin change — each goes from exponential to polynomial."},
            {"type": "callout", "kind": "tip", "html": "The DP recipe: (1) define the state, (2) write the recurrence between states, (3) set base cases, (4) decide the fill order. Nail the state and the rest follows."},
            {"type": "try", "target": "lab", "lab": "dp", "label": "Fill a DP table and trace back the answer", "preset": {}},
        ],
        "quiz": [
            {"q": "DP needs overlapping subproblems and…", "options": ["Random data", "Optimal substructure", "A heap", "Sorting"], "answer": 1, "explain": "The optimum is built from sub-optima."},
            {"q": "Top-down DP = recursion plus…", "options": ["A queue", "Memoisation", "Sorting", "Hashing keys"], "answer": 1, "explain": "Cache each subproblem's answer the first time."},
            {"q": "Edit distance and knapsack are classic…", "options": ["Sorting problems", "DP problems", "Graph colourings", "Hash tables"], "answer": 1, "explain": "Both decompose into reusable subproblems."},
        ],
    },
    {
        "id": "dsa-greedy", "order": 16, "title": "Greedy Algorithms", "topic": "greedy", "level": "Intermediate", "minutes": 7,
        "summary": "Take the best-looking choice now — and know when that actually works.",
        "blocks": [
            {"type": "text", "html": "A <b>greedy</b> algorithm makes the locally best choice at each step and never looks back. It's fast and simple — <i>when</i> a problem has the <b>greedy-choice property</b>."},
            {"type": "text", "html": "It works for interval scheduling (pick the earliest finishing meeting), Huffman coding, and Dijkstra/Prim. It <i>fails</i> for the 0/1 knapsack and making change with odd coin systems — there you need DP."},
            {"type": "callout", "kind": "warning", "html": "The danger of greedy is confidence: it often produces a plausible-but-wrong answer. Always ask 'can a locally bad choice lead to a globally better result?' — if yes, greedy is unsafe."},
        ],
        "quiz": [
            {"q": "A greedy algorithm…", "options": ["Tries all options", "Takes the locally best choice and never backtracks", "Always uses DP", "Sorts only"], "answer": 1, "explain": "It commits to each step's best-looking option."},
            {"q": "Greedy is guaranteed correct only when the problem has…", "options": ["Many edges", "The greedy-choice property", "Negative weights", "A heap"], "answer": 1, "explain": "Local optima must compose into the global optimum."},
            {"q": "The 0/1 knapsack needs DP because greedy…", "options": ["Is too slow", "Can give a wrong answer", "Needs a graph", "Has no base case"], "answer": 1, "explain": "A locally good item can block a better combination."},
        ],
    },
    {
        "id": "dsa-patterns", "order": 17, "title": "Interview Patterns & Problem Solving", "topic": "interview", "level": "Intermediate", "minutes": 8,
        "summary": "The dozen patterns behind most coding-interview questions — and how to approach any problem.",
        "blocks": [
            {"type": "text", "html": "Most interview problems are variations on a handful of <b>patterns</b>: two pointers, sliding window, fast & slow pointers, binary search, BFS/DFS, heap/top-k, backtracking, dynamic programming, union-find and monotonic stack."},
            {"type": "text", "html": "A reliable approach: (1) clarify inputs and edge cases, (2) brute-force first and state its Big-O, (3) spot the pattern that removes the bottleneck, (4) code it, (5) test with a small example and the empty/edge cases."},
            {"type": "callout", "kind": "tip", "html": "Interviewers score your <i>communication</i> as much as your code. Think out loud, name the pattern you're reaching for, and state the complexity before and after."},
            {"type": "callout", "kind": "insight", "html": "You can't memorise every problem, but you can master ~12 patterns. Once you recognise which one a question is, the solution almost writes itself."},
        ],
        "quiz": [
            {"q": "A good first step on any interview problem is to…", "options": ["Write the optimal solution instantly", "Clarify inputs, then brute-force and state its Big-O", "Stay silent", "Guess the pattern"], "answer": 1, "explain": "Clarify, baseline, then optimise."},
            {"q": "'Top-k largest' maps to which pattern?", "options": ["Sliding window", "Heap / top-k", "Union-find", "Monotonic stack"], "answer": 1, "explain": "A size-k heap tracks the largest items efficiently."},
            {"q": "Interviewers also heavily weight your…", "options": ["Typing speed", "Communication and reasoning", "Editor theme", "Keyboard"], "answer": 1, "explain": "Thinking out loud and naming trade-offs matters a lot."},
        ],
    },
]

KNOWLEDGE_EXTRA = {
    "two-pointer": {"keys": ["array", "two pointer", "two-pointer", "sliding window", "string"], "lesson": "dsa-arrays",
                    "text": "An **array** gives O(1) indexing but O(n) middle inserts. The **two-pointer** and **sliding-window** patterns walk indices through it to turn many O(n²) problems into O(n)."},
    "stack-queue": {"keys": ["stack", "queue", "lifo", "fifo", "deque"], "lesson": "dsa-stacks",
                    "text": "A **stack** is LIFO (undo, call stack, bracket matching); a **queue** is FIFO (BFS, scheduling). Both do push/pop in O(1); a deque allows both ends."},
    "binary-search": {"keys": ["binary search", "log n", "search space", "monotonic"], "lesson": "dsa-searching",
                      "text": "**Binary search** halves a sorted range each step for O(log n). 'Binary-searching the answer' finds the threshold of any monotonic yes/no condition."},
    "backtracking": {"keys": ["recursion", "base case", "backtracking", "memoisation"], "lesson": "dsa-recursion",
                     "text": "**Recursion** solves a problem via smaller copies down to a base case. **Backtracking** explores and undoes choices (permutations, N-Queens); memoisation stops exponential recompute."},
    "heap": {"keys": ["heap", "priority queue", "heapsort", "top-k", "min-heap"], "lesson": "dsa-heaps",
             "text": "A **heap** keeps the min/max at the root: O(1) peek, O(log n) insert/pop. It is the **priority queue** behind Dijkstra, Prim, Huffman and top-k problems."},
    "balanced-tree": {"keys": ["binary search tree", "bst", "avl", "red-black", "b-tree", "self-balancing"], "lesson": "dsa-trees-balanced",
                      "text": "A **BST** gives O(height) search but degrades to O(n) if unbalanced. **AVL** and **red–black** trees rotate to stay O(log n); databases use B-trees to stay shallow on disk."},
    "shortest-path": {"keys": ["dijkstra", "bellman-ford", "shortest path", "minimum spanning tree", "mst", "prim", "kruskal", "union-find"], "lesson": "dsa-graph-algos",
                      "text": "**Dijkstra** finds shortest paths with non-negative weights (O(E log V)); **Bellman–Ford** handles negatives. **Prim/Kruskal** build a minimum spanning tree."},
    "dynamic-programming": {"keys": ["dynamic programming", "dp", "overlapping subproblems", "optimal substructure", "knapsack", "edit distance"], "lesson": "dsa-dp",
                            "text": "**Dynamic programming** solves problems with overlapping subproblems and optimal substructure by caching sub-answers (top-down memoisation or bottom-up table)."},
    "greedy": {"keys": ["greedy", "greedy-choice", "interval scheduling", "huffman"], "lesson": "dsa-greedy",
               "text": "A **greedy** algorithm takes the locally best choice and never backtracks. Correct only with the greedy-choice property (scheduling, Huffman); knapsack needs DP instead."},
    "interview-patterns": {"keys": ["interview", "patterns", "problem solving", "leetcode"], "lesson": "dsa-patterns",
                           "text": "Most coding problems reduce to ~12 **patterns** (two pointers, sliding window, binary search, BFS/DFS, heap, backtracking, DP, union-find…). Clarify, brute-force, then apply the pattern."},
}

TERMS_EXTRA = {
    "two-pointer": ("Arrays & two pointers", ["sliding window"]),
    "stack-queue": ("Stacks & queues", ["lifo", "fifo"]),
    "binary-search": ("Binary search", ["binary search"]),
    "backtracking": ("Recursion & backtracking", ["backtracking"]),
    "heap": ("Heaps & priority queues", ["priority queue"]),
    "balanced-tree": ("Balanced trees (AVL / B-tree)", ["bst", "avl"]),
    "shortest-path": ("Shortest paths & MST", ["dijkstra", "mst"]),
    "dynamic-programming": ("Dynamic programming", ["dp", "knapsack"]),
    "greedy": ("Greedy algorithms", ["greedy"]),
    "interview-patterns": ("Interview patterns", ["leetcode patterns"]),
}
