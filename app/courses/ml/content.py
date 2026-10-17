"""Machine Learning course: lessons, quizzes, challenges and tutor knowledge."""
from __future__ import annotations

from . import engine

COURSE = {
    "id": "ml",
    "title": "Machine Learning",
    "short": "ML",
    "tagline": "Teach computers to learn patterns from data — and watch them learn.",
    "description": "Regression, classification, decision trees, neural networks and clustering, each with a live visual lab "
                   "where you can see a model train epoch by epoch.",
    "color": "#e8590c",
    "icon": "brain",
    "level": "Beginner → Intermediate",
    "labs": [
        {"id": "regression", "title": "Regression & Gradient Descent", "icon": "trend",
         "description": "Fit a line or curve with gradient descent; watch the loss fall on a 3D loss landscape."},
        {"id": "classifier", "title": "Classifier Playground", "icon": "grid",
         "description": "Train logistic regression, k-NN, decision trees or a neural network and see the decision boundary form."},
        {"id": "kmeans", "title": "k-Means Clustering", "icon": "target",
         "description": "Step through assign/update iterations and find the best k with the elbow and silhouette plots."},
        {"id": "pca", "title": "PCA Explorer", "icon": "sphere",
         "description": "Rotate a 3-D cloud, see its principal axes, then flatten it to fewer dimensions and measure what is lost."},
        {"id": "metrics", "title": "Threshold & ROC", "icon": "target",
         "description": "Drag the decision threshold and watch precision, recall, the confusion matrix and the ROC/PR curves move."},
    ],
    "topics": {
        "foundations": "Foundations", "regression": "Regression", "classification": "Classification", "trees": "Decision trees",
        "neural": "Neural networks", "clustering": "Clustering", "evaluation": "Evaluation",
    },
}

LESSONS = [
    {
        "id": "ml-intro", "order": 1, "title": "What is Machine Learning?", "topic": "foundations", "level": "Beginner", "minutes": 6,
        "summary": "Learning from examples: features, labels, training and testing.",
        "blocks": [
            {"type": "text", "html": "In ordinary programming you write the rules. In <b>machine learning</b> you give the computer <i>examples</i> and it finds the rules itself. A model is a function that maps <b>features</b> (inputs) to a <b>prediction</b>:"},
            {"type": "formula", "tex": r"\hat{y} = f_\theta(x) \qquad \text{learn } \theta \text{ so that } \hat{y} \approx y"},
            {"type": "text", "html": "<ul><li><b>Supervised learning</b> — every example has a label (price, spam/not-spam). Regression predicts numbers, classification predicts categories.</li><li><b>Unsupervised learning</b> — no labels; find structure such as clusters.</li><li><b>Reinforcement learning</b> — learn by trial, error and reward (see the AI course).</li></ul>"},
            {"type": "callout", "kind": "insight", "html": "We always keep some data hidden from training — the <b>test set</b>. A model is only good if it does well on data it has never seen."},
            {"type": "try", "target": "lab", "lab": "classifier", "label": "Train your first classifier on two blobs of points", "preset": {"dataset": "blobs", "model": "logistic"}},
        ],
        "quiz": [
            {"q": "A model predicts tomorrow's temperature in °C. This is…", "options": ["Classification", "Regression", "Clustering", "Reinforcement learning"], "answer": 1, "explain": "Predicting a number is regression."},
            {"q": "Why do we keep a separate test set?", "options": ["To train faster", "To measure performance on unseen data", "To add more features", "It is not needed"], "answer": 1, "explain": "The test set estimates how the model will behave on new data."},
            {"q": "Grouping customers with no labels is an example of…", "options": ["Supervised learning", "Unsupervised learning", "Regression", "Overfitting"], "answer": 1, "explain": "No labels → unsupervised (clustering)."},
        ],
    },
    {
        "id": "ml-regression", "order": 2, "title": "Linear Regression & Gradient Descent", "topic": "regression", "level": "Beginner", "minutes": 8,
        "summary": "Fit a line by rolling downhill on the loss surface.",
        "blocks": [
            {"type": "text", "html": "Linear regression draws the line that best fits the data. We measure how wrong it is with the <b>mean squared error</b>:"},
            {"type": "formula", "tex": r"\hat{y} = w x + b, \qquad L(w,b) = \frac{1}{n}\sum_{i}(\hat{y}_i - y_i)^2"},
            {"type": "text", "html": "<b>Gradient descent</b> improves w and b a little at a time by stepping against the slope of the loss. The step size is the <b>learning rate</b> η:"},
            {"type": "formula", "tex": r"w \leftarrow w - \eta\,\frac{\partial L}{\partial w}, \qquad b \leftarrow b - \eta\,\frac{\partial L}{\partial b}"},
            {"type": "callout", "kind": "tip", "html": "In the lab, open the <b>3D loss landscape</b>: every gradient-descent step is a ball rolling down the bowl. Too large a learning rate makes it bounce out — the model <i>diverges</i>."},
            {"type": "try", "target": "lab", "lab": "regression", "label": "Watch gradient descent fit a line", "preset": {"dataset": "linear", "degree": 1, "lr": 0.1, "epochs": 60}},
        ],
        "quiz": [
            {"q": "What does the learning rate control?", "options": ["The number of data points", "The size of each gradient-descent step", "The number of features", "The test-set size"], "answer": 1, "explain": "η scales every update step."},
            {"q": "If the learning rate is far too large, the loss usually…", "options": ["Decreases smoothly", "Bounces and can explode (diverge)", "Stays exactly the same", "Becomes negative"], "answer": 1, "explain": "Steps overshoot the minimum and grow larger each time."},
            {"q": "MSE of predictions [2, 4] against targets [3, 3] is…", "options": ["0", "0.5", "1", "2"], "answer": 2, "explain": "((−1)² + 1²)/2 = 1."},
        ],
    },
    {
        "id": "ml-classification", "order": 3, "title": "Classification & Decision Boundaries", "topic": "classification", "level": "Beginner", "minutes": 8,
        "summary": "Logistic regression, k-nearest neighbours and the boundary between classes.",
        "blocks": [
            {"type": "text", "html": "A classifier splits the feature space into regions, one per class. The border between regions is the <b>decision boundary</b>."},
            {"type": "text", "html": "<b>Logistic regression</b> squashes a linear score into a probability with the sigmoid function:"},
            {"type": "formula", "tex": r"P(y=1\mid x) = \sigma(w\cdot x + b) = \frac{1}{1 + e^{-(w\cdot x + b)}}"},
            {"type": "text", "html": "Its boundary is a straight line — great for blobs, hopeless for moons or circles unless you add polynomial features. <b>k-nearest neighbours</b> instead lets the k closest training points vote, producing curvy boundaries with no training at all."},
            {"type": "callout", "kind": "insight", "html": "Small k → wiggly boundary that follows noise. Large k → smooth boundary that may miss detail. Try k = 1 and k = 25 in the lab!"},
            {"type": "try", "target": "lab", "lab": "classifier", "label": "Logistic regression vs. the moons dataset", "preset": {"dataset": "moons", "model": "logistic", "degree": 1}},
        ],
        "quiz": [
            {"q": "The sigmoid function outputs values between…", "options": ["−1 and 1", "0 and 1", "0 and 100", "any real number"], "answer": 1, "explain": "σ(z) = 1/(1+e^{−z}) lies in (0, 1), so it can be read as a probability."},
            {"q": "A plain logistic-regression boundary is…", "options": ["A straight line (hyperplane)", "A circle", "Any shape", "A tree"], "answer": 0, "explain": "It is linear in the features."},
            {"q": "In k-NN, increasing k usually makes the boundary…", "options": ["Wigglier", "Smoother", "Disappear", "Linear always"], "answer": 1, "explain": "More neighbours average out noise."},
        ],
    },
    {
        "id": "ml-trees", "order": 4, "title": "Decision Trees", "topic": "trees", "level": "Intermediate", "minutes": 7,
        "summary": "Ask yes/no questions about features to split the data.",
        "blocks": [
            {"type": "text", "html": "A decision tree asks a sequence of questions like <i>“is x₁ ≤ 0.4?”</i>. Each split is chosen to make the groups as <b>pure</b> as possible, measured by Gini impurity:"},
            {"type": "formula", "tex": r"G = 1 - \sum_{k} p_k^2"},
            {"type": "text", "html": "A node with only one class has G = 0. Trees are easy to read — the lab draws the tree itself — and their boundaries are made of axis-aligned rectangles."},
            {"type": "callout", "kind": "warning", "html": "A very deep tree can memorise the training data (overfitting). Limit <b>max depth</b> and compare train vs. test accuracy."},
            {"type": "try", "target": "lab", "lab": "classifier", "label": "Grow a decision tree on circles", "preset": {"dataset": "circles", "model": "tree", "max_depth": 4}},
        ],
        "quiz": [
            {"q": "Gini impurity of a node with 50% class A and 50% class B is…", "options": ["0", "0.25", "0.5", "1"], "answer": 2, "explain": "1 − (0.5² + 0.5²) = 0.5."},
            {"q": "Decision-tree boundaries in 2D look like…", "options": ["Smooth curves", "Axis-aligned rectangles", "Circles", "Diagonal lines only"], "answer": 1, "explain": "Each split tests one feature against a threshold."},
            {"q": "A main way to stop a tree overfitting is to…", "options": ["Increase max depth", "Limit max depth", "Remove the test set", "Use more features only"], "answer": 1, "explain": "Shallower trees generalise better."},
        ],
    },
    {
        "id": "ml-neural", "order": 5, "title": "Neural Networks", "topic": "neural", "level": "Intermediate", "minutes": 10,
        "summary": "Layers of simple neurons that learn any shape of boundary.",
        "blocks": [
            {"type": "text", "html": "A neuron computes a weighted sum and passes it through a non-linear <b>activation</b>. Stacking neurons in layers gives a neural network:"},
            {"type": "formula", "tex": r"a^{(l)} = \phi\!\left(W^{(l)} a^{(l-1)} + b^{(l)}\right), \qquad \phi \in \{\mathrm{ReLU}, \tanh, \sigma\}"},
            {"type": "text", "html": "Training uses <b>backpropagation</b>: the chain rule sends the error backwards through the layers to compute every weight's gradient, then an optimiser (here Adam) takes a step."},
            {"type": "callout", "kind": "tip", "html": "In the lab, the network diagram shows each weight as a line — thicker means larger, orange is positive, blue is negative. Watch the boundary bend as epochs go by."},
            {"type": "try", "target": "lab", "lab": "classifier", "label": "Teach a neural network the spiral", "preset": {"dataset": "spiral", "model": "mlp", "hidden": [16, 16], "epochs": 500, "lr": 0.02, "activation": "tanh"}},
        ],
        "quiz": [
            {"q": "Why do neural networks need non-linear activations?", "options": ["To run faster", "Without them, stacked layers collapse into one linear model", "To reduce memory", "They are optional decoration"], "answer": 1, "explain": "A composition of linear maps is linear."},
            {"q": "Backpropagation computes…", "options": ["The training data", "Gradients of the loss with respect to every weight", "The test accuracy", "The number of layers"], "answer": 1, "explain": "It applies the chain rule layer by layer."},
            {"q": "ReLU(−3) equals…", "options": ["−3", "0", "3", "1"], "answer": 1, "explain": "ReLU(z) = max(0, z)."},
        ],
    },
    {
        "id": "ml-clustering", "order": 6, "title": "Clustering with k-Means", "topic": "clustering", "level": "Beginner", "minutes": 7,
        "summary": "Find groups in unlabelled data, one assign/update step at a time.",
        "blocks": [
            {"type": "text", "html": "k-means repeats two steps until nothing changes: <b>assign</b> each point to its nearest centroid, then <b>update</b> each centroid to the mean of its points. It minimises the <b>inertia</b>:"},
            {"type": "formula", "tex": r"J = \sum_{i} \lVert x_i - \mu_{c(i)} \rVert^2"},
            {"type": "text", "html": "Choosing k: plot inertia against k and look for the <b>elbow</b>, or pick the k with the highest <b>silhouette score</b> (how much closer points are to their own cluster than to the next one)."},
            {"type": "callout", "kind": "insight", "html": "Inertia always goes down as k grows (k = number of points gives 0!), so it cannot pick k by itself."},
            {"type": "try", "target": "lab", "lab": "kmeans", "label": "Step through k-means", "preset": {"k": 4, "true_clusters": 4}},
        ],
        "quiz": [
            {"q": "In the update step, each centroid moves to…", "options": ["A random point", "The mean of its assigned points", "The origin", "The farthest point"], "answer": 1, "explain": "That is what minimises squared distance for a fixed assignment."},
            {"q": "Why can't inertia alone choose k?", "options": ["It always decreases as k grows", "It is always zero", "It ignores distances", "It needs labels"], "answer": 0, "explain": "More centroids always fit tighter."},
            {"q": "k-means is an example of…", "options": ["Supervised learning", "Unsupervised learning", "Reinforcement learning", "Search"], "answer": 1, "explain": "It needs no labels."},
        ],
    },
    {
        "id": "ml-evaluation", "order": 7, "title": "Overfitting & Model Evaluation", "topic": "evaluation", "level": "Intermediate", "minutes": 9,
        "summary": "Bias vs. variance, train vs. test error, and the confusion matrix.",
        "blocks": [
            {"type": "text", "html": "A model that is too simple <b>underfits</b> (high bias); one that is too flexible <b>overfits</b> (high variance): it memorises noise and fails on new data. The tell-tale sign is a growing gap between training and test error."},
            {"type": "callout", "kind": "tip", "html": "In the regression lab pick the <b>sine</b> dataset and raise the polynomial degree. The <i>degree sweep</i> chart shows test error falling, then rising again."},
            {"type": "text", "html": "For classifiers, accuracy is not everything. The <b>confusion matrix</b> counts each kind of mistake, giving precision and recall:"},
            {"type": "formula", "tex": r"\text{precision} = \frac{TP}{TP + FP}, \qquad \text{recall} = \frac{TP}{TP + FN}"},
            {"type": "try", "target": "lab", "lab": "regression", "label": "Overfit a sine wave with degree 9", "preset": {"dataset": "sine", "degree": 9, "lr": 0.3, "epochs": 800}},
        ],
        "quiz": [
            {"q": "Training error is tiny but test error is large. The model is…", "options": ["Underfitting", "Overfitting", "Perfect", "Not trained"], "answer": 1, "explain": "It memorised the training set."},
            {"q": "Recall answers the question…", "options": ["Of the predicted positives, how many were right?", "Of the actual positives, how many did we find?", "How fast is the model?", "How many features are there?"], "answer": 1, "explain": "Recall = TP / (TP + FN)."},
            {"q": "A degree-1 line fitted to a sine wave mostly suffers from…", "options": ["High bias (underfitting)", "High variance", "Data leakage", "Too many epochs"], "answer": 0, "explain": "A straight line is too simple for a curve."},
        ],
    },
]


def _best_degree() -> int:
    sweep = engine.degree_sweep("sine")
    return min(sweep, key=lambda s: s["test"])["degree"]


def _best_k() -> int:
    km = engine.run_kmeans(k=4, true_clusters=4, spread=0.45, seed=4)
    cands = [e for e in km["elbow"] if e["silhouette"] is not None]
    return max(cands, key=lambda e: e["silhouette"])["k"]


CHALLENGES = [
    {"id": "ml-lr", "title": "Goldilocks Learning Rate", "difficulty": "Easy", "points": 60, "topic": "regression",
     "kind": "lab", "lab": "regression",
     "description": "Fit the linear dataset in only 40 epochs. Pick a learning rate that is not too small (too slow) and not too big (diverges).",
     "goal": "Test MSE within 10% of the best possible fit after 40 epochs.",
     "hint": "Try values between 0.01 and 1. Watch the ball on the 3D loss landscape.",
     "preset": {"dataset": "linear", "degree": 1, "epochs": 40, "lr": 0.005}, "lock": ["dataset", "degree", "epochs"]},
    {"id": "ml-degree", "title": "Overfitting Detective", "difficulty": "Medium", "points": 80, "topic": "evaluation",
     "kind": "answer", "answer_type": "choice", "options": [str(d) for d in range(1, 10)],
     "description": "On the sine dataset (default noise), which polynomial degree gives the lowest TEST error?",
     "goal": "Pick the degree from 1–9.",
     "hint": "Open the regression lab, choose the sine dataset and look at the degree-sweep chart.",
     "open_lab": {"lab": "regression", "preset": {"dataset": "sine", "degree": 3}}, "compute": "best_degree"},
    {"id": "ml-moons", "title": "Tiny Brain, Big Moons", "difficulty": "Medium", "points": 100, "topic": "neural",
     "kind": "lab", "lab": "classifier",
     "description": "Classify the moons with a neural network that has at most 8 hidden neurons in total.",
     "goal": "Neural network · ≤ 8 hidden neurons · test accuracy ≥ 95%.",
     "hint": "One hidden layer can be enough. Try tanh and a few hundred epochs.",
     "preset": {"dataset": "moons", "model": "mlp", "hidden": [4], "epochs": 50}, "lock": ["dataset", "model"]},
    {"id": "ml-spiral", "title": "Untangle the Spiral", "difficulty": "Hard", "points": 120, "topic": "classification",
     "kind": "lab", "lab": "classifier",
     "description": "The spiral is the hardest dataset. Use any model you like.",
     "goal": "Test accuracy ≥ 92% on the spiral dataset.",
     "hint": "Non-linear models win here: k-NN or a deeper neural network.",
     "preset": {"dataset": "spiral", "model": "logistic"}, "lock": ["dataset"]},
    {"id": "ml-tree", "title": "Shallow but Smart", "difficulty": "Medium", "points": 90, "topic": "trees",
     "kind": "lab", "lab": "classifier",
     "description": "Separate the circles using a decision tree no deeper than 4.",
     "goal": "Decision tree · max depth ≤ 4 · test accuracy ≥ 90%.",
     "hint": "Circles need several axis-aligned cuts — use the full depth budget.",
     "preset": {"dataset": "circles", "model": "tree", "max_depth": 1}, "lock": ["dataset", "model"]},
    {"id": "ml-k", "title": "How Many Clusters?", "difficulty": "Easy", "points": 60, "topic": "clustering",
     "kind": "answer", "answer_type": "choice", "options": [str(k) for k in range(2, 9)],
     "description": "The k-means lab has generated a dataset (4 hidden groups, spread 0.45, seed 4). Which k gives the highest silhouette score?",
     "goal": "Pick k.",
     "hint": "Run the lab and read the silhouette curve under the elbow chart.",
     "open_lab": {"lab": "kmeans", "preset": {"true_clusters": 4, "spread": 0.45, "seed": 4, "k": 2}}, "compute": "best_k"},
]


def _expected(ch: dict) -> str:
    return str({"best_degree": _best_degree, "best_k": _best_k}[ch["compute"]]())


def check_challenge(ch: dict, payload: dict) -> dict:
    if ch["kind"] == "answer":
        expected = _expected(ch)
        ok = str(payload.get("answer")) == expected
        return {"solved": ok, "score": 1.0 if ok else 0.0,
                "feedback": ["Correct — well investigated!" if ok else "Not quite. Re-run the lab and look again at the chart."]}
    cfg = {**dict(payload.get("config") or {}), **{k: ch["preset"][k] for k in ch.get("lock", [])}}
    fb: list[str] = []
    if ch["id"] == "ml-lr":
        res = engine.train_regression(**_pick(cfg, ["dataset", "degree", "lr", "epochs"]))
        best = res["final"]["best_possible_test_mse"]
        mse = res["final"]["test_mse"]
        ok = (not res["diverged"]) and mse is not None and mse <= best * 1.1 + 0.01
        score = 0.0 if res["diverged"] or mse is None else min(1.0, best / max(mse, 1e-9))
        fb.append("The model diverged — the learning rate is too large." if res["diverged"] else f"Test MSE {mse:.3f} vs. best possible {best:.3f}.")
        if not ok and not res["diverged"]:
            fb.append("Still too slow — try a larger learning rate.")
        return {"solved": ok, "score": round(score, 3), "feedback": fb, "metric": mse}
    res = engine.train_classifier(**_pick(cfg, ["dataset", "model", "lr", "epochs", "degree", "k", "max_depth", "min_samples", "hidden", "activation", "l2", "noise"]))
    acc = res["final"]["test_acc"]
    if ch["id"] == "ml-moons":
        neurons = sum(int(h) for h in (cfg.get("hidden") or [8, 8]))
        ok = acc >= 0.95 and neurons <= 8
        if neurons > 8:
            fb.append(f"Your network has {neurons} hidden neurons — the limit is 8.")
        target = 0.95
    elif ch["id"] == "ml-spiral":
        ok, target = acc >= 0.92, 0.92
    else:  # ml-tree
        depth = int(cfg.get("max_depth", 4))
        ok = acc >= 0.9 and depth <= 4
        if depth > 4:
            fb.append("Max depth must be 4 or less.")
        target = 0.9
    fb.insert(0, f"Test accuracy: {acc * 100:.1f}% (target {target * 100:.0f}%).")
    return {"solved": bool(ok), "score": round(min(1.0, acc / target), 3), "feedback": fb, "metric": acc}


def _pick(cfg: dict, keys: list[str]) -> dict:
    return {k: cfg[k] for k in keys if k in cfg}


KNOWLEDGE = {
    "machine-learning": {"keys": ["machine learning", "what is ml", " ml "], "lesson": "ml-intro",
                         "text": "**Machine learning** lets a computer learn a function from examples instead of hand-written rules. In supervised learning each example has a label; the model adjusts its parameters to make predictions match the labels, and we judge it on a held-out **test set**."},
    "supervised": {"keys": ["supervised", "label"], "lesson": "ml-intro",
                   "text": "**Supervised learning** uses labelled examples. **Regression** predicts numbers (price, temperature); **classification** predicts categories (spam / not spam). **Unsupervised learning** has no labels and looks for structure such as clusters."},
    "regression": {"keys": ["regression", "line of best fit", "linear model"], "lesson": "ml-regression",
                   "text": "**Linear regression** fits ŷ = w·x + b by minimising the mean squared error. Adding powers of x (polynomial features) lets the same method fit curves."},
    "gradient-descent": {"keys": ["gradient", "descent", "learning rate", "diverge", "loss landscape"], "lesson": "ml-regression",
                         "text": "**Gradient descent** repeatedly nudges each parameter opposite to the gradient of the loss: w ← w − η·∂L/∂w. The **learning rate η** sets the step size — too small is slow, too large overshoots and can **diverge** (the loss explodes)."},
    "loss": {"keys": ["loss", "mse", "mean squared", "cost function", "cross-entropy"], "lesson": "ml-regression",
             "text": "A **loss function** measures how wrong the model is. Regression typically uses mean squared error; classification uses **cross-entropy**, which heavily penalises confident wrong answers."},
    "logistic": {"keys": ["logistic", "sigmoid"], "lesson": "ml-classification",
                 "text": "**Logistic regression** passes a linear score through the sigmoid σ(z) = 1/(1+e^{−z}) to get a probability. Its decision boundary is linear unless you add polynomial features."},
    "knn": {"keys": ["knn", "k-nn", "nearest neighbour", "nearest neighbor"], "lesson": "ml-classification",
            "text": "**k-nearest neighbours** classifies a point by a vote of the k closest training points. Small k follows noise (wiggly boundary); large k smooths it out."},
    "decision-boundary": {"keys": ["decision boundary", "boundary"], "lesson": "ml-classification",
                          "text": "The **decision boundary** is where the classifier switches from one class to another. Linear models draw straight boundaries; trees draw rectangles; k-NN and neural networks can draw almost any shape."},
    "tree": {"keys": ["decision tree", "tree", "gini", "split"], "lesson": "ml-trees",
             "text": "A **decision tree** asks yes/no questions about one feature at a time, choosing each split to reduce **Gini impurity** G = 1 − Σ p_k². Limiting max depth prevents memorising noise."},
    "neural": {"keys": ["neural", "neuron", "layer", "deep learning", "mlp", "perceptron"], "lesson": "ml-neural",
               "text": "A **neural network** stacks layers of neurons a = φ(W·x + b). Non-linear activations (ReLU, tanh, sigmoid) let it bend the decision boundary into complex shapes. It is trained by **backpropagation** plus an optimiser such as Adam."},
    "activation": {"keys": ["activation", "relu", "tanh"], "lesson": "ml-neural",
                   "text": "**Activation functions** add non-linearity: ReLU(z) = max(0, z), tanh squashes to (−1, 1), sigmoid to (0, 1). Without them a deep network is just one linear model."},
    "backprop": {"keys": ["backprop", "back-prop", "chain rule"], "lesson": "ml-neural",
                 "text": "**Backpropagation** applies the chain rule from the output layer back to the input, giving the gradient of the loss for every weight in one backward pass."},
    "kmeans": {"keys": ["k-means", "kmeans", "cluster", "centroid", "elbow", "silhouette", "inertia"], "lesson": "ml-clustering",
               "text": "**k-means** alternates *assign* (each point to its nearest centroid) and *update* (centroid = mean of its points). Use the **elbow** of the inertia curve or the highest **silhouette score** to choose k."},
    "overfitting": {"keys": ["overfit", "underfit", "bias", "variance", "generaliz", "generalis"], "lesson": "ml-evaluation",
                    "text": "**Overfitting** = great on training data, poor on new data (high variance). **Underfitting** = too simple to capture the pattern (high bias). Watch the gap between train and test error and use simpler models, more data or regularisation."},
    "metrics": {"keys": ["accuracy", "precision", "recall", "confusion", "f1"], "lesson": "ml-evaluation",
                "text": "The **confusion matrix** counts true/false positives and negatives. **Precision** = TP/(TP+FP), **recall** = TP/(TP+FN). Accuracy alone can mislead when classes are imbalanced."},
}

# --- v2.3 expanded curriculum (see extra.py) ---
from .extra import KNOWLEDGE_EXTRA, LESSONS_EXTRA, TOPICS_EXTRA  # noqa: E402

COURSE["topics"].update(TOPICS_EXTRA)
LESSONS = LESSONS + LESSONS_EXTRA
KNOWLEDGE.update(KNOWLEDGE_EXTRA)
