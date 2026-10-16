"""Tests for the Machine Learning, Data Science and AI courses (engines, content, API)."""
import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["AI_PROVIDER"] = "offline"

import json  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.courses import registry as R  # noqa: E402
from app.courses.ai import engine as ai  # noqa: E402
from app.courses.ds import engine as ds  # noqa: E402
from app.courses.ml import engine as ml  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


# ------------------------------------------------------------------ content integrity
def test_every_course_is_complete():
    assert R.course_ids() == ["quantum", "ml", "ds", "ai", "dsa", "cyber", "chain", "dl"]
    for cid in R.course_ids():
        c = R.course(cid)
        assert c["labs"] and c["lessons"] >= 6 and c["challenges"] >= 4
        for lesson in R.lessons(cid):
            assert lesson["topic"] in c["topics"], lesson["id"]
            assert len(lesson["quiz"]) == 3
            for q in lesson["quiz"]:
                assert 0 <= q["answer"] < len(q["options"])
            for b in lesson["blocks"]:
                if b["type"] == "try" and "lab" in b:
                    assert b["lab"] in {lab["id"] for lab in c["labs"]}
        for ch in R.challenges(cid):
            assert ch["topic"] in c["topics"], ch["id"]


def test_ids_are_globally_unique():
    lessons = [l["id"] for c in R.course_ids() for l in R.lessons(c)]
    challenges = [ch["id"] for c in R.course_ids() for ch in R.challenges(c)]
    assert len(lessons) == len(set(lessons)) and len(challenges) == len(set(challenges))


# ------------------------------------------------------------------ ML engine
def test_regression_converges_and_diverges():
    good = ml.train_regression(dataset="linear", degree=1, lr=0.5, epochs=60)
    assert not good["diverged"]
    assert good["final"]["test_mse"] <= good["final"]["best_possible_test_mse"] * 1.05 + 1e-3
    assert "landscape" in good
    bad = ml.train_regression(dataset="linear", degree=1, lr=1.5, epochs=60)
    assert bad["diverged"]
    json.dumps(bad)  # diverged values must stay JSON-safe


def test_degree_sweep_shows_overfitting():
    sweep = ml.degree_sweep("sine")
    assert sweep[0]["train"] > sweep[-1]["train"]  # train error keeps falling
    best = min(sweep, key=lambda s: s["test"])
    assert 1 < best["degree"] < 9


@pytest.mark.parametrize("model,kw,dataset,acc", [
    ("logistic", {"degree": 3}, "circles", 0.9), ("knn", {"k": 5}, "spiral", 0.9),
    ("tree", {"max_depth": 5}, "blobs3", 0.9), ("mlp", {"hidden": [8, 8], "epochs": 300}, "moons", 0.95),
])
def test_classifiers_learn(model, kw, dataset, acc):
    r = ml.train_classifier(dataset=dataset, model=model, **kw)
    assert r["final"]["test_acc"] >= acc
    assert len(r["snapshots"][-1]["cls"]) == r["grid"] ** 2


def test_kmeans_finds_clusters():
    r = ml.run_kmeans(k=4, true_clusters=4, spread=0.45, seed=4)
    assert r["final"]["silhouette"] > 0.6
    assert r["steps"][-1]["phase"] == "update"


# ------------------------------------------------------------------ DS engine
def test_describe_and_correlation():
    t = ds.load("students")
    desc = {d["column"]: d for d in ds.describe(t)}
    assert desc["final_score"]["type"] == "numeric" and desc["study_group"]["type"] == "categorical"
    corr = ds.correlation(t)
    assert all(abs(corr["matrix"][i][i] - 1) < 1e-6 for i in range(len(corr["columns"])))


def test_pipeline_cleans_dirty_data():
    steps = [{"type": "drop_duplicates"}, {"type": "fill_missing", "column": "*", "strategy": "median"},
             {"type": "clip_range", "column": "hours_studied", "min": 0, "max": 24}]
    r = ds.run_pipeline("dirty_students", steps)
    assert r["before"]["duplicates"] > 0 and r["after"]["duplicates"] == 0
    assert r["before"]["missing"] > 0 and r["after"]["missing"] == 0
    assert r["error"] is None
    bad = ds.run_pipeline("dirty_students", [{"type": "drop_column", "column": "final_score"}, {"type": "filter", "column": "final_score", "op": ">", "value": 1}])
    assert bad["error"]["index"] == 1


def test_central_limit_theorem():
    r = ds.clt("exponential", {"mean": 2.0}, sample_size=30, n_samples=3000)
    assert abs(r["std_of_means"] - r["theory_se"]) < 0.03
    assert abs(r["mean_of_means"] - 2.0) < 0.05


# ------------------------------------------------------------------ AI engine
def test_astar_is_optimal_and_efficient():
    maze = ai.maze_preset("maze")
    ucs = ai.search(**maze, algorithm="ucs")
    astar = ai.search(**maze, algorithm="astar", heuristic="manhattan")
    dfs = ai.search(**maze, algorithm="dfs")
    assert astar["path_cost"] == ucs["path_cost"] and astar["expanded"] < ucs["expanded"]
    assert dfs["path_cost"] >= ucs["path_cost"]


def test_mud_makes_bfs_suboptimal():
    m = ai.maze_preset("mud")
    assert ai.search(**m, algorithm="ucs")["path_cost"] <= ai.search(**m, algorithm="bfs")["path_cost"]


def test_minimax_blocks_and_prunes():
    r = ai.minimax_analyse(["X", "X", "", "", "O", "", "", "", ""], "O")
    assert r["best_moves"] == [2]  # must block
    assert r["nodes"] < r["nodes_without_pruning"]


def test_q_learning_reaches_goal():
    r = ai.q_learning(episodes=300, alpha=0.5, epsilon=0.3)
    assert r["greedy_reaches_goal"] and r["final"]["success_rate_last50"] > 0.8


def test_language_model_probabilities():
    r = ai.language_model(prompt="the students", n=2, temperature=0, length=5)
    assert abs(sum(p for _, p in r["next"]) - 1) < 0.02 or len(r["next"]) == 10
    assert r["steps"][0]["chosen"] == r["steps"][0]["top"][0][0]  # temperature 0 = greedy


# ------------------------------------------------------------------ API
def test_course_api_and_challenges(client):
    assert [c["id"] for c in client.get("/api/courses").json()] == ["quantum", "ml", "ds", "ai", "dsa", "cyber", "chain", "dl"]
    ch = client.get("/api/courses/ds/challenges").json()
    assert all("compute" not in c for c in ch)  # answers stay server-side
    r = client.post("/api/courses/ai/challenges/ai-optimal/check", json={"config": {"algorithm": "astar", "heuristic": "manhattan"}}).json()
    assert r["solved"]
    r = client.post("/api/courses/ds/challenges/ds-clt/check", json={"answer": 0.365}).json()
    assert r["solved"]
    r = client.post("/api/courses/ml/challenges/ml-tree/check", json={"config": {"max_depth": 2}}).json()
    assert not r["solved"]


@pytest.mark.parametrize("path,cfg", [
    ("ml/regression", {"dataset": "sine", "degree": 3}), ("ml/classifier", {"model": "knn"}), ("ml/kmeans", {"k": 3}),
    ("ds/explore", {"dataset": "housing"}), ("ds/pipeline", {"steps": [{"type": "drop_duplicates"}]}), ("ds/sample", {"dist": "dice"}),
    ("ds/clt", {}), ("ai/qlearn", {"episodes": 50}), ("ai/lm", {"prompt": "data"}), ("ai/minimax", {"board": ["X"] + [""] * 8, "player": "O"}),
])
def test_lab_endpoints(client, path, cfg):
    r = client.post(f"/api/{path}", json={"config": cfg})
    assert r.status_code == 200, r.text


def test_lab_rejects_bad_input(client):
    assert client.post("/api/ml/classifier", json={"config": {"dataset": "nope"}}).status_code == 422
    assert client.post("/api/ds/sample", json={"config": {"dist": "nope"}}).status_code == 422


def test_progress_is_per_course(client):
    u = client.post("/api/users", json={"name": "Multi"}).json()
    client.post("/api/courses/ml/lessons/ml-intro/quiz", json={"user_id": u["id"], "answers": [1, 1, 1]})
    client.post("/api/courses/ai/challenges/ai-ngram/check", json={"user_id": u["id"], "answer": "learn"})
    client.post("/api/ml/kmeans", json={"user_id": u["id"], "config": {"k": 2}})
    p = client.get(f"/api/progress/{u['id']}").json()
    assert p["courses"]["ml"]["lessons_completed"] == ["ml-intro"]
    assert p["courses"]["ai"]["challenges_solved"] == ["ai-ngram"]
    assert p["courses"]["ml"]["experiments"] == 1
    assert p["courses"]["quantum"]["lessons_completed"] == []


def test_tutor_is_course_aware(client):
    r = client.post("/api/tutor/ask", json={"question": "What does the learning rate do?", "course": "ml"}).json()
    assert "learning rate" in r["answer"].lower()
    r = client.post("/api/tutor/ask", json={"question": "explain my result", "course": "ai",
                                            "lab": {"lab": "search", "title": "Pathfinding lab", "facts": ["A* expanded 241 cells"]}}).json()
    assert "241" in r["answer"]
