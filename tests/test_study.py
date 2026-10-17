import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["AI_PROVIDER"] = "offline"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.courses import registry as R  # noqa: E402
from app.main import app  # noqa: E402
from app.services import study as S  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def user(client):
    return client.post("/api/users", json={"name": "Study Tester"}).json()


# ------------------------------------------------------------------ pure functions
def test_deck_covers_every_quiz_and_concept():
    deck = S.deck()
    ids = [c["id"] for c in deck]
    assert len(ids) == len(set(ids)), "card ids must be unique"
    n_quiz = sum(len(l["quiz"]) for cid in R.ORDER for l in R.lessons(cid))
    n_concepts = sum(len(R.knowledge(cid)) for cid in R.ORDER)
    assert len(deck) == n_quiz + n_concepts
    for c in deck:
        assert c["front"] and c["back"] and c["course"] in R.ORDER


def test_glossary_has_a_name_for_every_concept():
    gl = S.glossary()
    keys = {g["id"].split(":", 1)[1] for g in gl}
    missing = keys - set(S.TERMS)
    assert not missing, f"add display names for {missing}"
    assert all(g["match"] for g in gl)


def test_sm2_intervals_grow_and_reset():
    st = S.CardState()
    st, d1 = S.schedule(st, S.GRADES["good"])
    st, d2 = S.schedule(st, S.GRADES["good"])
    st, d3 = S.schedule(st, S.GRADES["good"])
    assert d1.days == 1 and d2.days == 6 and d3.days > d2.days
    easy, _ = S.schedule(S.CardState(), S.GRADES["easy"])
    hard, _ = S.schedule(S.CardState(), S.GRADES["hard"])
    assert easy.interval > hard.interval and easy.ease > hard.ease
    lapsed, d = S.schedule(st, S.GRADES["again"])
    assert lapsed.reps == 0 and lapsed.lapses == 1 and d.total_seconds() == 600
    assert lapsed.ease >= 1.3


def test_ease_never_drops_below_floor():
    st = S.CardState()
    for _ in range(30):
        st, _ = S.schedule(st, S.GRADES["again"])
    assert st.ease == pytest.approx(1.3)


# ------------------------------------------------------------------ API
def test_glossary_endpoint(client):
    all_terms = client.get("/api/glossary").json()
    ml = client.get("/api/glossary?course=ml").json()
    assert len(all_terms) > len(ml) > 5
    assert {g["course"] for g in ml} == {"ml"}
    assert client.get("/api/glossary?course=nope").status_code == 404


def test_review_flow(client, user):
    uid = user["id"]
    first = client.get(f"/api/review/{uid}/due?course=quantum&limit=5").json()
    assert len(first["cards"]) == 5 and all(c["state"] == "new" for c in first["cards"])
    assert first["stats"]["seen"] == 0 and first["stats"]["unseen"] == first["stats"]["total"]
    card = first["cards"][0]
    assert set(card["preview"]) == {"again", "hard", "good", "easy"}

    r = client.post(f"/api/review/{uid}/grade", json={"card_id": card["id"], "grade": "good"}).json()
    assert r["interval_days"] == 1 and r["reps"] == 1
    again = client.post(f"/api/review/{uid}/grade", json={"card_id": first["cards"][1]["id"], "grade": "again"}).json()
    assert again["next_in_minutes"] == 10

    stats = client.get(f"/api/review/{uid}/stats?course=quantum").json()
    assert stats["seen"] == 2 and stats["reviewed_today"] == 2 and stats["due"] == 0
    nxt = client.get(f"/api/review/{uid}/due?course=quantum&limit=5").json()
    assert card["id"] not in [c["id"] for c in nxt["cards"]]
    assert client.post(f"/api/review/{uid}/grade", json={"card_id": "nope", "grade": "good"}).status_code == 404
    assert client.post(f"/api/review/{uid}/grade", json={"card_id": card["id"], "grade": "meh"}).status_code == 422


def test_reviews_count_towards_xp_and_activity(client, user):
    p = client.get(f"/api/progress/{user['id']}").json()
    assert p["reviews_total"] >= 2 and p["study_xp"] >= 2
    assert p["activity"][-1]["count"] >= 2


def test_memory_map(client, user):
    uid = user["id"]
    mem = client.get(f"/api/review/{uid}/memory").json()
    assert [c["course"] for c in mem["courses"]] == list(R.ORDER)
    assert set(mem["totals"]) >= {"mastered", "practice", "forgetting", "new", "due"}
    # every course reports topic buckets and a 0–100 score
    for c in mem["courses"]:
        assert c["topics"] and 0 <= c["score"] <= 100
        assert c["counts"]["mastered"] + c["counts"]["practice"] + c["counts"]["forgetting"] + c["counts"]["new"] == c["total"]


def test_focus_sessions(client, user):
    uid = user["id"]
    s = client.post("/api/focus", json={"user_id": uid, "minutes": 25, "course": "ml", "label": "Gradient descent"}).json()
    assert s["today_minutes"] == 25 and s["sessions"] == 1 and len(s["days"]) == 7
    s = client.post("/api/focus", json={"user_id": uid, "minutes": 25}).json()
    assert s["week_minutes"] == 50
    assert client.post("/api/focus", json={"user_id": uid, "minutes": 0}).status_code == 422
    assert client.get(f"/api/progress/{uid}").json()["focus_minutes"] == 50


def test_notes_roundtrip(client, user):
    uid = user["id"]
    lesson = R.lessons("ds")[0]["id"]
    assert client.get(f"/api/notes/{uid}/{lesson}").json()["text"] == ""
    client.put(f"/api/notes/{uid}/{lesson}", json={"text": "median is robust to outliers"})
    client.put(f"/api/notes/{uid}/{lesson}", json={"text": "median is robust to outliers!"})
    notes = client.get(f"/api/notes/{uid}").json()
    assert len(notes) == 1 and notes[0]["text"].endswith("!") and notes[0]["course"] == "ds"
    assert client.put(f"/api/notes/{uid}/not-a-lesson", json={"text": "x"}).status_code == 404


def test_certificate_requires_completion_then_verifies(client):
    u = client.post("/api/users", json={"name": "Cert Student"}).json()
    c = client.get(f"/api/certificate/{u['id']}/ai").json()
    assert c["eligible"] is False and "code" not in c
    for lesson in R.lessons("ai"):
        answers = [q["answer"] for q in lesson["quiz"]]
        client.post(f"/api/courses/ai/lessons/{lesson['id']}/quiz", json={"answers": answers, "user_id": u["id"]})
    c = client.get(f"/api/certificate/{u['id']}/ai").json()
    assert c["eligible"] is True and len(c["code"]) == 10
    v = client.get(f"/api/certificates/verify/{c['code'].lower()}").json()
    assert v == {"valid": True, "name": "Cert Student", "course": "Artificial Intelligence"}
    assert client.get("/api/certificates/verify/XXXXXXXXXX").json() == {"valid": False}
