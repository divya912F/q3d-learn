"""Data Structures & Algorithms course: lessons (with Java snippets), quizzes, challenges and tutor knowledge."""
from __future__ import annotations

from . import engine

COURSE = {
    "id": "dsa",
    "title": "Data Structures & Algorithms",
    "short": "DSA",
    "tagline": "Sorting races, glowing graphs and self-balancing trees — see every step of the algorithm.",
    "description": "Big-O, arrays, stacks and queues, sorting, recursion, trees and graphs — each algorithm runs for real "
                   "and replays step by step, with Java snippets you can use in interviews and on LeetCode.",
    "color": "#1098ad",
    "icon": "braces",
    "level": "Beginner → Intermediate",
    "labs": [
        {"id": "sorting", "title": "Sorting Race", "icon": "sort",
         "description": "Six sorting algorithms race side by side on the same array — count every comparison and swap."},
        {"id": "graphs", "title": "Graph Explorer", "icon": "graph",
         "description": "Watch BFS ripple outward, Dijkstra relax edges and Prim/Kruskal grow a minimum spanning tree."},
        {"id": "trees", "title": "Tree Garden", "icon": "tree",
         "description": "Insert into a BST or an AVL tree and watch rotations keep it balanced; replay every traversal."},
        {"id": "dp", "title": "DP Table Builder", "icon": "table",
         "description": "Fill a dynamic-programming table cell by cell, then trace back the answer — LCS, edit distance, knapsack, coin change."},
        {"id": "recursion", "title": "Recursion Tree", "icon": "tree",
         "description": "See calls branch and return; switch on memoisation and watch an exponential tree collapse."},
    ],
    "topics": {
        "complexity": "Big-O", "linear": "Arrays, stacks & queues", "sorting": "Sorting", "recursion": "Divide & conquer",
        "trees": "Trees", "graphs": "Graphs", "hashing": "Heaps & hashing",
    },
}

LESSONS = [
    {
        "id": "dsa-bigo", "order": 1, "title": "Big-O: How Algorithms Scale", "topic": "complexity", "level": "Beginner", "minutes": 7,
        "summary": "Count steps, drop constants, keep the fastest-growing term.",
        "blocks": [
            {"type": "text", "html": "We compare algorithms by how their work grows with the input size <i>n</i>, not by stopwatch time on one laptop. <b>Big-O</b> keeps only the fastest-growing term and drops constants."},
            {"type": "formula", "tex": r"3n^2 + 20n + 7 \;\in\; O(n^2) \qquad O(1) < O(\log n) < O(n) < O(n\log n) < O(n^2) < O(2^n)"},
            {"type": "text", "html": "<pre><code>// O(n): one pass\nint max = a[0];\nfor (int x : a) max = Math.max(max, x);\n\n// O(n²): every pair\nfor (int i = 0; i &lt; n; i++)\n  for (int j = i + 1; j &lt; n; j++)\n    if (a[i] == a[j]) return true;</code></pre>"},
            {"type": "callout", "kind": "insight", "html": "Doubling <i>n</i>: O(n) work doubles, O(n²) work <b>quadruples</b>, O(log n) work grows by just one step. That is why the choice of algorithm matters more than a faster computer."},
            {"type": "try", "target": "lab", "lab": "sorting", "label": "See O(n²) vs O(n log n) in the growth chart", "preset": {"order": "random", "n": 32}},
        ],
        "quiz": [
            {"q": "Simplify 5n² + 100n + 9 in Big-O.", "options": ["O(n)", "O(n²)", "O(100n)", "O(5n²)"], "answer": 1, "explain": "Keep the fastest-growing term and drop constants."},
            {"q": "If n doubles, an O(n²) algorithm does roughly…", "options": ["the same work", "2× the work", "4× the work", "n× the work"], "answer": 2, "explain": "(2n)² = 4n²."},
            {"q": "Binary search on a sorted array is…", "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"], "answer": 1, "explain": "Each step halves the search range."},
        ],
    },
    {
        "id": "dsa-linear", "order": 2, "title": "Arrays, Linked Lists, Stacks & Queues", "topic": "linear", "level": "Beginner", "minutes": 8,
        "summary": "Pick the structure whose fast operations match your problem.",
        "blocks": [
            {"type": "text", "html": "<ul><li><b>Array</b> — contiguous memory: index in O(1), insert in the middle O(n).</li><li><b>Linked list</b> — nodes with pointers: insert/delete at a known node O(1), but finding the i-th item is O(n).</li><li><b>Stack</b> (LIFO) — push/pop at one end: undo, recursion, matching brackets, DFS.</li><li><b>Queue</b> (FIFO) — add at the back, remove at the front: scheduling, BFS.</li></ul>"},
            {"type": "text", "html": "<pre><code>Deque&lt;Character&gt; st = new ArrayDeque&lt;&gt;();\nfor (char c : s.toCharArray()) {\n  if (c == '(') st.push(c);\n  else if (st.isEmpty()) return false;   // ')' with nothing to match\n  else st.pop();\n}\nreturn st.isEmpty();</code></pre>"},
            {"type": "callout", "kind": "tip", "html": "In Java prefer <code>ArrayDeque</code> for both stacks and queues — it is faster than the old <code>Stack</code> class."},
            {"type": "try", "target": "lab", "lab": "graphs", "label": "A queue makes BFS spread in rings", "preset": {"algorithm": "bfs"}},
        ],
        "quiz": [
            {"q": "Which structure gives O(1) access to the i-th element?", "options": ["Linked list", "Array", "Queue", "Stack"], "answer": 1, "explain": "Address = base + i × size."},
            {"q": "Undo in a text editor naturally uses a…", "options": ["Queue", "Stack", "Heap", "Hash map"], "answer": 1, "explain": "Last action in, first action out."},
            {"q": "BFS stores the nodes to visit in a…", "options": ["Stack", "Queue", "Tree", "Set only"], "answer": 1, "explain": "FIFO order explores level by level."},
        ],
    },
    {
        "id": "dsa-sorting", "order": 3, "title": "Simple Sorts: Bubble, Insertion, Selection", "topic": "sorting", "level": "Beginner", "minutes": 8,
        "summary": "Three O(n²) sorts and when insertion sort is secretly great.",
        "blocks": [
            {"type": "text", "html": "<b>Bubble sort</b> swaps neighbours until no swap happens. <b>Selection sort</b> picks the minimum of the unsorted part each round. <b>Insertion sort</b> grows a sorted prefix, sliding each new item into place — like sorting playing cards in your hand."},
            {"type": "text", "html": "<pre><code>for (int i = 1; i &lt; a.length; i++) {\n  int key = a[i], j = i - 1;\n  while (j &gt;= 0 &amp;&amp; a[j] &gt; key) { a[j + 1] = a[j]; j--; }\n  a[j + 1] = key;\n}</code></pre>"},
            {"type": "callout", "kind": "insight", "html": "On <b>nearly sorted</b> data insertion sort does almost no work — close to O(n). That is why real libraries (e.g. TimSort in Java's <code>Arrays.sort</code> for objects) use it for small or nearly sorted runs."},
            {"type": "try", "target": "lab", "lab": "sorting", "label": "Race them on a nearly sorted array", "preset": {"order": "nearly", "n": 32}},
        ],
        "quiz": [
            {"q": "Which simple sort is fastest on nearly sorted input?", "options": ["Selection sort", "Insertion sort", "Bubble sort without early exit", "They are all equal"], "answer": 1, "explain": "Each item only moves a short distance."},
            {"q": "Selection sort always makes how many comparisons on n items?", "options": ["n − 1", "n log n", "n(n−1)/2", "It depends on the order"], "answer": 2, "explain": "It scans the whole unsorted part every round."},
            {"q": "A stable sort…", "options": ["Never uses extra memory", "Keeps equal items in their original order", "Is always O(n log n)", "Only sorts numbers"], "answer": 1, "explain": "Stability matters when sorting records by one field."},
        ],
    },
    {
        "id": "dsa-divide", "order": 4, "title": "Recursion, Merge Sort & Quicksort", "topic": "recursion", "level": "Intermediate", "minutes": 10,
        "summary": "Split the problem, solve the halves, combine — O(n log n).",
        "blocks": [
            {"type": "text", "html": "A <b>recursive</b> function calls itself on a smaller input and needs a <b>base case</b> to stop. <b>Divide and conquer</b> splits a problem, solves the parts recursively and combines them."},
            {"type": "formula", "tex": r"T(n) = 2\,T\!\left(\tfrac{n}{2}\right) + O(n) \;\Rightarrow\; T(n) = O(n \log n)"},
            {"type": "text", "html": "<b>Merge sort</b> splits in half and merges two sorted halves — always O(n log n), stable, needs O(n) extra space. <b>Quicksort</b> partitions around a pivot; average O(n log n) and very fast in practice, but a bad pivot (e.g. always the last element on already-sorted data) degrades it to O(n²)."},
            {"type": "text", "html": "<pre><code>void quick(int[] a, int lo, int hi) {\n  if (lo &gt;= hi) return;            // base case\n  int p = partition(a, lo, hi);    // pivot lands in its final spot\n  quick(a, lo, p - 1);\n  quick(a, p + 1, hi);\n}</code></pre>"},
            {"type": "callout", "kind": "warning", "html": "Try quicksort on a <b>reversed</b> array in the lab — with a last-element pivot every partition is lopsided and comparisons explode to n(n−1)/2. Random or median-of-three pivots fix this."},
            {"type": "try", "target": "lab", "lab": "sorting", "label": "Watch quicksort struggle on reversed input", "preset": {"order": "reversed", "n": 32}},
        ],
        "quiz": [
            {"q": "Every recursive function needs…", "options": ["A loop", "A base case", "Two recursive calls", "A global variable"], "answer": 1, "explain": "Otherwise it never stops."},
            {"q": "Merge sort's worst case is…", "options": ["O(n)", "O(n log n)", "O(n²)", "O(log n)"], "answer": 1, "explain": "The split is always even."},
            {"q": "Quicksort with a last-element pivot on sorted input takes…", "options": ["O(n)", "O(n log n)", "O(n²)", "O(1)"], "answer": 2, "explain": "Each partition only removes one element."},
        ],
    },
    {
        "id": "dsa-trees", "order": 5, "title": "Binary Search Trees & AVL Trees", "topic": "trees", "level": "Intermediate", "minutes": 10,
        "summary": "Ordered trees give O(log n) search — if they stay balanced.",
        "blocks": [
            {"type": "text", "html": "In a <b>binary search tree</b> every key in the left subtree is smaller and every key in the right subtree is larger, so search follows one path: O(height). An in-order traversal visits keys in sorted order."},
            {"type": "text", "html": "Insert sorted data into a plain BST and it degenerates into a linked list (height n). An <b>AVL tree</b> keeps every node's balance factor (left height − right height) in {−1, 0, 1} by <b>rotating</b> after inserts and deletes, guaranteeing height O(log n)."},
            {"type": "formula", "tex": r"\text{balance}(v) = h(v.\text{left}) - h(v.\text{right}) \in \{-1, 0, 1\}"},
            {"type": "text", "html": "<pre><code>Node insert(Node n, int key) {\n  if (n == null) return new Node(key);\n  if (key &lt; n.key) n.left = insert(n.left, key);\n  else if (key &gt; n.key) n.right = insert(n.right, key);\n  return n;   // AVL: update height, rotate if |balance| &gt; 1\n}</code></pre>"},
            {"type": "try", "target": "lab", "lab": "trees", "label": "Insert sorted keys into a BST vs an AVL tree", "preset": {"preset": "sorted", "kind": "bst"}},
        ],
        "quiz": [
            {"q": "In-order traversal of a BST outputs keys…", "options": ["In insertion order", "Sorted ascending", "Level by level", "Randomly"], "answer": 1, "explain": "Left subtree, node, right subtree."},
            {"q": "Inserting 1, 2, 3, …, n into a plain BST gives height…", "options": ["log n", "n", "√n", "1"], "answer": 1, "explain": "Every node becomes a right child — a linked list."},
            {"q": "AVL trees restore balance using…", "options": ["Rotations", "Rehashing", "Sorting", "Recursion limits"], "answer": 0, "explain": "Single or double rotations fix a balance factor of ±2."},
        ],
    },
    {
        "id": "dsa-graphs", "order": 6, "title": "Graphs: BFS, DFS, Dijkstra & MST", "topic": "graphs", "level": "Intermediate", "minutes": 11,
        "summary": "Traverse, find shortest paths and connect everything cheaply.",
        "blocks": [
            {"type": "text", "html": "A <b>graph</b> is vertices plus edges (maybe weighted). Store it as an <b>adjacency list</b> — O(V + E) memory. <b>BFS</b> (queue) finds fewest-edge paths; <b>DFS</b> (stack/recursion) explores deep and powers cycle detection and topological sort."},
            {"type": "text", "html": "<b>Dijkstra</b> finds shortest weighted paths from a source (non-negative weights) by always finalising the closest unfinished vertex with a priority queue — O((V + E) log V). A <b>minimum spanning tree</b> connects all vertices with the least total weight: <b>Prim</b> grows one tree from a start vertex; <b>Kruskal</b> adds the cheapest edges that do not form a cycle (union–find)."},
            {"type": "text", "html": "<pre><code>PriorityQueue&lt;int[]&gt; pq = new PriorityQueue&lt;&gt;((x, y) -&gt; x[0] - y[0]);\ndist[src] = 0; pq.add(new int[]{0, src});\nwhile (!pq.isEmpty()) {\n  int[] top = pq.poll(); int d = top[0], u = top[1];\n  if (d &gt; dist[u]) continue;                 // stale entry\n  for (int[] e : adj.get(u))                  // e = {v, w}\n    if (d + e[1] &lt; dist[e[0]]) { dist[e[0]] = d + e[1]; pq.add(new int[]{dist[e[0]], e[0]}); }\n}</code></pre>"},
            {"type": "callout", "kind": "insight", "html": "Prim and Kruskal always find the <b>same total weight</b> — check it in the lab — even though they add edges in a different order."},
            {"type": "try", "target": "lab", "lab": "graphs", "label": "Watch Dijkstra relax the edges", "preset": {"algorithm": "dijkstra"}},
        ],
        "quiz": [
            {"q": "Dijkstra's algorithm requires edge weights to be…", "options": ["Integers", "Non-negative", "Unique", "Less than 10"], "answer": 1, "explain": "A negative edge could improve an already-finalised vertex (use Bellman–Ford instead)."},
            {"q": "Kruskal's algorithm skips an edge when…", "options": ["It is the heaviest", "It would create a cycle", "Its endpoints have degree 1", "It was seen by BFS"], "answer": 1, "explain": "Union–find detects that both ends are already connected."},
            {"q": "An adjacency list for V vertices and E edges uses…", "options": ["O(V²)", "O(V + E)", "O(E²)", "O(1)"], "answer": 1, "explain": "One list entry per edge end plus one list per vertex."},
        ],
    },
    {
        "id": "dsa-hashing", "order": 7, "title": "Heaps & Hash Tables", "topic": "hashing", "level": "Intermediate", "minutes": 8,
        "summary": "The two structures behind priority queues and O(1) lookups.",
        "blocks": [
            {"type": "text", "html": "A <b>binary heap</b> is a complete tree stored in an array where every parent is ≥ its children (max-heap). The children of index i are 2i+1 and 2i+2. Insert and remove-max are O(log n); <b>heap sort</b> builds a heap and repeatedly moves the max to the end."},
            {"type": "text", "html": "A <b>hash table</b> maps a key to a bucket with a hash function, giving O(1) average insert/lookup. <b>Collisions</b> are handled by chaining or open addressing; keeping the <b>load factor</b> low (Java's <code>HashMap</code> resizes at 0.75) keeps it fast."},
            {"type": "text", "html": "<pre><code>Map&lt;Integer, Integer&gt; seen = new HashMap&lt;&gt;();   // Two Sum in O(n)\nfor (int i = 0; i &lt; nums.length; i++) {\n  Integer j = seen.get(target - nums[i]);\n  if (j != null) return new int[]{j, i};\n  seen.put(nums[i], i);\n}</code></pre>"},
            {"type": "callout", "kind": "tip", "html": "Many “O(n²) → O(n)” interview tricks are just: <b>remember what you have seen in a HashMap</b>."},
            {"type": "try", "target": "lab", "lab": "sorting", "label": "Watch heap sort build and drain a heap", "preset": {"order": "random", "n": 24}},
        ],
        "quiz": [
            {"q": "In an array-based heap, the children of index i are…", "options": ["i+1 and i+2", "2i+1 and 2i+2", "i/2 and i/2+1", "i−1 and i+1"], "answer": 1, "explain": "Zero-based complete binary tree layout."},
            {"q": "Average lookup time in a well-sized hash table is…", "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"], "answer": 0, "explain": "Hash straight to the bucket."},
            {"q": "Java's HashMap grows its table when the load factor passes…", "options": ["0.25", "0.5", "0.75", "1.0"], "answer": 2, "explain": "The default load factor is 0.75."},
        ],
    },
]

GRAPH_SEED = {"nodes": 10, "density": 0.35, "seed": 3}


def _dijkstra_answer() -> int:
    r = engine.graph_run("dijkstra", **GRAPH_SEED, start=0)
    return r["dist"][7]


CHALLENGES = [
    {"id": "dsa-race", "title": "Beat the Reverse", "difficulty": "Easy", "points": 60, "topic": "sorting",
     "kind": "lab", "lab": "sorting",
     "description": "Sort 32 numbers that arrive in REVERSED order using fewer than 200 comparisons.",
     "goal": "Pick an algorithm that finishes the reversed array in < 200 comparisons.",
     "hint": "Quicksort with a last-element pivot hates sorted or reversed input. Which algorithm always splits evenly?",
     "preset": {"order": "reversed", "n": 32, "algorithm": "bubble"}, "lock": ["order", "n"]},
    {"id": "dsa-nearly", "title": "Almost Sorted", "difficulty": "Easy", "points": 50, "topic": "sorting",
     "kind": "answer", "answer_type": "choice", "options": ["bubble", "insertion", "selection", "merge", "quick", "heap"],
     "description": "For 32 nearly sorted numbers (a few neighbours swapped), which algorithm makes the FEWEST comparisons?",
     "goal": "Pick the algorithm.", "hint": "Run the race on the “nearly sorted” input and read the comparison counters.",
     "open_lab": {"lab": "sorting", "preset": {"order": "nearly", "n": 32}}, "compute": "nearly"},
    {"id": "dsa-dijkstra", "title": "Shortest Route", "difficulty": "Medium", "points": 90, "topic": "graphs",
     "kind": "answer", "answer_type": "number", "tolerance": 0,
     "description": "On the default graph (10 nodes, seed 3), what is the shortest-path distance from A to H?",
     "goal": "Type the total weight of the shortest A → H path.", "hint": "Run Dijkstra from A in the Graph Explorer and click node H.",
     "open_lab": {"lab": "graphs", "preset": {"algorithm": "dijkstra", **GRAPH_SEED}}, "compute": "dijkstra"},
    {"id": "dsa-avl", "title": "Stay Balanced", "difficulty": "Medium", "points": 80, "topic": "trees",
     "kind": "answer", "answer_type": "number", "tolerance": 0,
     "description": "Insert the keys 1, 2, 3, …, 15 in order into an AVL tree. What is the final height (a single node has height 1)?",
     "goal": "Type the height.", "hint": "Compare with a plain BST: it would be 15! Use the Tree Garden with the “sorted” preset.",
     "open_lab": {"lab": "trees", "preset": {"kind": "avl", "values": list(range(1, 16))}}, "compute": "avl"},
]


def check_challenge(ch: dict, payload: dict) -> dict:
    if ch["kind"] == "answer":
        given = payload.get("answer")
        if ch["compute"] == "nearly":
            race = engine.sort_race(n=32, order="nearly")
            best = min(race["runs"], key=lambda r: r["comparisons"])["algorithm"]
            ok = str(given) == best
            counts = {r["algorithm"]: r["comparisons"] for r in race["runs"]}
            fb = f"Correct — {best} needs only {counts[best]} comparisons: each item moves just a step or two." if ok else \
                f"{given} needs {counts.get(str(given), '?')} comparisons. Something does much better on almost-sorted data."
            return {"solved": ok, "score": 1.0 if ok else 0.0, "feedback": [fb]}
        target = _dijkstra_answer() if ch["compute"] == "dijkstra" else engine.tree_ops("avl", list(range(1, 16)))["height"]
        try:
            ok = abs(float(given) - target) <= ch.get("tolerance", 0)
        except (TypeError, ValueError):
            ok = False
        fb = "Correct!" if ok else "Not quite — run it in the lab and read the result."
        if ok and ch["compute"] == "avl":
            fb = f"Correct — height {target}. The plain BST would be 15 tall; AVL rotations keep it at ⌈log₂16⌉ = 4."
        return {"solved": ok, "score": 1.0 if ok else 0.0, "feedback": [fb]}
    cfg = {**dict(payload.get("config") or {}), **{k: ch["preset"][k] for k in ch.get("lock", [])}}
    alg = cfg.get("algorithm", "bubble")
    res = engine.sort_trace(alg if alg in engine.SORTS else "bubble", n=32, order="reversed")
    ok = res["comparisons"] < 200
    return {"solved": ok, "score": 1.0 if ok else round(min(0.9, 200 / max(1, res["comparisons"])), 2),
            "feedback": [("✅ " if ok else "❌ ") + f"{alg} used {res['comparisons']} comparisons (limit 199)."]}


KNOWLEDGE = {
    "big-o": {"keys": ["big-o", "big o", "complexity", "o(n", "time complexity", "asymptotic"], "lesson": "dsa-bigo",
              "text": "**Big-O** describes how an algorithm's work grows with input size n, keeping the fastest-growing term and dropping constants. Order: O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ)."},
    "array": {"keys": ["array", "arraylist", "index"], "lesson": "dsa-linear",
              "text": "An **array** stores items in contiguous memory, so reading index i is O(1), but inserting or deleting in the middle shifts elements: O(n). Java's `ArrayList` is a resizable array with amortised O(1) append."},
    "linked-list": {"keys": ["linked list", "linkedlist", "node pointer"], "lesson": "dsa-linear",
                    "text": "A **linked list** chains nodes with pointers. Insert/delete at a known node is O(1), but reaching the i-th element is O(n) and it has no cache locality."},
    "stack-queue": {"keys": ["stack", "queue", "lifo", "fifo", "deque"], "lesson": "dsa-linear",
                    "text": "A **stack** is LIFO (push/pop at one end — undo, recursion, DFS); a **queue** is FIFO (enqueue at back, dequeue at front — scheduling, BFS). In Java use `ArrayDeque` for both."},
    "sorting": {"keys": ["sorting", "bubble", "insertion sort", "selection sort", "stable sort"], "lesson": "dsa-sorting",
                "text": "**Simple sorts** (bubble, insertion, selection) are O(n²). Insertion sort is near O(n) on nearly sorted data and is stable; selection sort always does n(n−1)/2 comparisons."},
    "recursion": {"keys": ["recursion", "recursive", "base case", "divide and conquer"], "lesson": "dsa-divide",
                  "text": "**Recursion** solves a problem by calling itself on smaller inputs and stopping at a **base case**. **Divide and conquer** splits, solves the parts and combines them, e.g. T(n) = 2T(n/2) + O(n) = O(n log n)."},
    "merge-sort": {"keys": ["merge sort", "mergesort"], "lesson": "dsa-divide",
                   "text": "**Merge sort** splits the array in half, sorts each half and merges them: always O(n log n), stable, O(n) extra memory."},
    "quicksort": {"keys": ["quicksort", "quick sort", "pivot", "partition"], "lesson": "dsa-divide",
                  "text": "**Quicksort** partitions around a pivot so smaller items go left and larger right, then recurses. Average O(n log n) and cache-friendly; a consistently bad pivot gives O(n²), avoided with random or median-of-three pivots."},
    "bst": {"keys": ["binary search tree", "bst", "inorder", "in-order", "traversal"], "lesson": "dsa-trees",
            "text": "A **binary search tree** keeps smaller keys left and larger keys right, so search/insert cost O(height). In-order traversal lists keys in sorted order. Sorted inserts make it degenerate to height n."},
    "avl": {"keys": ["avl", "balanced tree", "rotation", "balance factor", "red-black"], "lesson": "dsa-trees",
            "text": "An **AVL tree** is a self-balancing BST: every node's balance factor (left height − right height) stays in {−1, 0, 1}, restored by single or double **rotations**, so height is O(log n)."},
    "graph": {"keys": ["graph", "vertex", "vertices", "edge", "adjacency"], "lesson": "dsa-graphs",
              "text": "A **graph** has vertices and (possibly weighted, directed) edges. An adjacency list uses O(V + E) memory. BFS finds fewest-edge paths; DFS explores deeply (cycle detection, topological sort)."},
    "dijkstra-sp": {"keys": ["dijkstra", "shortest path", "relax"], "lesson": "dsa-graphs",
                    "text": "**Dijkstra's algorithm** finds shortest paths from a source with non-negative weights: repeatedly finalise the closest unfinished vertex (priority queue) and **relax** its edges. O((V + E) log V)."},
    "mst": {"keys": ["spanning tree", "mst", "prim", "kruskal", "union find", "union-find"], "lesson": "dsa-graphs",
            "text": "A **minimum spanning tree** connects all vertices with minimum total weight. **Prim** grows one tree from a start vertex; **Kruskal** adds the cheapest edges that don't form a cycle using union–find. Both reach the same total."},
    "heap": {"keys": ["heap", "priority queue", "heapify", "heap sort"], "lesson": "dsa-hashing",
             "text": "A **binary heap** is a complete tree in an array (children of i at 2i+1, 2i+2) with the heap property. Insert/remove-top are O(log n), building a heap is O(n), and it powers `PriorityQueue` and heap sort."},
    "hash-table": {"keys": ["hash table", "hashmap", "hash map", "collision", "load factor", "hashing"], "lesson": "dsa-hashing",
                   "text": "A **hash table** maps keys to buckets with a hash function for O(1) average lookups. Collisions are handled by chaining or probing; Java's `HashMap` resizes when the load factor exceeds 0.75."},
}

# --- v2.3 expanded curriculum (see extra.py) ---
from .extra import KNOWLEDGE_EXTRA, LESSONS_EXTRA, TOPICS_EXTRA  # noqa: E402

COURSE["topics"].update(TOPICS_EXTRA)
LESSONS = LESSONS + LESSONS_EXTRA
KNOWLEDGE.update(KNOWLEDGE_EXTRA)
