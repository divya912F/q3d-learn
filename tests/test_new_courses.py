"""Engines and API for the DSA, Cybersecurity, Blockchain and Deep Learning courses, plus the quantum walk."""
import heapq
import itertools
import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["AI_PROVIDER"] = "offline"

import numpy as np  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.courses import registry as R  # noqa: E402
from app.courses.chain import engine as chain  # noqa: E402
from app.courses.cyber import engine as cyber  # noqa: E402
from app.courses.dl import engine as dl  # noqa: E402
from app.courses.dsa import engine as dsa  # noqa: E402
from app.main import app  # noqa: E402
from app.quantum.walk import quantum_walk  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


# ------------------------------------------------------------------ DSA
@pytest.mark.parametrize("alg", dsa.SORTS)
@pytest.mark.parametrize("order", dsa.ORDERS)
def test_every_sort_sorts_and_replays(alg, order):
    r = dsa.sort_trace(alg, n=20, order=order)
    a = list(r["values"])
    for ev in r["events"]:  # replaying the event trace must reproduce the sorted array
        if ev[0] == "s":
            a[ev[1]], a[ev[2]] = a[ev[2]], a[ev[1]]
        elif ev[0] == "w":
            a[ev[1]] = ev[2]
    assert a == sorted(r["values"]) == r["sorted"]
    assert r["comparisons"] == sum(1 for e in r["events"] if e[0] == "c")


def test_sorting_complexities_show_up_in_counts():
    n = 32
    assert dsa.sort_trace("selection", n, "nearly")["comparisons"] == n * (n - 1) // 2
    assert dsa.sort_trace("quick", n, "reversed")["comparisons"] == n * (n - 1) // 2  # last-element pivot worst case
    assert dsa.sort_trace("insertion", n, "nearly")["comparisons"] < 2 * n
    assert dsa.sort_trace("merge", n, "reversed")["comparisons"] < 200


def _brute_dijkstra(g, s):
    adj = {n["id"]: [] for n in g["nodes"]}
    for e in g["edges"]:
        adj[e["u"]].append((e["v"], e["w"]))
        adj[e["v"]].append((e["u"], e["w"]))
    dist = {s: 0}
    pq = [(0, s)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist.get(u, 1e9):
            continue
        for v, w in adj[u]:
            if d + w < dist.get(v, 1e9):
                dist[v] = d + w
                heapq.heappush(pq, (d + w, v))
    return dist


def test_graph_algorithms():
    for seed in range(5):
        g = dsa.make_graph(10, 0.4, seed)
        r = dsa.graph_run("dijkstra", graph=g)
        brute = _brute_dijkstra(g, 0)
        assert r["dist"] == [brute[i] for i in range(10)]
        prim, kruskal = dsa.graph_run("prim", graph=g), dsa.graph_run("kruskal", graph=g)
        assert prim["total"] == kruskal["total"] and len(prim["tree"]) == len(kruskal["tree"]) == 9
        bfs = dsa.graph_run("bfs", graph=g)
        assert sorted(bfs["order"]) == list(range(10)) and len(bfs["tree"]) == 9


def test_avl_stays_balanced_bst_degenerates():
    keys = list(range(1, 32))
    avl, bst = dsa.tree_ops("avl", keys), dsa.tree_ops("bst", keys)
    assert avl["height"] == 5 and bst["height"] == 31
    assert avl["traversals"]["inorder"] == keys

    def balanced(node):
        if not node:
            return True
        return abs(node["bf"]) <= 1 and balanced(node["left"]) and balanced(node["right"])

    assert all(balanced(s["tree"]) for s in avl["snapshots"])
    deleted = dsa.tree_ops("avl", keys, delete=[1, 2, 3, 16])
    assert 16 not in deleted["traversals"]["inorder"] and balanced(deleted["snapshots"][-1]["tree"])


# ------------------------------------------------------------------ Cybersecurity
def test_caesar_and_vigenere_roundtrip_and_crack():
    text = cyber.VIGENERE = (
        "Cryptography is the art of writing secret messages. For centuries people believed that a simple substitution of letters "
        "was unbreakable, until scholars noticed that some letters appear far more often than others. In English the letter e is "
        "the most common, followed by t, a and o. By counting letters in a secret message a careful reader can recover the key.")
    for k in range(1, 26):
        assert cyber.caesar(cyber.caesar(text, k), -k) == text
    assert cyber.crack_caesar(cyber.caesar(text, 9))["shift"] == 9
    for key in ["lemon", "srijan", "data", "quantum"]:
        ct = cyber.vigenere(text, key)
        assert cyber.vigenere(ct, key, decrypt=True) == text
        assert cyber.crack_vigenere(ct)["key"] == key


def test_hash_avalanche_and_passwords():
    h = cyber.hash_lab("Q-3D Learn")
    assert len(h["hash"]) == 64 and 0.35 < h["avalanche"] < 0.65
    weak, strong = cyber.password_strength("password"), cyber.password_strength("violet-tiger-canoe-orbit")
    assert weak["score"] == 0 and weak["common"]
    assert strong["score"] >= 3 and not strong["warnings"]


def test_rsa_and_diffie_hellman():
    r = cyber.rsa_lab(61, 53, 17, "HELLO")
    assert r["d"] == 2753 and r["plaintext"] == "HELLO" and r["check"] == 1 and r["signature"]["verified"]
    with pytest.raises(ValueError):
        cyber.rsa_lab(61, 53, 3)  # gcd(3, 3120) = 3
    with pytest.raises(ValueError):
        cyber.rsa_lab(60, 53, 17)
    dh = cyber.dh_lab()
    assert dh["match"] and dh["secret_alice"] == pow(5, 6 * 15, 23)


# ------------------------------------------------------------------ Blockchain
def test_mining_and_tamper_evidence():
    c = chain.chain_lab(difficulty=3)
    assert c["valid"] and all(b["hash"].startswith("000") for b in c["blocks"])
    blocks = [{"data": b["data"], "nonce": b["nonce"]} for b in c["blocks"]]
    blocks[1]["data"] = "Aarav pays Diya 5000 coins"
    t = chain.chain_lab(blocks, difficulty=3)
    assert [b["valid"] for b in t["blocks"]] == [True, False, False, False] and t["first_invalid"] == 1


def test_merkle_proofs():
    for n in (2, 3, 7, 8, 16):
        txs = [f"tx{i}" for i in range(n)]
        for i in range(n):
            m = chain.merkle_lab(txs, prove=i)
            assert m["proof_valid"] and m["proof_size"] == (n - 1).bit_length()
    m = chain.merkle_lab(prove=0, tamper=5)
    assert m["tamper"]["root_changed"] and m["tamper"]["changed"][0] == [5]


def test_nakamoto_matches_whitepaper():
    table = {0.1: 5, 0.15: 8, 0.2: 11, 0.25: 15, 0.3: 24}  # z for P < 0.1% (Bitcoin whitepaper §11)
    for q, z in table.items():
        assert chain.attack_lab(q, 1, 10)["confirmations_for_0_1pct"] == z
    assert round(chain.nakamoto(0.1, 5), 7) == 0.0009137
    sim = chain.attack_lab(0.3, 6, races=2000)
    assert abs(sim["simulated"] - sim["probability"]) < 0.05


# ------------------------------------------------------------------ Deep learning
def test_convolution_matches_manual_sum():
    img = np.arange(25, dtype=float).reshape(5, 5)
    k = np.array([[1, 0, -1], [2, 0, -2], [1, 0, -1]], float)
    out = dl.conv2d(img, k)
    i, j = 2, 2
    manual = sum(img[i + u, j + v] * k[u + 1, v + 1] for u, v in itertools.product((-1, 0, 1), repeat=2))
    assert out[i, j] == manual
    r = dl.convolve_lab("stripes", "vertical")
    assert np.array(r["pooled"]).shape == (16, 16) and min(min(row) for row in r["activation"]) >= 0


def test_attention_rows_are_distributions():
    a = dl.attention_lab("the cat sat on the mat because the cat was tired", causal=True)
    for head in a["heads"].values():
        W = np.array(head["weights"])
        assert np.allclose(W.sum(axis=1), 1, atol=1e-3)
        assert np.allclose(np.triu(W, 1), 0)  # causal: nothing from the future
    assert a["tokens"][a["heads"]["similar"]["focus"][8]] == "cat"


def test_dream_increases_activation():
    d = dl.dream_lab(layer=2, channel=3, steps=16, size=48)
    assert d["scores"][-1] > 5 * max(d["scores"][0], 1e-6)
    assert d["final"].startswith("data:image/png;base64,") and len(d["frames"]) >= 4


# ------------------------------------------------------------------ Quantum walk
def test_quantum_walk_spreads_ballistically():
    q = quantum_walk(steps=40)
    assert abs(q["total_probability"] - 1) < 1e-6
    assert q["spread_ratio"] > 3  # σ_quantum / σ_classical
    assert all(24 <= abs(p) <= 29 for p in q["peak_positions"]) and sum(q["peak_positions"]) == 0  # near ±t/√2, symmetric
    classical = quantum_walk(steps=40, decoherence=1.0)
    assert abs(classical["spread_ratio"] - 1) < 0.02
    assert np.allclose(classical["final"], classical["classical"], atol=1e-6)


# ------------------------------------------------------------------ API + content
def test_new_course_endpoints(client):
    u = client.post("/api/users", json={"name": "New Courses"}).json()
    calls = [("/api/dsa/sort", {"n": 16}), ("/api/dsa/graph", {"algorithm": "prim"}), ("/api/dsa/tree", {"kind": "avl"}),
             ("/api/cyber/cipher", {"cipher": "vigenere"}), ("/api/cyber/hash", {}), ("/api/cyber/password", {"password": "x"}),
             ("/api/cyber/rsa", {}), ("/api/cyber/dh", {}), ("/api/chain/ledger", {"difficulty": 2}), ("/api/chain/merkle", {}),
             ("/api/chain/attack", {"q": 0.2}), ("/api/dl/conv", {}), ("/api/dl/attention", {}), ("/api/dl/dream", {"steps": 8, "size": 48}),
             ("/api/quantum/walk", {"steps": 20})]
    for path, cfg in calls:
        r = client.post(path, json={"config": cfg, "user_id": u["id"]})
        assert r.status_code == 200, (path, r.text)
    assert client.post("/api/cyber/rsa", json={"config": {"p": 4, "q": 7}}).status_code == 422
    assert client.post("/api/dsa/sort-one", json={"config": {"algorithm": "nope"}}).status_code == 422
    labs = {e["lab"] for e in client.get(f"/api/progress/{u['id']}").json()["recent_experiments"]}
    assert {"walk", "dream", "attention"} <= labs


def test_every_new_challenge_is_solvable(client):
    answers = {"dsa-nearly": "insertion", "dsa-dijkstra": "15", "dsa-avl": "4", "cy-caesar": "Quantum computers will not break every cipher",
               "cy-vigenere": "srijan", "cy-rsa": "2753", "bc-break": "Block 1 and every block after it", "bc-proof": "4", "bc-confirm": "5",
               "dl-patch": "12", "dl-edge": "vertical", "dl-params": "4640", "dl-attn": "cat"}
    for cid in ("dsa", "cyber", "chain", "dl"):
        for ch in R.challenges(cid):
            if ch["kind"] == "answer":
                r = client.post(f"/api/courses/{cid}/challenges/{ch['id']}/check", json={"answer": answers[ch["id"]]}).json()
                assert r["solved"], (ch["id"], r)
    good = client.post("/api/courses/dsa/challenges/dsa-race/check", json={"config": {"algorithm": "merge"}}).json()
    bad = client.post("/api/courses/dsa/challenges/dsa-race/check", json={"config": {"algorithm": "quick"}}).json()
    assert good["solved"] and not bad["solved"]
    pw = client.post("/api/courses/cyber/challenges/cy-password/check", json={"config": {"password": "violet-tiger-canoe-orbit"}}).json()
    assert pw["solved"]
