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
from ..courses.ds import engine as ds
from ..courses.ml import engine as ml
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
