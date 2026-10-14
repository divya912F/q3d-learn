"""Q-3D Learn — FastAPI application entry point.

Run with:  python run.py        (or)  uvicorn app.main:app --reload
API docs:  http://localhost:8000/docs
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from .api import community, learning, quantum
from .config import settings
from .database import init_db

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db(settings.database_url)
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Q-3D Learn API",
        version=settings.version,
        description="AI-powered interactive quantum learning platform: simulation, 3D visualisation data, "
        "lessons, challenges, AI tutor and learning analytics.",
        lifespan=lifespan,
    )
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(quantum.router)
    app.include_router(learning.router)
    app.include_router(community.router)

    @app.get("/api/health", tags=["system"])
    def health() -> dict:
        return {"status": "ok", "version": settings.version}

    if settings.frontend_dir.exists():
        app.mount("/", StaticFiles(directory=settings.frontend_dir, html=True), name="frontend")
    return app


app = create_app()
