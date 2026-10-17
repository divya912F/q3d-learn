"""Machine Learning — expanded curriculum (v2.3).

Additional lessons that take the course from the basics up to production-grade ML,
plus the new topics, tutor knowledge and glossary terms they introduce.
Merged into the course by content.py.
"""
from __future__ import annotations

TOPICS_EXTRA = {
    "math": "Maths foundations",
    "features": "Features & data",
    "optimization": "Optimisation",
    "ensembles": "Ensembles",
    "dimred": "Dimensionality reduction",
    "deploy": "Production ML",
}

# Labs that already exist for this course: regression, classifier, kmeans, pca, metrics
LESSONS_EXTRA = [
    {
        "id": "ml-math", "order": 8, "title": "The Maths You Actually Need", "topic": "math", "level": "Beginner", "minutes": 8,
        "summary": "Vectors, dot products, derivatives and probability — just enough to read any ML formula.",
        "blocks": [
            {"type": "text", "html": "ML looks mathematical, but three ideas carry most of it. First, a <b>vector</b> is just a list of numbers — one example's features, like <code>[1.7, 65, 22]</code> for height, weight, age."},
            {"type": "text", "html": "Second, the <b>dot product</b> combines a weight vector w and a feature vector x into a single score. It is the heart of almost every model:"},
            {"type": "formula", "tex": r"w \cdot x = \sum_i w_i x_i = w_1 x_1 + w_2 x_2 + \dots + w_n x_n"},
            {"type": "text", "html": "Third, a <b>derivative</b> is a slope — how fast the loss changes as we nudge a weight. Gradient descent only needs the slope to know which way is downhill."},
            {"type": "callout", "kind": "insight", "html": "You don't need to <i>compute</i> derivatives by hand — libraries do <b>autograd</b> for you. But knowing a gradient is \"the direction of steepest increase\" explains every training curve you'll ever see."},
        ],
        "quiz": [
            {"q": "A feature vector represents…", "options": ["One model", "One example's inputs as a list of numbers", "The learning rate", "A category label"], "answer": 1, "explain": "Each example becomes a vector of its feature values."},
            {"q": "The dot product w·x produces…", "options": ["A vector", "A matrix", "A single number (score)", "A probability always"], "answer": 2, "explain": "It sums the element-wise products into one scalar."},
            {"q": "In gradient descent, the derivative tells us…", "options": ["The final answer", "Which direction changes the loss, and how fast", "The number of features", "The test accuracy"], "answer": 1, "explain": "The gradient is the slope of the loss surface."},
        ],
    },
    {
        "id": "ml-features", "order": 9, "title": "Feature Engineering & Scaling", "topic": "features", "level": "Beginner", "minutes": 8,
        "summary": "Garbage in, garbage out — good features often beat fancy models.",
        "blocks": [
            {"type": "text", "html": "A model can only learn from the features you give it. <b>Feature engineering</b> is turning raw data into informative inputs: extracting the day-of-week from a date, the length of a message, or the ratio of two columns."},
            {"type": "text", "html": "<b>Scaling</b> matters too. Distance-based models (k-NN, k-means) and gradient descent struggle when one feature ranges 0–1 and another 0–100000. Standardise each feature to mean 0, variance 1:"},
            {"type": "formula", "tex": r"z = \frac{x - \mu}{\sigma}"},
            {"type": "text", "html": "Categories become numbers with <b>one-hot encoding</b> (one column per category), never a single integer that invents a fake order between, say, \"red\", \"green\" and \"blue\"."},
            {"type": "callout", "kind": "warning", "html": "Fit your scaler on the <b>training set only</b>, then apply it to the test set. Peeking at test statistics is <i>data leakage</i> and inflates your scores."},
        ],
        "quiz": [
            {"q": "Why standardise features before k-NN?", "options": ["To add more data", "So no single large-range feature dominates the distance", "To make training slower", "It is never needed"], "answer": 1, "explain": "Distances are dominated by large-scale features unless you rescale."},
            {"q": "A colour column (red/green/blue) is best encoded as…", "options": ["1, 2, 3", "One-hot columns", "Its string left as-is", "The learning rate"], "answer": 1, "explain": "Integers invent a false ordering; one-hot keeps them independent."},
            {"q": "Fitting your scaler on the test set too is…", "options": ["Good practice", "Data leakage", "Required", "Regularisation"], "answer": 1, "explain": "Test statistics must stay unseen during training."},
        ],
    },
    {
        "id": "ml-optimization", "order": 10, "title": "Optimisers: SGD, Momentum & Adam", "topic": "optimization", "level": "Intermediate", "minutes": 8,
        "summary": "How modern models descend the loss surface faster and more reliably.",
        "blocks": [
            {"type": "text", "html": "Plain gradient descent uses the whole dataset for every step — slow on millions of rows. <b>Stochastic gradient descent (SGD)</b> estimates the gradient from a small <b>mini-batch</b>, taking many noisy-but-cheap steps."},
            {"type": "text", "html": "<b>Momentum</b> keeps a running average of past gradients, so the ball rolls through small bumps instead of getting stuck:"},
            {"type": "formula", "tex": r"v \leftarrow \beta v + (1-\beta)\nabla L, \qquad \theta \leftarrow \theta - \eta\, v"},
            {"type": "text", "html": "<b>Adam</b> combines momentum with a per-parameter learning rate (dividing by a running estimate of each gradient's size). It is the default optimiser for most deep learning."},
            {"type": "callout", "kind": "tip", "html": "Watch the loss curve: a jagged-but-falling curve is healthy SGD noise. A curve that explodes means the learning rate is too high; one that is flat means it is too low."},
            {"type": "try", "target": "lab", "lab": "regression", "label": "Change the learning rate and watch the descent", "preset": {"dataset": "sine", "degree": 5, "lr": 0.08, "epochs": 120}},
        ],
        "quiz": [
            {"q": "SGD is faster than full gradient descent because it…", "options": ["Uses a mini-batch per step", "Needs no gradients", "Trains without data", "Has no learning rate"], "answer": 0, "explain": "Each step uses a small sample, so steps are cheap."},
            {"q": "Momentum helps by…", "options": ["Removing the gradient", "Averaging past gradients to push through bumps", "Shrinking the dataset", "Adding layers"], "answer": 1, "explain": "A velocity term carries the update along a consistent direction."},
            {"q": "Adam gives each parameter…", "options": ["The same fixed step", "An adaptive, per-parameter step size", "No updates", "A random weight"], "answer": 1, "explain": "It scales each update by a running estimate of that gradient's magnitude."},
        ],
    },
    {
        "id": "ml-regularization", "order": 11, "title": "Regularisation & the Overfitting Fight", "topic": "evaluation", "level": "Intermediate", "minutes": 8,
        "summary": "Penalise complexity so the model generalises instead of memorising.",
        "blocks": [
            {"type": "text", "html": "An overfit model fits the training noise and fails on new data. <b>Regularisation</b> adds a penalty on large weights to the loss, keeping the model simpler:"},
            {"type": "formula", "tex": r"L_{\text{reg}} = L_{\text{data}} + \lambda \sum_i w_i^2 \quad (\text{L2, \"ridge\"})"},
            {"type": "text", "html": "<b>L2 (ridge)</b> shrinks weights smoothly; <b>L1 (lasso)</b> uses |wᵢ| and drives some weights exactly to zero, doing feature selection for free. The strength λ is a dial: too high under-fits, too low over-fits."},
            {"type": "callout", "kind": "insight", "html": "Other regularisers you'll meet: <b>dropout</b> (randomly silence neurons), <b>early stopping</b> (stop when validation loss turns up), and simply <b>more data</b> — the best regulariser of all."},
        ],
        "quiz": [
            {"q": "Regularisation fights overfitting by…", "options": ["Adding noise to labels", "Penalising large / complex weights", "Removing the test set", "Increasing the learning rate"], "answer": 1, "explain": "A complexity penalty favours simpler models that generalise."},
            {"q": "Which regulariser can zero-out weights (feature selection)?", "options": ["L2 (ridge)", "L1 (lasso)", "Dropout", "Momentum"], "answer": 1, "explain": "The absolute-value penalty pushes small weights to exactly 0."},
            {"q": "If λ is far too large, the model will…", "options": ["Overfit", "Underfit (too simple)", "Train faster only", "Ignore the data entirely? no effect"], "answer": 1, "explain": "A huge penalty crushes the weights and the model underfits."},
        ],
    },
    {
        "id": "ml-naive-bayes", "order": 12, "title": "Naive Bayes & Probabilistic Thinking", "topic": "classification", "level": "Intermediate", "minutes": 7,
        "summary": "Bayes' rule turns word counts into a fast, surprisingly strong spam filter.",
        "blocks": [
            {"type": "text", "html": "<b>Bayes' rule</b> flips a conditional probability — from \"how likely is this email given it's spam?\" to \"how likely is spam given this email?\":"},
            {"type": "formula", "tex": r"P(\text{spam}\mid \text{words}) \propto P(\text{spam})\prod_i P(\text{word}_i \mid \text{spam})"},
            {"type": "text", "html": "The \"naive\" part assumes words are independent — rarely true, yet it works remarkably well for text. It trains in a single pass and needs very little data."},
            {"type": "callout", "kind": "tip", "html": "Naive Bayes is the classic baseline for spam, sentiment and topic classification. If a fancy model can't beat it, your features (not your model) are the problem."},
        ],
        "quiz": [
            {"q": "Bayes' rule lets us compute…", "options": ["P(cause | evidence) from P(evidence | cause)", "The learning rate", "The number of layers", "Gradients"], "answer": 0, "explain": "It inverts the conditional using the prior and likelihood."},
            {"q": "The \"naive\" assumption is that features are…", "options": ["Identical", "Conditionally independent", "All zero", "Continuous only"], "answer": 1, "explain": "It treats each word's probability as independent of the others."},
            {"q": "Naive Bayes is especially popular for…", "options": ["Image generation", "Text classification (spam, sentiment)", "3D rendering", "Clustering images"], "answer": 1, "explain": "It is a strong, cheap baseline for text."},
        ],
    },
    {
        "id": "ml-svm", "order": 13, "title": "Support Vector Machines & the Kernel Trick", "topic": "classification", "level": "Advanced", "minutes": 9,
        "summary": "Find the widest possible street between two classes — then bend space to separate the unseparable.",
        "blocks": [
            {"type": "text", "html": "A <b>support vector machine</b> doesn't just find <i>a</i> boundary — it finds the one with the widest <b>margin</b>, the biggest gap to the nearest points of each class. Those nearest points are the <b>support vectors</b>."},
            {"type": "formula", "tex": r"\max_{w,b}\ \text{margin} = \frac{2}{\lVert w\rVert}\quad\text{s.t. } y_i(w\cdot x_i + b)\ge 1"},
            {"type": "text", "html": "When classes aren't linearly separable, the <b>kernel trick</b> maps points into a higher dimension where a flat plane <i>can</i> split them — without ever computing the coordinates, just their dot products. The RBF kernel is the popular default."},
            {"type": "callout", "kind": "insight", "html": "Wide margins generalise well, which made SVMs the state of the art before deep learning. They still shine on small, high-dimensional datasets like gene expression."},
        ],
        "quiz": [
            {"q": "An SVM chooses the boundary that…", "options": ["Touches every point", "Maximises the margin between classes", "Is always vertical", "Has the most support vectors possible"], "answer": 1, "explain": "The maximum-margin hyperplane generalises best."},
            {"q": "Support vectors are…", "options": ["All training points", "The points closest to the boundary", "The test points", "The weights"], "answer": 1, "explain": "Only the nearest points define the margin."},
            {"q": "The kernel trick lets an SVM…", "options": ["Separate non-linear data via an implicit higher dimension", "Train without data", "Remove the margin", "Skip the labels"], "answer": 0, "explain": "Kernels compute high-dimensional dot products cheaply."},
        ],
    },
    {
        "id": "ml-ensembles", "order": 14, "title": "Ensembles: Random Forests & Boosting", "topic": "ensembles", "level": "Advanced", "minutes": 9,
        "summary": "Many weak models vote — and win most tabular-data competitions.",
        "blocks": [
            {"type": "text", "html": "One deep tree overfits. An <b>ensemble</b> combines many models so their errors cancel. Two recipes dominate:"},
            {"type": "text", "html": "<b>Bagging / Random Forest</b> — train hundreds of trees, each on a random sample of rows <i>and</i> columns, then average their votes. Variance drops sharply."},
            {"type": "text", "html": "<b>Boosting</b> (XGBoost, LightGBM) — train trees in sequence, each one focusing on the examples the previous trees got wrong:"},
            {"type": "formula", "tex": r"F_{m}(x) = F_{m-1}(x) + \eta\, h_m(x)\quad(h_m \text{ fits the residual})"},
            {"type": "callout", "kind": "tip", "html": "Gradient-boosted trees are still the first thing to try on <b>tabular data</b> — they routinely beat neural networks there, train fast and need little tuning."},
        ],
        "quiz": [
            {"q": "A random forest reduces error mainly by…", "options": ["Growing one huge tree", "Averaging many de-correlated trees", "Removing all features", "Using no randomness"], "answer": 1, "explain": "Averaging independent trees cancels their individual variance."},
            {"q": "Boosting trains its models…", "options": ["All at once independently", "In sequence, each fixing the last one's mistakes", "Without any trees", "Only on the test set"], "answer": 1, "explain": "Each new tree fits the residual errors so far."},
            {"q": "For tabular data, gradient-boosted trees are…", "options": ["Usually a weak baseline", "Often the strongest, fastest choice", "Unable to classify", "Only for images"], "answer": 1, "explain": "They dominate most structured-data problems and competitions."},
        ],
    },
    {
        "id": "ml-pca", "order": 15, "title": "PCA & Dimensionality Reduction", "topic": "dimred", "level": "Advanced", "minutes": 8,
        "summary": "Squeeze many features into a few directions that keep most of the variance.",
        "blocks": [
            {"type": "text", "html": "High-dimensional data is hard to visualise and slow to model (the <b>curse of dimensionality</b>). <b>Principal Component Analysis</b> finds new axes — the <b>principal components</b> — ordered by how much variance they capture."},
            {"type": "formula", "tex": r"\text{maximise } \mathrm{Var}(Xw)\ \text{ s.t. } \lVert w\rVert = 1 \;\Rightarrow\; \text{top eigenvectors of } X^\top X"},
            {"type": "text", "html": "Keep the first 2–3 components and you can plot thousands of features on a screen while keeping most of the signal. The rest is often noise you're glad to drop."},
            {"type": "callout", "kind": "insight", "html": "PCA is linear. For curvy structure, non-linear methods like <b>t-SNE</b> and <b>UMAP</b> make the beautiful 2-D cluster maps you see for word and image embeddings."},
            {"type": "try", "target": "lab", "lab": "pca", "label": "Rotate a 3-D cloud and flatten it with PCA", "preset": {}},
        ],
        "quiz": [
            {"q": "Principal components are ordered by…", "options": ["Alphabet", "How much variance each captures", "The learning rate", "Their colour"], "answer": 1, "explain": "The first component captures the most variance, and so on."},
            {"q": "PCA is mainly used to…", "options": ["Add features", "Reduce dimensions while keeping signal", "Label data", "Increase overfitting"], "answer": 1, "explain": "It compresses many features into a few informative directions."},
            {"q": "For non-linear 2-D cluster maps you'd reach for…", "options": ["PCA only", "t-SNE or UMAP", "Linear regression", "A firewall"], "answer": 1, "explain": "t-SNE/UMAP capture curved structure PCA misses."},
        ],
    },
    {
        "id": "ml-metrics", "order": 16, "title": "Metrics: Precision, Recall & ROC", "topic": "evaluation", "level": "Intermediate", "minutes": 8,
        "summary": "Accuracy lies on imbalanced data — know what to measure instead.",
        "blocks": [
            {"type": "text", "html": "If 99% of transactions are legitimate, a model that always says \"legit\" is 99% accurate and completely useless. For imbalanced problems, use the <b>confusion matrix</b>:"},
            {"type": "formula", "tex": r"\text{Precision} = \frac{TP}{TP+FP}, \quad \text{Recall} = \frac{TP}{TP+FN}, \quad F_1 = \frac{2\,PR}{P+R}"},
            {"type": "text", "html": "<b>Precision</b> asks \"when I flag fraud, am I right?\"; <b>recall</b> asks \"of all real fraud, how much did I catch?\". You trade one for the other by moving the decision <b>threshold</b> — the <b>ROC curve</b> and its area (AUC) show every trade-off at once."},
            {"type": "callout", "kind": "warning", "html": "Choose the metric from the <i>cost</i> of mistakes. A cancer screen wants high recall (don't miss a case); a spam filter wants high precision (don't bin real mail)."},
            {"type": "try", "target": "lab", "lab": "metrics", "label": "Drag the threshold and watch precision vs recall", "preset": {}},
        ],
        "quiz": [
            {"q": "On data that is 99% one class, accuracy is…", "options": ["The best metric", "Misleading — use precision/recall", "Always zero", "The same as recall"], "answer": 1, "explain": "A trivial model scores high accuracy yet catches nothing."},
            {"q": "Recall measures…", "options": ["How many flagged items were correct", "How much of the real positives you caught", "The learning rate", "The number of features"], "answer": 1, "explain": "Recall = TP / (TP + FN)."},
            {"q": "A cancer-screening model should prioritise…", "options": ["High precision", "High recall", "Low accuracy", "Fewer features"], "answer": 1, "explain": "Missing a real case (false negative) is the costly error."},
        ],
    },
    {
        "id": "ml-unsupervised", "order": 17, "title": "Beyond k-Means: Unsupervised Learning", "topic": "clustering", "level": "Advanced", "minutes": 8,
        "summary": "Density clusters, hierarchies and anomaly detection when there are no labels.",
        "blocks": [
            {"type": "text", "html": "k-means assumes round, equal-sized blobs. Real data is messier, so other unsupervised tools help:"},
            {"type": "text", "html": "<ul><li><b>DBSCAN</b> grows clusters by density, so it finds arbitrary shapes and labels lone points as noise — no need to pick k.</li><li><b>Hierarchical clustering</b> builds a tree (dendrogram) you can cut at any level.</li><li><b>Anomaly detection</b> flags points that fit no cluster — fraud, faults, intrusions.</li></ul>"},
            {"type": "callout", "kind": "insight", "html": "Unsupervised learning is how you explore a brand-new dataset: find the natural groups first, then decide what's worth labelling for a supervised model."},
        ],
        "quiz": [
            {"q": "An advantage of DBSCAN over k-means is that it…", "options": ["Needs k in advance", "Finds arbitrary shapes and marks noise", "Only works on images", "Requires labels"], "answer": 1, "explain": "Density-based clustering doesn't assume round blobs or a fixed k."},
            {"q": "A dendrogram comes from…", "options": ["Hierarchical clustering", "Linear regression", "A firewall", "Gradient descent"], "answer": 0, "explain": "Hierarchical clustering produces a tree you can cut at any height."},
            {"q": "Flagging points that fit no cluster is…", "options": ["Regression", "Anomaly detection", "One-hot encoding", "Boosting"], "answer": 1, "explain": "Outliers that match no group are anomalies (fraud, faults…)."},
        ],
    },
    {
        "id": "ml-deploy", "order": 18, "title": "Shipping Models: MLOps in Practice", "topic": "deploy", "level": "Advanced", "minutes": 8,
        "summary": "A model in a notebook is worthless — the job is getting it to users and keeping it healthy.",
        "blocks": [
            {"type": "text", "html": "Training is maybe 20% of real ML work. The rest is <b>MLOps</b>: turning a model into a reliable service. The loop is <i>data → train → validate → deploy → monitor → retrain</i>."},
            {"type": "text", "html": "<b>Serving</b> wraps the model behind an API (REST or batch). <b>Monitoring</b> watches live accuracy and <b>data drift</b> — when today's inputs stop looking like the training data and quality silently rots."},
            {"type": "callout", "kind": "warning", "html": "<b>Training–serving skew</b> is the classic production bug: the features are computed one way in the notebook and another way in the live service, so the deployed model sees different numbers than it trained on."},
            {"type": "callout", "kind": "tip", "html": "Version <i>everything</i> — data, code and model — so any prediction can be reproduced and any regression rolled back. That reproducibility is what separates a demo from a product."},
        ],
        "quiz": [
            {"q": "Data drift is when…", "options": ["The code changes", "Live inputs stop resembling the training data", "The model file is deleted", "Accuracy is measured once"], "answer": 1, "explain": "The world changes, so a static model slowly goes stale."},
            {"q": "Training–serving skew means…", "options": ["Features are computed differently in training vs production", "The model trains too long", "There are too many labels", "The GPU is slow"], "answer": 0, "explain": "Mismatched feature pipelines make the live model misbehave."},
            {"q": "Versioning data, code and models buys you…", "options": ["Slower training", "Reproducibility and safe rollbacks", "More overfitting", "Fewer users"], "answer": 1, "explain": "You can reproduce any result and undo any regression."},
        ],
    },
]

KNOWLEDGE_EXTRA = {
    "dot-product": {"keys": ["dot product", "vector", "weighted sum"], "lesson": "ml-math",
                    "text": "The **dot product** w·x multiplies two vectors element-wise and sums the result into one score. It sits at the core of linear/logistic regression, neurons and attention."},
    "feature-scaling": {"keys": ["scaling", "standardise", "standardize", "normalisation", "z-score"], "lesson": "ml-features",
                        "text": "**Feature scaling** rescales inputs (e.g. z = (x−μ)/σ) so no single large-range feature dominates distances or gradients. Fit the scaler on training data only."},
    "data-leakage": {"keys": ["data leakage", "leakage"], "lesson": "ml-features",
                     "text": "**Data leakage** is letting information from the test set (or the future) sneak into training — e.g. scaling with test statistics. It inflates scores that then collapse in production."},
    "sgd": {"keys": ["sgd", "stochastic gradient descent", "mini-batch", "optimiser", "adam", "momentum"], "lesson": "ml-optimization",
            "text": "**SGD** estimates the gradient from a small mini-batch for cheap, noisy steps. **Momentum** averages past gradients; **Adam** adds a per-parameter adaptive step and is the deep-learning default."},
    "regularisation": {"keys": ["regularisation", "regularization", "l1", "l2", "ridge", "lasso", "dropout", "early stopping"], "lesson": "ml-regularization",
                       "text": "**Regularisation** penalises model complexity to fight overfitting. L2 (ridge) shrinks weights; L1 (lasso) zeroes some out; dropout and early stopping do the same job for neural nets."},
    "naive-bayes": {"keys": ["naive bayes", "bayes rule", "bayes' rule", "prior", "likelihood"], "lesson": "ml-naive-bayes",
                    "text": "**Naive Bayes** uses Bayes' rule with a (naive) independence assumption to classify from feature probabilities. It is a fast, strong baseline for text."},
    "svm": {"keys": ["svm", "support vector", "margin", "kernel", "kernel trick"], "lesson": "ml-svm",
            "text": "A **support vector machine** finds the maximum-margin boundary; the **kernel trick** maps data into a higher dimension to separate non-linear classes using only dot products."},
    "ensemble": {"keys": ["ensemble", "random forest", "bagging", "boosting", "xgboost", "gradient boosting"], "lesson": "ml-ensembles",
                 "text": "An **ensemble** combines many models so errors cancel. Random forests average de-correlated trees (bagging); boosting trains trees in sequence to fix prior mistakes."},
    "pca": {"keys": ["pca", "principal component", "dimensionality reduction", "curse of dimensionality", "t-sne", "umap"], "lesson": "ml-pca",
            "text": "**PCA** projects data onto the directions of greatest variance (principal components) to reduce dimensions. t-SNE and UMAP capture non-linear structure for 2-D maps."},
    "confusion-matrix": {"keys": ["precision", "recall", "f1", "roc", "auc", "confusion matrix", "threshold"], "lesson": "ml-metrics",
                         "text": "**Precision** = TP/(TP+FP), **recall** = TP/(TP+FN). Moving the decision threshold trades them off; the **ROC curve** and its AUC summarise every threshold at once."},
    "mlops": {"keys": ["mlops", "deploy", "serving", "data drift", "monitoring", "training-serving skew"], "lesson": "ml-deploy",
              "text": "**MLOps** is the loop of train → deploy → monitor → retrain. Watch for **data drift** (inputs change) and training–serving skew (features computed differently live)."},
}

# Glossary display names for the new concepts (key → (name, aliases))
TERMS_EXTRA = {
    "dot-product": ("Dot product", ["dot product"]),
    "feature-scaling": ("Feature scaling", ["standardise", "standardize"]),
    "data-leakage": ("Data leakage", ["leakage"]),
    "sgd": ("Stochastic gradient descent", ["sgd"]),
    "regularisation": ("Regularisation", ["regularization"]),
    "naive-bayes": ("Naive Bayes", ["bayes rule"]),
    "svm": ("Support vector machine", ["svm"]),
    "ensemble": ("Ensemble (forests & boosting)", ["random forest", "boosting"]),
    "pca": ("Principal Component Analysis", ["pca"]),
    "confusion-matrix": ("Precision, recall & ROC", ["confusion matrix", "roc"]),
    "mlops": ("MLOps", ["data drift"]),
}
