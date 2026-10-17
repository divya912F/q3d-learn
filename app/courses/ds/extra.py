"""Data Science — expanded curriculum (v2.3). Merged by content.py."""
from __future__ import annotations

TOPICS_EXTRA = {
    "inference": "Statistical inference",
    "experiments": "Experiments & A/B",
    "timeseries": "Time series",
    "engineering": "Data engineering",
    "communication": "Communication",
    "ethics": "Ethics & privacy",
}

# Existing labs: explorer, pipeline, stats, abtest, timeseries
LESSONS_EXTRA = [
    {
        "id": "ds-types", "order": 7, "title": "Types of Data & Tidy Tables", "topic": "lifecycle", "level": "Beginner", "minutes": 6,
        "summary": "Numeric, categorical, ordinal; structured vs unstructured; and the one table shape that makes everything easier.",
        "blocks": [
            {"type": "text", "html": "Before any analysis, know your data's <b>type</b>: <b>numeric</b> (height, price), <b>categorical</b> (city, colour), <b>ordinal</b> (small/medium/large) and <b>datetime</b>. Each needs different charts and summaries."},
            {"type": "text", "html": "Most useful data is <b>tidy</b>: one row per observation, one column per variable, one value per cell. Messy spreadsheets with values in column headers or multiple facts per cell fight you at every step."},
            {"type": "callout", "kind": "tip", "html": "The first question on any new dataset: <i>what is one row?</i> One customer? One order? One day? Getting that straight prevents most analysis mistakes."},
        ],
        "quiz": [
            {"q": "\"Small / Medium / Large\" is which type?", "options": ["Numeric", "Ordinal (ordered categories)", "Datetime", "Unstructured"], "answer": 1, "explain": "Ordered categories with no fixed numeric gap are ordinal."},
            {"q": "A tidy table has…", "options": ["One value per cell, one variable per column", "Values in the headers", "Many facts per cell", "No columns"], "answer": 0, "explain": "Tidy data is one observation per row, one variable per column."},
            {"q": "The best first question on a new dataset is…", "options": ["How big is the file?", "What does one row represent?", "What colour are the charts?", "Who sent it?"], "answer": 1, "explain": "Knowing the unit of observation anchors everything else."},
        ],
    },
    {
        "id": "ds-distributions", "order": 8, "title": "Distributions & Spread", "topic": "statistics", "level": "Beginner", "minutes": 7,
        "summary": "Mean vs median, variance, and why the shape of the data matters more than one number.",
        "blocks": [
            {"type": "text", "html": "A single average hides the story. Always look at the <b>distribution</b>: is it symmetric, skewed, or two humps (bimodal)? The <b>median</b> resists outliers; the <b>mean</b> gets dragged by them."},
            {"type": "formula", "tex": r"\sigma^2 = \frac{1}{n}\sum_i (x_i - \mu)^2, \qquad \text{IQR} = Q_3 - Q_1"},
            {"type": "text", "html": "<b>Standard deviation</b> σ measures typical spread; the <b>interquartile range</b> (middle 50%) is the robust alternative, and the basis of the box plot."},
            {"type": "callout", "kind": "insight", "html": "A country's \"average income\" rising can hide most people getting poorer if a few at the top soared. Median and distribution tell the honest story."},
            {"type": "try", "target": "lab", "lab": "explorer", "label": "Plot histograms and read the summary stats", "preset": {"dataset": "housing"}},
        ],
        "quiz": [
            {"q": "Which is robust to outliers?", "options": ["Mean", "Median", "Maximum", "Sum"], "answer": 1, "explain": "The median barely moves when extreme values appear."},
            {"q": "The IQR covers…", "options": ["All the data", "The middle 50%", "The top 10%", "One point"], "answer": 1, "explain": "IQR = Q3 − Q1, the central half."},
            {"q": "A bimodal distribution has…", "options": ["One peak", "Two peaks", "No spread", "No median"], "answer": 1, "explain": "Two humps often mean two mixed groups."},
        ],
    },
    {
        "id": "ds-sampling", "order": 9, "title": "Sampling & Bias", "topic": "probability", "level": "Beginner", "minutes": 7,
        "summary": "You rarely have all the data — how to sample without fooling yourself.",
        "blocks": [
            {"type": "text", "html": "We study a <b>sample</b> to learn about a <b>population</b>. A good sample is <b>random</b> and <b>representative</b>; a biased one quietly ruins every conclusion."},
            {"type": "text", "html": "<b>Selection bias</b>, <b>survivorship bias</b> (studying only the winners) and <b>non-response bias</b> are the classic traps. The famous WWII example: armouring the bullet holes on returning planes was backwards — the planes hit <i>elsewhere</i> never came back."},
            {"type": "callout", "kind": "warning", "html": "A huge sample does not fix bias — it just makes a wrong answer more confident. 2 million biased responses beat nothing, and lose to 1,000 random ones."},
        ],
        "quiz": [
            {"q": "Survivorship bias means you studied…", "options": ["A random sample", "Only the cases that 'survived' to be seen", "The whole population", "The future"], "answer": 1, "explain": "The missing (lost) cases carry the real signal."},
            {"q": "A bigger biased sample is…", "options": ["Unbiased now", "Just more confidently wrong", "Always better", "Random"], "answer": 1, "explain": "Size doesn't cure bias; representativeness does."},
            {"q": "A good sample is primarily…", "options": ["Large only", "Random and representative", "Recent only", "Cheap"], "answer": 1, "explain": "Representativeness is what lets you generalise."},
        ],
    },
    {
        "id": "ds-inference", "order": 10, "title": "Confidence Intervals & Hypothesis Tests", "topic": "inference", "level": "Intermediate", "minutes": 9,
        "summary": "Turn a sample into a claim about the world — with honest error bars.",
        "blocks": [
            {"type": "text", "html": "An estimate without uncertainty is half an answer. A <b>confidence interval</b> gives a range: \"the true conversion rate is 4.1% ± 0.6% (95% CI)\". It shrinks with more data (∝ 1/√n)."},
            {"type": "text", "html": "A <b>hypothesis test</b> asks: could this result be a fluke? The <b>p-value</b> is the probability of seeing an effect this big if there were really no effect (the null hypothesis)."},
            {"type": "formula", "tex": r"\text{95\% CI} \approx \hat{p} \pm 1.96\,\sqrt{\tfrac{\hat{p}(1-\hat{p})}{n}}"},
            {"type": "callout", "kind": "warning", "html": "A p-value is <b>not</b> the probability your hypothesis is true, and \"p < 0.05\" is a convention, not a law of nature. Report the effect size and interval, not just \"significant\"."},
            {"type": "try", "target": "lab", "lab": "abtest", "label": "Run a test and read its confidence interval", "preset": {}},
        ],
        "quiz": [
            {"q": "A 95% confidence interval…", "options": ["Is always ±5%", "Gives a plausible range for the true value", "Proves the hypothesis", "Needs no data"], "answer": 1, "explain": "It quantifies uncertainty around an estimate."},
            {"q": "The p-value is the probability of…", "options": ["The hypothesis being true", "Seeing data this extreme if the null were true", "Making money", "Zero error"], "answer": 1, "explain": "It's computed assuming no real effect."},
            {"q": "Confidence intervals shrink as n grows like…", "options": ["1/n", "1/√n", "n²", "They don't shrink"], "answer": 1, "explain": "Standard error falls with the square root of sample size."},
        ],
    },
    {
        "id": "ds-abtest", "order": 11, "title": "A/B Testing & p-Hacking", "topic": "experiments", "level": "Intermediate", "minutes": 8,
        "summary": "The experiment that powers product decisions — and the ways it goes wrong.",
        "blocks": [
            {"type": "text", "html": "An <b>A/B test</b> randomly splits users into a control and a variant, changes one thing, and measures the difference. Randomisation is what lets you claim <b>causation</b>, not just correlation."},
            {"type": "text", "html": "The dark side is <b>p-hacking</b>: peeking at the result early and stopping when it looks good, or testing 20 metrics and reporting the one that hit p < 0.05 (1 in 20 will by pure chance)."},
            {"type": "callout", "kind": "warning", "html": "Fix your sample size and metric <i>before</i> you start. In the lab, turn on \"peeking\" and watch the false-positive rate climb far above 5%."},
            {"type": "try", "target": "lab", "lab": "abtest", "label": "See how peeking inflates false positives", "preset": {}},
        ],
        "quiz": [
            {"q": "Randomisation in an A/B test lets you claim…", "options": ["Correlation only", "Causation", "Nothing", "A bigger sample"], "answer": 1, "explain": "Random assignment removes confounders, so the change caused the effect."},
            {"q": "Testing 20 metrics and reporting the one with p < 0.05 is…", "options": ["Good science", "p-hacking", "A confidence interval", "Randomisation"], "answer": 1, "explain": "By chance ~1 in 20 'significant' results is a fluke."},
            {"q": "To avoid peeking bias you should…", "options": ["Stop whenever it looks good", "Fix sample size and metric in advance", "Test more metrics", "Ignore the control"], "answer": 1, "explain": "Pre-registering the plan controls false positives."},
        ],
    },
    {
        "id": "ds-regression", "order": 12, "title": "Regression for Understanding", "topic": "correlation", "level": "Intermediate", "minutes": 8,
        "summary": "Not just prediction — reading coefficients to explain what drives an outcome.",
        "blocks": [
            {"type": "text", "html": "In data science, regression is often used to <b>explain</b>, not just predict. A multiple linear regression's coefficients say how much y changes per unit of each x, <i>holding the others fixed</i>:"},
            {"type": "formula", "tex": r"y = \beta_0 + \beta_1 x_1 + \beta_2 x_2 + \dots + \varepsilon"},
            {"type": "text", "html": "That \"holding others fixed\" is powerful — it's how you separate the effect of education from the effect of age on income. But it only works if you included the right variables."},
            {"type": "callout", "kind": "warning", "html": "A lurking <b>confounder</b> you left out can flip a coefficient's sign entirely (Simpson's paradox). Regression explains associations, not guaranteed causes."},
        ],
        "quiz": [
            {"q": "A regression coefficient β₁ is the change in y per unit x₁…", "options": ["Ignoring other variables", "Holding the other variables fixed", "Only if x₁ is zero", "Times the sample size"], "answer": 1, "explain": "Multiple regression controls for the other included predictors."},
            {"q": "A confounder is a variable that…", "options": ["Is always measured", "Influences both x and y and distorts the relationship", "Has no effect", "Is the target"], "answer": 1, "explain": "Omitting it can bias or flip the estimated effect."},
            {"q": "Regression alone proves…", "options": ["Causation always", "Association, not guaranteed causation", "Nothing ever", "The p-value is 0"], "answer": 1, "explain": "Causal claims need design (randomisation) or strong assumptions."},
        ],
    },
    {
        "id": "ds-timeseries", "order": 13, "title": "Time Series: Trend, Season & Forecast", "topic": "timeseries", "level": "Intermediate", "minutes": 8,
        "summary": "Data with a clock: decompose it, then predict the future.",
        "blocks": [
            {"type": "text", "html": "Time-series data (sales, traffic, temperature) breaks into three parts: a slow <b>trend</b>, a repeating <b>season</b> (weekly, yearly) and random <b>noise</b>:"},
            {"type": "formula", "tex": r"y_t = \text{Trend}_t + \text{Season}_t + \text{Noise}_t"},
            {"type": "text", "html": "Forecasting methods range from a simple <b>moving average</b> to exponential smoothing, ARIMA and modern ML. The golden rule: never shuffle time-series data — you must train on the past and test on the future."},
            {"type": "callout", "kind": "warning", "html": "A random train/test split leaks the future into training and gives fake-perfect accuracy. Always split by time."},
            {"type": "try", "target": "lab", "lab": "timeseries", "label": "Split a series into trend, season and noise", "preset": {}},
        ],
        "quiz": [
            {"q": "The three classic components of a time series are…", "options": ["Mean, median, mode", "Trend, season, noise", "Train, test, valid", "x, y, z"], "answer": 1, "explain": "Decomposition separates slow trend, repeating season and noise."},
            {"q": "You must split time-series data by…", "options": ["Random rows", "Time (past → future)", "Colour", "Alphabet"], "answer": 1, "explain": "Random splits leak future information into training."},
            {"q": "A moving average is used to…", "options": ["Add noise", "Smooth and reveal the trend", "Delete seasons", "Shuffle data"], "answer": 1, "explain": "Averaging a window smooths short-term noise."},
        ],
    },
    {
        "id": "ds-feature-eng", "order": 14, "title": "Wrangling, SQL & Feature Building", "topic": "engineering", "level": "Intermediate", "minutes": 8,
        "summary": "The unglamorous 80%: joining, grouping and shaping data into features.",
        "blocks": [
            {"type": "text", "html": "Real data lives in many tables. <b>SQL</b> is the universal language for pulling it together: <code>SELECT … GROUP BY</code> to aggregate, <code>JOIN</code> to combine tables on a key."},
            {"type": "text", "html": "Then you <b>engineer features</b>: a customer's number of orders, days since last visit, average basket size. Good features turn raw logs into signal a model can use — often the highest-leverage work in the whole pipeline."},
            {"type": "callout", "kind": "tip", "html": "Analysts joke that data work is 80% cleaning and shaping, 20% analysis. The 80% is where accuracy is won or lost — treat it as the real job, not a chore."},
        ],
        "quiz": [
            {"q": "In SQL, combining two tables on a shared key uses…", "options": ["GROUP BY", "JOIN", "ORDER BY", "LIMIT"], "answer": 1, "explain": "JOIN merges rows that match on a key."},
            {"q": "GROUP BY is used to…", "options": ["Delete rows", "Aggregate (sum/count/avg) per group", "Rename columns", "Sort only"], "answer": 1, "explain": "It collapses rows into per-group summaries."},
            {"q": "\"Days since last order\" is an example of…", "options": ["A raw column", "An engineered feature", "A bug", "A p-value"], "answer": 1, "explain": "It's derived from raw data to help a model."},
        ],
    },
    {
        "id": "ds-bigdata", "order": 15, "title": "Big Data & the Modern Stack", "topic": "engineering", "level": "Advanced", "minutes": 7,
        "summary": "When data no longer fits on one machine — warehouses, distributed compute and pipelines.",
        "blocks": [
            {"type": "text", "html": "When data outgrows a laptop, the tools change. A <b>data warehouse</b> (BigQuery, Snowflake) stores and queries terabytes with SQL; <b>distributed engines</b> (Spark) spread computation across many machines."},
            {"type": "text", "html": "The modern flow is <b>ELT</b>: Extract raw data, Load it into the warehouse, then Transform it there. Orchestration tools schedule these <b>pipelines</b> so dashboards refresh every morning without anyone touching them."},
            {"type": "callout", "kind": "insight", "html": "Most companies don't actually have \"big\" data — a single powerful machine with pandas or DuckDB handles millions of rows fine. Reach for distributed tools only when you truly must."},
        ],
        "quiz": [
            {"q": "A data warehouse is for…", "options": ["Storing & querying large structured data", "Training neural nets only", "Drawing charts", "Sending email"], "answer": 0, "explain": "Warehouses hold and query big tables with SQL."},
            {"q": "ELT stands for…", "options": ["Extract, Load, Transform", "Encrypt, Log, Test", "Export, Link, Train", "Estimate, Learn, Tune"], "answer": 0, "explain": "Load raw first, transform inside the warehouse."},
            {"q": "Spark is used when…", "options": ["Data fits in memory on one machine", "Computation must spread across many machines", "You need a chart", "You want SQL only"], "answer": 1, "explain": "It's a distributed compute engine for large data."},
        ],
    },
    {
        "id": "ds-storytelling", "order": 16, "title": "Telling the Story with Data", "topic": "communication", "level": "Beginner", "minutes": 7,
        "summary": "A finding nobody understands changes nothing — charts and narrative that land.",
        "blocks": [
            {"type": "text", "html": "The last mile of data science is <b>communication</b>. Pick the right chart: line for trends over time, bar for comparing categories, scatter for relationships. Avoid pie charts with many slices and truncated axes that exaggerate."},
            {"type": "text", "html": "Lead with the <b>insight</b>, not the method: \"Churn doubled after the price change\" beats \"here is a 12-column table\". One clear message per chart, labelled directly."},
            {"type": "callout", "kind": "warning", "html": "A y-axis that doesn't start at zero can turn a 2% rise into a dramatic cliff. Honest charts are part of being a trustworthy analyst."},
        ],
        "quiz": [
            {"q": "The best chart for a trend over time is a…", "options": ["Pie chart", "Line chart", "Word cloud", "Table"], "answer": 1, "explain": "Lines show change over a continuous axis best."},
            {"q": "A good data story leads with…", "options": ["The raw table", "The insight / message", "The code", "The file size"], "answer": 1, "explain": "State the finding, then support it."},
            {"q": "Starting a bar chart's y-axis above zero can…", "options": ["Be more honest", "Exaggerate small differences", "Add data", "Fix bias"], "answer": 1, "explain": "Truncated axes mislead the eye."},
        ],
    },
    {
        "id": "ds-ethics", "order": 17, "title": "Data Ethics, Privacy & Bias", "topic": "ethics", "level": "Intermediate", "minutes": 8,
        "summary": "With data power comes responsibility — fairness, consent and the law.",
        "blocks": [
            {"type": "text", "html": "Data about people carries duties. <b>Privacy</b> laws (GDPR, India's DPDP Act) require consent and a purpose; <b>anonymisation</b> is harder than it looks — a few columns can re-identify someone."},
            {"type": "text", "html": "Models learn our <b>biases</b>: train on biased hiring data and the model discriminates, then hides behind \"the algorithm decided\". Fairness means auditing outcomes across groups, not just chasing accuracy."},
            {"type": "callout", "kind": "insight", "html": "Ask of any data project: <i>Would I be comfortable if this were done to me, and explained publicly?</i> If not, rethink it — technically possible is not the same as right."},
        ],
        "quiz": [
            {"q": "Anonymisation is risky because…", "options": ["It's illegal", "A few columns can re-identify a person", "It needs no consent", "It's always perfect"], "answer": 1, "explain": "Combinations of 'anonymous' fields often pinpoint individuals."},
            {"q": "A model trained on biased data will…", "options": ["Remove the bias", "Reproduce and often amplify the bias", "Always be fair", "Need no auditing"], "answer": 1, "explain": "Garbage-in, bias-out — audit outcomes across groups."},
            {"q": "GDPR / DPDP are mainly about…", "options": ["Chart colours", "Privacy, consent and data rights", "Model accuracy", "Cloud pricing"], "answer": 1, "explain": "They govern how personal data may be collected and used."},
        ],
    },
]

KNOWLEDGE_EXTRA = {
    "tidy-data": {"keys": ["tidy data", "data types", "ordinal", "categorical", "unit of observation"], "lesson": "ds-types",
                  "text": "**Tidy data** is one observation per row, one variable per column, one value per cell. Know each column's type (numeric, categorical, ordinal, datetime) before analysing."},
    "spread": {"keys": ["distribution", "median", "variance", "standard deviation", "iqr", "skew"], "lesson": "ds-distributions",
               "text": "Always look at the **distribution**, not one number. The median resists outliers; standard deviation and the IQR (middle 50%) measure spread."},
    "sampling-bias": {"keys": ["sampling", "bias", "survivorship", "selection bias", "representative"], "lesson": "ds-sampling",
                      "text": "A sample must be **random and representative**. Selection, survivorship and non-response bias quietly ruin conclusions, and a bigger biased sample is just confidently wrong."},
    "confidence-interval": {"keys": ["confidence interval", "hypothesis test", "p-value", "null hypothesis", "significance"], "lesson": "ds-inference",
                            "text": "A **confidence interval** gives a plausible range for an estimate (shrinking like 1/√n). A **p-value** is the chance of data this extreme if the null hypothesis were true — not the chance the hypothesis is true."},
    "ab-test": {"keys": ["a/b test", "ab test", "p-hacking", "experiment", "causation"], "lesson": "ds-abtest",
                "text": "An **A/B test** randomly splits users to measure a change's causal effect. **p-hacking** (peeking, testing many metrics) inflates false positives — fix the plan in advance."},
    "confounder": {"keys": ["confounder", "simpson", "multiple regression", "coefficient", "holding fixed"], "lesson": "ds-regression",
                   "text": "A **confounder** affects both predictor and outcome and can bias or flip a regression coefficient (Simpson's paradox). Regression shows association, not guaranteed causation."},
    "decomposition": {"keys": ["time series", "trend", "seasonality", "forecast", "moving average", "arima"], "lesson": "ds-timeseries",
                      "text": "A time series = **trend + season + noise**. Forecast with moving averages, smoothing or ARIMA, and always split by time (past→future), never randomly."},
    "sql": {"keys": ["sql", "join", "group by", "feature engineering", "wrangling"], "lesson": "ds-feature-eng",
            "text": "**SQL** (SELECT/GROUP BY/JOIN) pulls data from many tables; **feature engineering** turns raw logs into signal. Cleaning and shaping is ~80% of real data work."},
    "warehouse": {"keys": ["big data", "warehouse", "spark", "elt", "pipeline", "distributed"], "lesson": "ds-bigdata",
                  "text": "When data outgrows one machine, use a **data warehouse** (SQL at scale) and distributed engines like Spark. The modern flow is ELT with scheduled pipelines."},
    "data-storytelling": {"keys": ["storytelling", "visualisation", "chart choice", "dashboard", "axis"], "lesson": "ds-storytelling",
                          "text": "**Data storytelling**: pick the right chart (line=trend, bar=compare, scatter=relationship), lead with the insight, and never use a misleading truncated axis."},
    "data-ethics": {"keys": ["data ethics", "privacy", "gdpr", "dpdp", "anonymisation", "fairness"], "lesson": "ds-ethics",
                    "text": "**Data ethics**: respect privacy and consent (GDPR/DPDP), remember anonymisation can fail, and audit models for **bias** across groups rather than chasing accuracy alone."},
}

TERMS_EXTRA = {
    "tidy-data": ("Tidy data & data types", ["tidy data"]),
    "spread": ("Distribution & spread", ["standard deviation", "iqr"]),
    "sampling-bias": ("Sampling & bias", ["survivorship bias"]),
    "confidence-interval": ("Confidence interval & p-value", ["p-value"]),
    "ab-test": ("A/B testing", ["p-hacking"]),
    "confounder": ("Confounder", ["simpson's paradox"]),
    "decomposition": ("Time-series decomposition", ["trend and season"]),
    "sql": ("SQL & feature building", ["sql", "join"]),
    "warehouse": ("Big data & warehouses", ["spark", "elt"]),
    "data-storytelling": ("Data storytelling", ["data visualisation"]),
    "data-ethics": ("Data ethics & privacy", ["gdpr", "privacy"]),
}
