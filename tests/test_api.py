import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["AI_PROVIDER"] = "offline"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

BELL = {"num_qubits": 2, "operations": [{"name": "h", "qubits": [0]}, {"name": "cx", "qubits": [0, 1]}]}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def user(client):
    return client.post("/api/users", json={"name": "Test Learner"}).json()


def test_health_and_frontend(client):
    assert client.get("/api/health").json()["status"] == "ok"
    assert client.get("/").status_code == 200
    assert "Q-3D Learn" in client.get("/").text


def test_simulate(client, user):
    r = client.post("/api/simulate", json={**BELL, "shots": 256, "user_id": user["id"], "seed": 1})
    assert r.status_code == 200
    data = r.json()
    assert set(data["counts"]) == {"00", "11"}
    assert data["analysis"]["kind"] == "entangled"


def test_simulate_rejects_bad_circuit(client):
    r = client.post("/api/simulate", json={"num_qubits": 1, "operations": [{"name": "cx", "qubits": [0, 1]}]})
    assert r.status_code == 422


def test_lessons_hide_answers(client):
    lesson = client.get("/api/lessons/qubits").json()
    assert all("answer" not in q for q in lesson["quiz"])


def test_quiz_progress_and_recommendations(client, user):
    graded = client.post("/api/lessons/qubits/quiz", json={"user_id": user["id"], "answers": [1, 2, 1]}).json()
    assert graded["score"] == 3
    p = client.get(f"/api/progress/{user['id']}").json()
    assert "qubits" in p["lessons_completed"]
    assert p["experiments"] >= 1
    assert p["xp"] > 0
    assert p["recommendations"]


def test_challenge(client, user):
    r = client.post("/api/challenges/bell/check", json={**BELL, "user_id": user["id"]}).json()
    assert r["solved"] and r["points"] == 100


def test_tutor_offline_grounded(client, user):
    r = client.post("/api/tutor/ask", json={"question": "Explain my circuit", "circuit": BELL, "user_id": user["id"]}).json()
    assert r["provider"] == "offline"
    assert "Bell" in r["answer"]
    assert any("Exact probabilities" in f for f in r["facts"])
    r2 = client.post("/api/tutor/ask", json={"question": "What happens when I apply an H gate to |0⟩?"}).json()
    assert "|+⟩" in r2["answer"]


def test_qasm_endpoints(client):
    out = client.post("/api/qasm/export", json=BELL).json()
    assert "cx q[0], q[1];" in out["qasm"] and "QuantumCircuit" in out["qiskit"]
    back = client.post("/api/qasm/import", json={"qasm": out["qasm"]}).json()
    assert back["num_qubits"] == 2


def test_classroom_flow(client):
    teacher = client.post("/api/users", json={"name": "Prof", "role": "instructor"}).json()
    room = client.post("/api/classrooms", json={"name": "QC 101", "instructor_id": teacher["id"]}).json()
    student = client.post("/api/users", json={"name": "Stu", "classroom_code": room["code"]}).json()
    client.post("/api/challenges/coin/check", json={"num_qubits": 1, "operations": [{"name": "h", "qubits": [0]}], "user_id": student["id"]})
    client.post(f"/api/classrooms/{room['code']}/assignments", json={"title": "Coin", "item_type": "challenge", "item_id": "coin"})
    o = client.get(f"/api/classrooms/{room['code']}/overview").json()
    assert o["totals"]["students"] == 1
    assert o["assignments"][0]["completion"] == 100


def test_demo_classroom(client):
    assert client.post("/api/classrooms/demo").json()["code"] == "DEMO42"
    o = client.get("/api/classrooms/DEMO42/overview").json()
    assert o["totals"]["students"] == 10


def test_saved_circuits(client, user):
    client.post("/api/circuits", json={**BELL, "user_id": user["id"], "title": "Bell"})
    rows = client.get(f"/api/circuits/user/{user['id']}").json()
    assert rows[0]["title"] == "Bell"
