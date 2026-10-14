"""Data Science course: lessons, quizzes, challenges and tutor knowledge."""
from __future__ import annotations

import math

import numpy as np

from . import engine

COURSE = {
    "id": "ds",
    "title": "Data Science",
    "short": "Data Science",
    "tagline": "Turn raw data into insight: explore, clean, visualise and reason with probability.",
    "description": "Summary statistics, charts, correlation, data cleaning and probability — practised on real-looking datasets "
                   "in an interactive explorer, a drag-and-drop cleaning pipeline and a probability simulator.",
    "color": "#0ca678",
    "icon": "chart",
    "level": "Beginner",
    "labs": [
        {"id": "explorer", "title": "Data Explorer", "icon": "table",
         "description": "Browse datasets, read summary statistics, plot histograms, scatter plots and a correlation heatmap."},
        {"id": "pipeline", "title": "Cleaning Pipeline", "icon": "layers",
         "description": "Build a step-by-step cleaning pipeline and watch missing values, duplicates and outliers disappear."},
        {"id": "stats", "title": "Probability Lab", "icon": "dice",
         "description": "Sample from distributions and see the Central Limit Theorem turn any shape into a bell curve."},
    ],
    "topics": {
        "lifecycle": "Data lifecycle", "statistics": "Statistics", "visualization": "Visualisation",
        "correlation": "Correlation", "cleaning": "Cleaning", "probability": "Probability",
    },
}

LESSONS = [
    {
        "id": "ds-intro", "order": 1, "title": "What is Data Science?", "topic": "lifecycle", "level": "Beginner", "minutes": 6,
        "summary": "The data-science lifecycle and the shape of a dataset.",
        "blocks": [
            {"type": "text", "html": "Data science turns raw data into decisions. Most projects follow the same loop:"},
            {"type": "text", "html": "<ol><li><b>Ask</b> a clear question.</li><li><b>Collect</b> data.</li><li><b>Clean</b> it (often 60–80% of the work!).</li><li><b>Explore</b> with statistics and charts.</li><li><b>Model</b> — predict or explain.</li><li><b>Communicate</b> the answer.</li></ol>"},
            {"type": "text", "html": "A dataset is a table: each <b>row</b> is an observation (one student), each <b>column</b> a variable (hours studied). Variables are <b>numeric</b> (measured) or <b>categorical</b> (labels such as study group)."},
            {"type": "callout", "kind": "insight", "html": "The question comes first. “Does sleep affect exam scores?” tells you which columns matter and which chart to draw."},
            {"type": "try", "target": "lab", "lab": "explorer", "label": "Open the student-performance dataset", "preset": {"dataset": "students"}},
        ],
        "quiz": [
            {"q": "In a table of students, one row usually represents…", "options": ["A variable", "One student (an observation)", "A chart", "A statistic"], "answer": 1, "explain": "Rows are observations, columns are variables."},
            {"q": "“Study group: Morning / Evening / Weekend” is a…", "options": ["Numeric variable", "Categorical variable", "Statistic", "Model"], "answer": 1, "explain": "It is a label, not a measurement."},
            {"q": "Which step usually takes the most time?", "options": ["Asking the question", "Cleaning the data", "Making the final slide", "Choosing colours"], "answer": 1, "explain": "Real data is messy; cleaning dominates."},
        ],
    },
    {
        "id": "ds-describe", "order": 2, "title": "Summary Statistics", "topic": "statistics", "level": "Beginner", "minutes": 8,
        "summary": "Mean, median, spread and quartiles — describing data with a few numbers.",
        "blocks": [
            {"type": "text", "html": "The <b>mean</b> is the balance point; the <b>median</b> is the middle value. The standard deviation measures typical distance from the mean:"},
            {"type": "formula", "tex": r"\bar{x} = \frac{1}{n}\sum_i x_i, \qquad s^2 = \frac{1}{n-1}\sum_i (x_i - \bar{x})^2, \qquad s = \sqrt{s^2}"},
            {"type": "text", "html": "Quartiles split sorted data into four equal parts. The <b>interquartile range</b> IQR = Q3 − Q1 holds the middle 50% and is robust to extreme values."},
            {"type": "callout", "kind": "tip", "html": "When the mean is much bigger than the median, the data is <b>right-skewed</b> — a few large values pull the mean up (like incomes or phone time)."},
            {"type": "try", "target": "lab", "lab": "explorer", "label": "Compare mean and median of phone hours", "preset": {"dataset": "students", "hist": "phone_hours", "tab": "dist"}},
        ],
        "quiz": [
            {"q": "Median of 3, 1, 9, 7, 5 is…", "options": ["5", "7", "25", "3"], "answer": 0, "explain": "Sorted: 1, 3, 5, 7, 9 → middle is 5."},
            {"q": "Which statistic is least affected by one huge outlier?", "options": ["Mean", "Median", "Maximum", "Standard deviation"], "answer": 1, "explain": "The median only depends on the middle values."},
            {"q": "Mean > median usually means the data is…", "options": ["Left-skewed", "Right-skewed", "Symmetric", "Categorical"], "answer": 1, "explain": "A long right tail pulls the mean upward."},
        ],
    },
    {
        "id": "ds-viz", "order": 3, "title": "Visualising Data", "topic": "visualization", "level": "Beginner", "minutes": 7,
        "summary": "Pick the right chart: histogram, scatter plot or bar chart.",
        "blocks": [
            {"type": "text", "html": "<ul><li><b>Histogram</b> — the shape of one numeric variable (centre, spread, skew, outliers).</li><li><b>Scatter plot</b> — the relationship between two numeric variables.</li><li><b>Bar chart</b> — compare a number across categories.</li></ul>"},
            {"type": "callout", "kind": "tip", "html": "Colour the scatter plot by a category (e.g. study group) to reveal patterns hidden inside the cloud of points."},
            {"type": "text", "html": "Good charts have labelled axes, honest scales (bars start at zero) and one clear message."},
            {"type": "try", "target": "lab", "lab": "explorer", "label": "Scatter hours studied vs. final score", "preset": {"dataset": "students", "x": "hours_studied", "y": "final_score", "color": "study_group", "tab": "scatter"}},
        ],
        "quiz": [
            {"q": "To see the shape of exam scores, use a…", "options": ["Histogram", "Pie chart", "Scatter plot", "Table only"], "answer": 0, "explain": "Histograms show a single variable's distribution."},
            {"q": "To check whether sleep relates to score, use a…", "options": ["Bar chart", "Scatter plot", "Histogram", "Word cloud"], "answer": 1, "explain": "Two numeric variables → scatter."},
            {"q": "Average price per city is best shown as a…", "options": ["Bar chart", "Histogram", "Scatter plot", "Line through cities"], "answer": 0, "explain": "Compare a number across categories."},
        ],
    },
    {
        "id": "ds-correlation", "order": 4, "title": "Correlation (≠ Causation)", "topic": "correlation", "level": "Intermediate", "minutes": 8,
        "summary": "Measure how strongly two variables move together — and why that is not proof of cause.",
        "blocks": [
            {"type": "text", "html": "Pearson's correlation r runs from −1 (perfect downhill line) through 0 (no linear relation) to +1 (perfect uphill line):"},
            {"type": "formula", "tex": r"r = \frac{\sum_i (x_i-\bar{x})(y_i-\bar{y})}{\sqrt{\sum_i (x_i-\bar{x})^2}\,\sqrt{\sum_i (y_i-\bar{y})^2}}"},
            {"type": "callout", "kind": "warning", "html": "<b>Correlation is not causation.</b> Ice-cream sales and drowning correlate because both rise in summer (a <i>confounder</i>)."},
            {"type": "text", "html": "The explorer's <b>correlation heatmap</b> shows r for every pair of numeric columns at once — the fastest way to spot relationships worth investigating."},
            {"type": "try", "target": "lab", "lab": "explorer", "label": "Find what correlates with final score", "preset": {"dataset": "students", "tab": "corr"}},
        ],
        "quiz": [
            {"q": "r = −0.9 means…", "options": ["No relationship", "Strong negative linear relationship", "Weak positive relationship", "Causation"], "answer": 1, "explain": "Close to −1 → strong downhill pattern."},
            {"q": "r close to 0 tells us there is no…", "options": ["Relationship of any kind", "Linear relationship", "Data", "Outliers"], "answer": 1, "explain": "A curved relationship can still have r ≈ 0."},
            {"q": "Two variables correlate because a third factor drives both. That factor is a…", "options": ["Confounder", "Median", "Label", "Histogram"], "answer": 0, "explain": "Confounders create correlation without direct cause."},
        ],
    },
    {
        "id": "ds-cleaning", "order": 5, "title": "Data Cleaning", "topic": "cleaning", "level": "Intermediate", "minutes": 9,
        "summary": "Missing values, duplicates and outliers — fix them before you analyse.",
        "blocks": [
            {"type": "text", "html": "Real data arrives with problems:<ul><li><b>Missing values</b> — drop the rows, or <i>impute</i> with the mean/median/mode.</li><li><b>Duplicates</b> — the same record twice inflates counts.</li><li><b>Impossible values</b> — 120 study hours in a day is a typing error, not a genius.</li><li><b>Outliers</b> — flag points with a large z-score.</li></ul>"},
            {"type": "formula", "tex": r"z = \frac{x - \bar{x}}{s}, \qquad |z| > 3 \Rightarrow \text{suspicious}"},
            {"type": "callout", "kind": "warning", "html": "Every cleaning step is a decision. Dropping too many rows can bias your results — the pipeline lab tracks how much data you keep."},
            {"type": "try", "target": "lab", "lab": "pipeline", "label": "Clean the messy student records", "preset": {"dataset": "dirty_students"}},
        ],
        "quiz": [
            {"q": "Filling missing ages with the median age is called…", "options": ["Imputation", "Normalisation", "Correlation", "Sampling"], "answer": 0, "explain": "Imputation replaces missing values with an estimate."},
            {"q": "A value with z = 5 is…", "options": ["Exactly average", "Very far from the mean", "Missing", "Negative"], "answer": 1, "explain": "Five standard deviations away."},
            {"q": "Why remove duplicate rows?", "options": ["They inflate counts and bias statistics", "They are always missing", "Charts look nicer", "They speed up models"], "answer": 0, "explain": "Each real observation should count once."},
        ],
    },
    {
        "id": "ds-probability", "order": 6, "title": "Probability & the Central Limit Theorem", "topic": "probability", "level": "Intermediate", "minutes": 9,
        "summary": "Distributions, sampling and why averages become bell-shaped.",
        "blocks": [
            {"type": "text", "html": "A <b>distribution</b> describes how likely each value is: uniform (a fair die), normal (heights), exponential (waiting times), binomial (number of heads)."},
            {"type": "text", "html": "The <b>Central Limit Theorem</b>: averages of n independent samples are approximately normal — whatever the original shape — with spread shrinking like 1/√n:"},
            {"type": "formula", "tex": r"\bar{X}_n \approx \mathcal{N}\!\left(\mu,\ \frac{\sigma^2}{n}\right), \qquad \mathrm{SE} = \frac{\sigma}{\sqrt{n}}"},
            {"type": "callout", "kind": "insight", "html": "This is why polls of ~1000 people work, and why so many statistical tests assume normality."},
            {"type": "try", "target": "lab", "lab": "stats", "label": "Watch skewed data average into a bell curve", "preset": {"mode": "clt", "dist": "exponential", "sample_size": 30}},
        ],
        "quiz": [
            {"q": "Rolling one fair die follows a…", "options": ["Normal distribution", "Uniform distribution", "Exponential distribution", "No distribution"], "answer": 1, "explain": "Each face 1–6 is equally likely."},
            {"q": "Quadrupling the sample size makes the standard error…", "options": ["4× larger", "Half as big", "Unchanged", "4× smaller"], "answer": 1, "explain": "SE ∝ 1/√n, and √4 = 2."},
            {"q": "The CLT says sample MEANS are approximately…", "options": ["Uniform", "Normal", "Exponential", "Identical"], "answer": 1, "explain": "Averages tend to a bell curve."},
        ],
    },
]


def _corr_answer() -> str:
    t = engine.load("students")
    c = engine.correlation(t)
    i = c["columns"].index("final_score")
    best = max((abs(c["matrix"][i][j]), col) for j, col in enumerate(c["columns"]) if col != "final_score" and c["matrix"][i][j] is not None)
    return best[1]


def _median_sleep() -> float:
    return float(np.median(engine.num(engine.load("students")["sleep_hours"])))


def _best_city() -> str:
    rows = engine.group_mean(engine.load("housing"), "city", "price_lakh")
    return max(rows, key=lambda r: r["mean"])["group"]


def _longest_petals() -> str:
    rows = engine.group_mean(engine.load("flowers"), "species", "petal_length")
    return max(rows, key=lambda r: r["mean"])["group"]


CHALLENGES = [
    {"id": "ds-corr", "title": "Correlation Hunter", "difficulty": "Easy", "points": 60, "topic": "correlation",
     "kind": "answer", "answer_type": "choice",
     "options": ["hours_studied", "sleep_hours", "attendance_pct", "phone_hours", "previous_score"],
     "description": "In the student dataset, which column has the strongest correlation (largest |r|) with final_score?",
     "goal": "Pick the column.", "hint": "Open the correlation heatmap and read the final_score row.",
     "open_lab": {"lab": "explorer", "preset": {"dataset": "students", "tab": "corr"}}, "compute": "corr"},
    {"id": "ds-median", "title": "Sleep Statistician", "difficulty": "Easy", "points": 50, "topic": "statistics",
     "kind": "answer", "answer_type": "number", "tolerance": 0.05,
     "description": "What is the median of sleep_hours in the student dataset?",
     "goal": "Enter a number (±0.05).", "hint": "The summary-statistics table has a median column.",
     "open_lab": {"lab": "explorer", "preset": {"dataset": "students", "hist": "sleep_hours", "tab": "dist"}}, "compute": "median_sleep"},
    {"id": "ds-city", "title": "Priciest City", "difficulty": "Easy", "points": 50, "topic": "visualization",
     "kind": "answer", "answer_type": "choice", "options": ["Bengaluru", "Delhi", "Mumbai", "Pune"],
     "description": "In the housing dataset, which city has the highest average price?",
     "goal": "Pick the city.", "hint": "Look at the group-average bar chart (group by city).",
     "open_lab": {"lab": "explorer", "preset": {"dataset": "housing", "color": "city", "y": "price_lakh", "tab": "group"}}, "compute": "city"},
    {"id": "ds-clean", "title": "Data Janitor", "difficulty": "Medium", "points": 120, "topic": "cleaning",
     "kind": "lab", "lab": "pipeline",
     "description": "Clean the messy student records: no missing values, no duplicate rows, study hours within 0–24 and final scores within 0–100 — while keeping at least 85% of the rows.",
     "goal": "0 missing · 0 duplicates · valid ranges · ≥ 85% rows kept.",
     "hint": "Dropping every row with a missing value throws away too much. Try filling instead.",
     "preset": {"dataset": "dirty_students", "steps": []}, "lock": ["dataset"]},
    {"id": "ds-clt", "title": "Standard Error Sleuth", "difficulty": "Medium", "points": 90, "topic": "probability",
     "kind": "answer", "answer_type": "number", "tolerance": 0.03,
     "description": "Take samples of size n = 30 from an exponential distribution with mean 2. What is the standard deviation of the sample means (the standard error)?",
     "goal": "Enter a number (±0.03).", "hint": "Simulate it in the CLT lab — or use σ/√n (for the exponential, σ equals the mean).",
     "open_lab": {"lab": "stats", "preset": {"mode": "clt", "dist": "exponential", "sample_size": 30}}, "compute": "clt"},
    {"id": "ds-flowers", "title": "Petal Power", "difficulty": "Easy", "points": 50, "topic": "statistics",
     "kind": "answer", "answer_type": "choice", "options": ["setosa", "versicolor", "virginica"],
     "description": "In the flowers dataset, which species has the longest petals on average?",
     "goal": "Pick the species.", "hint": "Colour by species and compare petal_length.",
     "open_lab": {"lab": "explorer", "preset": {"dataset": "flowers", "x": "petal_length", "y": "petal_width", "color": "species", "tab": "scatter"}}, "compute": "petals"},
]

_COMPUTE = {"corr": _corr_answer, "median_sleep": _median_sleep, "city": _best_city, "clt": lambda: 2 / math.sqrt(30), "petals": _longest_petals}


def check_challenge(ch: dict, payload: dict) -> dict:
    if ch["kind"] == "answer":
        expected = _COMPUTE[ch["compute"]]()
        given = payload.get("answer")
        if ch["answer_type"] == "number":
            try:
                ok = abs(float(given) - float(expected)) <= ch.get("tolerance", 0.01)
            except (TypeError, ValueError):
                return {"solved": False, "score": 0.0, "feedback": ["Please enter a number."]}
            fb = "Correct!" if ok else "Not quite — investigate in the lab and try again."
        else:
            ok = str(given) == str(expected)
            fb = "Correct — nice detective work!" if ok else "Not quite — check the chart again."
        return {"solved": ok, "score": 1.0 if ok else 0.0, "feedback": [fb]}
    # pipeline challenge
    steps = list((payload.get("config") or {}).get("steps") or [])
    res = engine.run_pipeline("dirty_students", steps, focus="hours_studied")
    t = engine.load("dirty_students")
    for s in steps:
        try:
            t, _ = engine.apply_step(t, dict(s))
        except Exception:
            break
    a = res["after"]
    hours = engine.num(t.get("hours_studied", []))
    final = engine.num(t.get("final_score", []))
    checks = [
        (a["missing"] == 0, f"Missing values: {a['missing']}"),
        (a["duplicates"] == 0, f"Duplicate rows: {a['duplicates']}"),
        (len(hours) > 0 and hours.min() >= 0 and hours.max() <= 24, "Study hours within 0–24" + ("" if len(hours) else " (column missing!)")),
        (len(final) > 0 and final.min() >= 0 and final.max() <= 100, "Final scores within 0–100" + ("" if len(final) else " (column missing!)")),
        (res["kept_fraction"] >= 0.85, f"Rows kept: {res['kept_fraction'] * 100:.0f}% (need ≥ 85%)"),
    ]
    checks = [(bool(c), m) for c, m in checks]
    ok = all(c for c, _ in checks) and res["error"] is None
    fb = [("✅ " if c else "❌ ") + msg for c, msg in checks]
    if res["error"]:
        fb.append(f"Step {res['error']['index'] + 1} failed: {res['error']['message']}")
    return {"solved": bool(ok), "score": float(round(sum(c for c, _ in checks) / len(checks), 3)), "feedback": fb}


KNOWLEDGE = {
    "data-science": {"keys": ["data science", "lifecycle", "what is ds"], "lesson": "ds-intro",
                     "text": "**Data science** turns raw data into decisions: ask a question → collect → clean → explore → model → communicate. Cleaning and exploring usually take most of the time."},
    "variables": {"keys": ["variable", "categorical", "numeric", "column", "row", "observation"], "lesson": "ds-intro",
                  "text": "In a tidy dataset each **row** is an observation and each **column** a variable. **Numeric** variables are measured (hours, price); **categorical** ones are labels (city, study group)."},
    "mean-median": {"keys": ["mean", "median", "average", "mode"], "lesson": "ds-describe",
                    "text": "The **mean** is the sum divided by the count; the **median** is the middle value of the sorted data. The median is robust to outliers; when mean > median the data is right-skewed."},
    "spread": {"keys": ["standard deviation", "std", "variance", "spread", "iqr", "quartile"], "lesson": "ds-describe",
               "text": "**Standard deviation** is the typical distance from the mean; **variance** is its square. The **IQR** (Q3 − Q1) covers the middle 50% and ignores extreme values."},
    "skew": {"keys": ["skew"], "lesson": "ds-describe",
             "text": "**Skewness** describes asymmetry. Right-skewed data has a long tail of large values (incomes, phone time); the mean is pulled above the median."},
    "charts": {"keys": ["chart", "histogram", "scatter", "bar chart", "plot", "visualis", "visualiz"], "lesson": "ds-viz",
               "text": "Choose charts by question: **histogram** for one numeric variable's shape, **scatter plot** for two numeric variables, **bar chart** to compare categories. Label axes and start bars at zero."},
    "correlation": {"keys": ["correlation", "pearson", "heatmap", " r "], "lesson": "ds-correlation",
                    "text": "**Pearson's r** measures linear association from −1 to +1. It says nothing about cause, and r ≈ 0 can hide a curved relationship."},
    "causation": {"keys": ["causation", "cause", "confound"], "lesson": "ds-correlation",
                  "text": "**Correlation is not causation.** A hidden **confounder** can drive both variables. Randomised experiments are the gold standard for proving cause."},
    "missing": {"keys": ["missing", "null", "nan", "impute", "imputation"], "lesson": "ds-cleaning",
                "text": "Handle **missing values** by dropping rows (simple, but loses data and can bias results) or **imputing** — filling with the mean/median (numeric) or mode (categorical)."},
    "outliers": {"keys": ["outlier", "z-score", "zscore"], "lesson": "ds-cleaning",
                 "text": "An **outlier** is far from the rest. A z-score above 3 is suspicious. Impossible values are errors to remove; genuine extremes should usually be kept and reported."},
    "duplicates": {"keys": ["duplicate"], "lesson": "ds-cleaning",
                   "text": "**Duplicate rows** count one observation several times and bias averages and counts. Remove them early in a pipeline."},
    "normalize": {"keys": ["normaliz", "normalis", "standardiz", "standardis", "scaling"], "lesson": "ds-cleaning",
                  "text": "**Min–max normalisation** rescales to [0, 1]; **standardisation** gives mean 0 and standard deviation 1. Many ML models need features on similar scales."},
    "distribution": {"keys": ["distribution", "normal", "gaussian", "uniform", "exponential", "binomial", "probability"], "lesson": "ds-probability",
                     "text": "A **probability distribution** tells how likely each value is: uniform (die), normal (bell curve), exponential (waiting times), binomial (count of successes in n trials)."},
    "clt": {"keys": ["central limit", "clt", "standard error", "sample mean", "sampling"], "lesson": "ds-probability",
            "text": "The **Central Limit Theorem**: means of n independent samples are approximately normal with standard error σ/√n, whatever the original distribution."},
}
