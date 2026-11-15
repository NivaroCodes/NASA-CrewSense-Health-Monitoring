"""Runtime configuration, read from environment variables.

CREWSENSE_DATABASE_URL  SQLAlchemy URL. Takes precedence over DATABASE_URL.
DATABASE_URL            Set by Railway and similar hosts. A postgres:// or postgresql:// URL is
                        rewritten to use the psycopg driver.
                        Default when neither is set: a local SQLite file in the backend folder.
CREWSENSE_SEED_DEMO     "true" (default) seeds the Mission Day 087 demo astronaut on startup.
CREWSENSE_CORS_ORIGINS  Comma-separated list of browser origins allowed to call the API.
                        Default: the local Vite dev server.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

BACKEND_ROOT: Path = Path(__file__).resolve().parents[2]
API_VERSION: str = "1.0.0"
API_PREFIX: str = "/api/v1"
DEFAULT_CORS_ORIGINS: tuple[str, ...] = ("http://localhost:5173", "http://127.0.0.1:5173")


@dataclass(frozen=True)
class Settings:
    database_url: str
    seed_demo: bool
    cors_origins: tuple[str, ...] = DEFAULT_CORS_ORIGINS


def normalize_database_url(url: str) -> str:
    """Use the psycopg (v3) driver for PostgreSQL URLs, whatever scheme the host supplies."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


def _parse_origins(raw: str) -> tuple[str, ...]:
    origins = tuple(o.strip().rstrip("/") for o in raw.split(",") if o.strip())
    for origin in origins:
        if not origin.startswith(("http://", "https://")):
            raise ValueError(f"CREWSENSE_CORS_ORIGINS entry must start with http:// or https://: {origin!r}")
    return origins


def load_settings() -> Settings:
    default_db = f"sqlite:///{(BACKEND_ROOT / 'crewsense.db').as_posix()}"
    raw_url = os.environ.get("CREWSENSE_DATABASE_URL") or os.environ.get("DATABASE_URL") or default_db
    origins_env = os.environ.get("CREWSENSE_CORS_ORIGINS", "").strip()
    return Settings(
        database_url=normalize_database_url(raw_url),
        seed_demo=os.environ.get("CREWSENSE_SEED_DEMO", "true").strip().lower() == "true",
        cors_origins=_parse_origins(origins_env) if origins_env else DEFAULT_CORS_ORIGINS,
    )
