"""Runtime configuration from environment variables (optionally loaded from a .env file)."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent

try:  # python-dotenv is optional
    from dotenv import load_dotenv

    load_dotenv(ROOT_DIR / ".env")
except ImportError:  # pragma: no cover
    pass


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


@dataclass
class Settings:
    app_name: str = "Q-3D Learn"
    version: str = "1.0.0"
    database_url: str = field(default_factory=lambda: _env("DATABASE_URL", f"sqlite:///{ROOT_DIR / 'q3d_learn.db'}"))
    frontend_dir: Path = field(default_factory=lambda: Path(_env("Q3D_FRONTEND_DIR", str(ROOT_DIR / "frontend"))))
    cors_origins: list[str] = field(default_factory=lambda: [o for o in _env("CORS_ORIGINS", "*").split(",") if o])

    # Quantum backend: auto = use Qiskit Aer when installed, otherwise the built-in engine.
    quantum_backend: str = field(default_factory=lambda: _env("QUANTUM_BACKEND", "auto"))

    # AI tutor: auto = OpenAI if OPENAI_API_KEY, else Gemini if GEMINI_API_KEY, else offline tutor.
    ai_provider: str = field(default_factory=lambda: _env("AI_PROVIDER", "auto"))
    openai_api_key: str = field(default_factory=lambda: _env("OPENAI_API_KEY"))
    openai_model: str = field(default_factory=lambda: _env("OPENAI_MODEL", "gpt-4o-mini"))
    # Any OpenAI-compatible server works (e.g. Ollama: http://localhost:11434/v1).
    openai_base_url: str = field(default_factory=lambda: _env("OPENAI_BASE_URL", "https://api.openai.com/v1"))
    gemini_api_key: str = field(default_factory=lambda: _env("GEMINI_API_KEY"))
    gemini_model: str = field(default_factory=lambda: _env("GEMINI_MODEL", "gemini-2.5-flash"))
    ai_timeout: float = field(default_factory=lambda: float(_env("AI_TIMEOUT", "30")))


settings = Settings()
