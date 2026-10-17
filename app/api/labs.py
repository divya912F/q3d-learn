"""Visual-lab endpoints for the Machine Learning, Data Science and AI courses.

Every lab POSTs ``{"config": {...}, "user_id": optional}``; unknown keys are ignored and every
engine clamps its own inputs, so the browser can never request unbounded work.
"""
from __future__ import annotations

import inspect
import logging
from collections.abc import Callable
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..courses.ai import engine as ai
from ..courses.chain import engine as chain
from ..courses.cyber import engine as cyber
from ..courses.dl import engine as dl
from ..courses.ds import engine as ds
from ..courses.dsa import engine as dsa
from ..courses.ml import engine as ml
from ..courses.ai import more_labs as ai2
from ..courses.chain import more_labs as chain2
from ..courses.cyber import more_labs as cyber2
from ..courses.dl import more_labs as dl2
from ..courses.ds import more_labs as ds2
from ..courses.dsa import more_labs as dsa2
from ..courses.ml import more_labs as ml2
from ..quantum.optics import chsh_test, mach_zehnder
from ..quantum.walk import quantum_walk
from ..database import Experiment, User, get_session

router = APIRouter(prefix="/api", tags=["labs"])
log = logging.getLogger(__name__)


class LabRequest(BaseModel):
    config: dict[str, Any] = Field(default_factory=dict)
    user_id: int | None = None


async def _run(fn: Callable, cfg: dict) -> Any:
    params = inspect.signature(fn).parameters
    kwargs = {k: v for k, v in cfg.items() if k in params}
    try:
        return await run_in_threadpool(fn, **kwargs)
    except (ValueError, TypeError, KeyError, IndexError) as exc:
        raise HTTPException(422, f"Invalid lab settings: {exc}") from exc


def _log(db: Session, user_id: int | None, course: str, lab: str, summary: str = "") -> None:
    if user_id and db.get(User, user_id):
        db.add(Experiment(user_id=user_id, course=course, lab=lab, num_qubits=0, gate_count=0, depth=0, backend="numpy", state_name=summary[:64]))
        db.commit()


# ------------------------------------------------------------------------------- ML
@router.post("/ml/regression")
async def ml_regression(req: LabRequest, db: Session = Depends(get_session)):
    res = await _run(ml.train_regression, req.config)
    _log(db, req.user_id, "ml", "regression", f"deg {res['degree']} · test MSE {res['final']['test_mse']}")
    return res


@router.get("/ml/degree-sweep")
async def ml_degree_sweep(dataset: str = "sine", noise: float = 0.3, seed: int = 0):
    return await _run(ml.degree_sweep, {"dataset": dataset, "noise": noise, "seed": seed})


@router.post("/ml/classifier")
async def ml_classifier(req: LabRequest, db: Session = Depends(get_session)):
    res = await _run(ml.train_classifier, req.config)
    _log(db, req.user_id, "ml", "classifier", f"{res['model']} · acc {res['final']['test_acc']}")
    return res


@router.post("/ml/kmeans")
async def ml_kmeans(req: LabRequest, db: Session = Depends(get_session)):
    res = await _run(ml.run_kmeans, req.config)
    _log(db, req.user_id, "ml", "kmeans", f"k={res['k']}")
    return res


# ------------------------------------------------------------------------------- DS
@router.get("/ds/datasets")
def ds_datasets():
    return {"datasets": ds.list_datasets(), "steps": ds.STEP_TYPES}


@router.post("/ds/explore")
async def ds_explore(req: LabRequest, db: Session = Depends(get_session)):
    cfg = {"name": req.config.get("dataset", "students"), **req.config}
    res = await _run(ds.explore, cfg)
    _log(db, req.user_id, "ds", "explorer", cfg["name"])
    return res


@router.post("/ds/pipeline")
async def ds_pipeline(req: LabRequest, db: Session = Depends(get_session)):
    cfg = {"name": req.config.get("dataset", "dirty_students"), **req.config}
    res = await _run(ds.run_pipeline, cfg)
    _log(db, req.user_id, "ds", "pipeline", f"{len(cfg.get('steps') or [])} steps")
    return res


@router.post("/ds/sample")
async def ds_sample(req: LabRequest, db: Session = Depends(get_session)):
    res = await _run(ds.sample_distribution, req.config)
    _log(db, req.user_id, "ds", "stats", req.config.get("dist", "normal"))
    return res


@router.post("/ds/clt")
async def ds_clt(req: LabRequest, db: Session = Depends(get_session)):
    res = await _run(ds.clt, req.config)
    _log(db, req.user_id, "ds", "stats", "clt")
    return res


# ------------------------------------------------------------------------------- AI
@router.get("/ai/maze/{preset}")
def ai_maze(preset: str):
    return ai.maze_preset(preset)


@router.post("/ai/search")
async def ai_search(req: LabRequest, db: Session = Depends(get_session)):
    res = await _run(ai.search, req.config)
    _log(db, req.user_id, "ai", "search", f"{res['algorithm']} · {res['expanded']} expanded")
    return res


@router.post("/ai/minimax")
async def ai_minimax(req: LabRequest, db: Session = Depends(get_session)):
    res = await _run(ai.minimax_analyse, req.config)
    _log(db, req.user_id, "ai", "minimax")
    return res


@router.post("/ai/qlearn")
async def ai_qlearn(req: LabRequest, db: Session = Depends(get_session)):
    res = await _run(ai.q_learning, req.config)
    _log(db, req.user_id, "ai", "rl", f"success {res['final']['success_rate_last50']}")
    return res


@router.post("/ai/lm")
async def ai_lm(req: LabRequest, db: Session = Depends(get_session)):
    res = await _run(ai.language_model, req.config)
    _log(db, req.user_id, "ai", "nlp")
    return res


# ------------------------------------------------------------------------------- Quantum walk
@router.post("/quantum/walk")
async def quantum_walk_lab(req: LabRequest, db: Session = Depends(get_session)):
    res = await _run(quantum_walk, req.config)
    _log(db, req.user_id, "quantum", "walk", f"{res['coin']} · p={res['decoherence']}")
    return res


# ------------------------------------------------------------------------------- DSA
@router.post("/dsa/sort")
async def dsa_sort(req: LabRequest, db: Session = Depends(get_session)):
    res = await _run(dsa.sort_race, req.config)
    _log(db, req.user_id, "dsa", "sorting", f"{res['order']} n={res['n']} · winner {res['winner']}")
    return res


@router.post("/dsa/sort-one")
async def dsa_sort_one(req: LabRequest):
    return await _run(dsa.sort_trace, req.config)


@router.post("/dsa/graph")
async def dsa_graph(req: LabRequest, db: Session = Depends(get_session)):
    res = await _run(dsa.graph_run, req.config)
    _log(db, req.user_id, "dsa", "graphs", res["algorithm"])
    return res


@router.post("/dsa/tree")
async def dsa_tree(req: LabRequest, db: Session = Depends(get_session)):
    res = await _run(dsa.tree_ops, req.config)
    _log(db, req.user_id, "dsa", "trees", f"{res['kind']} h={res['height']}")
    return res


# ------------------------------------------------------------------------------- Cybersecurity
@router.post("/cyber/cipher")
async def cyber_cipher(req: LabRequest, db: Session = Depends(get_session)):
    res = await _run(cyber.cipher_lab, req.config)
    _log(db, req.user_id, "cyber", "ciphers", res["cipher"])
    return res


@router.post("/cyber/hash")
async def cyber_hash(req: LabRequest, db: Session = Depends(get_session)):
    res = await _run(cyber.hash_lab, req.config)
    _log(db, req.user_id, "cyber", "hashing", f"{res['algorithm']} avalanche {res['avalanche']}")
    return res


@router.post("/cyber/password")
async def cyber_password(req: LabRequest):
    # never logged or stored — the password only lives for this request
    return await _run(cyber.password_strength, req.config)


@router.post("/cyber/rsa")
async def cyber_rsa(req: LabRequest, db: Session = Depends(get_session)):
    res = await _run(cyber.rsa_lab, req.config)
    _log(db, req.user_id, "cyber", "rsa", f"n={res['n']}")
    return res


@router.post("/cyber/dh")
async def cyber_dh(req: LabRequest):
    return await _run(cyber.dh_lab, req.config)


# ------------------------------------------------------------------------------- Blockchain
@router.post("/chain/ledger")
async def chain_ledger(req: LabRequest, db: Session = Depends(get_session)):
    res = await _run(chain.chain_lab, req.config)
    if res["mined"]:
        _log(db, req.user_id, "chain", "ledger", f"mined d={res['difficulty']}")
    return res


@router.post("/chain/merkle")
async def chain_merkle(req: LabRequest, db: Session = Depends(get_session)):
    res = await _run(chain.merkle_lab, req.config)
    _log(db, req.user_id, "chain", "merkle", f"{len(res['transactions'])} txs")
    return res


@router.post("/chain/attack")
async def chain_attack(req: LabRequest, db: Session = Depends(get_session)):
    res = await _run(chain.attack_lab, req.config)
    _log(db, req.user_id, "chain", "attack", f"q={res['q']} z={res['z']}")
    return res


# ------------------------------------------------------------------------------- Deep learning
@router.post("/dl/conv")
async def dl_conv(req: LabRequest, db: Session = Depends(get_session)):
    res = await _run(dl.convolve_lab, req.config)
    _log(db, req.user_id, "dl", "conv", res["kernel_name"])
    return res


@router.post("/dl/attention")
async def dl_attention(req: LabRequest, db: Session = Depends(get_session)):
    res = await _run(dl.attention_lab, req.config)
    _log(db, req.user_id, "dl", "attention", f"{len(res['tokens'])} tokens")
    return res


@router.post("/dl/dream")
async def dl_dream(req: LabRequest, db: Session = Depends(get_session)):
    res = await _run(dl.dream_lab, req.config)
    _log(db, req.user_id, "dl", "dream", f"L{res['layer']} c{res['channel']}")
    return res


# ------------------------------------------------------------------------------- v2.3 labs
# (path, engine, course, lab id, summary) — one generic endpoint per lab keeps the router small.
_V23 = [
    ("quantum/interference", mach_zehnder, "quantum", "interference", lambda r: f"φ={r['phase']} which-path={r['which_path']}"),
    ("quantum/chsh", chsh_test, "quantum", "chsh", lambda r: f"S={r['S_sampled']}"),
    ("ml/pca", ml2.pca_explore, "ml", "pca", lambda r: f"{r['dataset']} k={r['k']}"),
    ("ml/metrics", ml2.classifier_scores, "ml", "metrics", lambda r: f"AUC {r['auc']}"),
    ("ds/abtest", ds2.ab_test, "ds", "abtest", lambda r: f"p={r['p_value']}"),
    ("ds/timeseries", ds2.time_series, "ds", "timeseries", lambda r: f"{r['series']} · {r['method']} MAE {r['mae']}"),
    ("ai/genetic", ai2.genetic_tsp, "ai", "genetic", lambda r: f"{r['n']} cities · {r['best_length']}"),
    ("ai/nqueens", ai2.n_queens, "ai", "nqueens", lambda r: f"N={r['n']} {r['method']} · {r['nodes']} nodes"),
    ("dsa/dp", dsa2.dp_table, "dsa", "dp", lambda r: r["problem"]),
    ("dsa/recursion", dsa2.recursion_tree, "dsa", "recursion", lambda r: f"{r['problem']}({r['n']}) · {r['calls']} calls"),
    ("cyber/firewall", cyber2.firewall_sim, "cyber", "firewall", lambda r: f"{r['preset']} · score {r['score']}"),
    ("cyber/phishing", cyber2.phishing_check, "cyber", "phishing", lambda r: f"risk {r['risk']}"),
    ("chain/ecc", chain2.ecc_lab, "chain", "ecc", lambda r: f"{r['curve']} curve"),
    ("chain/contract", chain2.contract_sim, "chain", "contract", lambda r: r["scenario"]),
    ("dl/diffusion", dl2.diffusion, "dl", "diffusion", lambda r: f"{r['shape']} · {r['sampler']}"),
    ("dl/embeddings", dl2.embeddings, "dl", "embeddings", lambda r: r["selected"]),
]


def _make(fn, course, lab, summary):
    async def endpoint(req: LabRequest, db: Session = Depends(get_session)):
        res = await _run(fn, req.config)
        _log(db, req.user_id, course, lab, summary(res))
        return res
    endpoint.__name__ = f"{course}_{lab}"
    return endpoint


for _path, _fn, _course, _lab, _summary in _V23:
    router.add_api_route(f"/{_path}", _make(_fn, _course, _lab, _summary), methods=["POST"], name=f"{_course}_{_lab}")
