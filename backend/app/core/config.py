"""Runtime configuration, read from environment variables.

CREWSENSE_DATABASE_URL  SQLAlchemy URL. Default: a local SQLite file in the backend folder.
CREWSENSE_SEED_DEMO     "true" (default) seeds the Mission Day 087 demo astronaut on startup.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

BACKEND_ROOT: Path = Path(__file__).resolve().parents[2]
API_VERSION: str = "1.0.0"
API_PREFIX: str = "/api/v1"


@dataclass(frozen=True)
class Settings:
    database_url: str
    seed_demo: bool


def load_settings() -> Settings:
    default_db = f"sqlite:///{(BACKEND_ROOT / 'crewsense.db').as_posix()}"
    return Settings(
        database_url=os.environ.get("CREWSENSE_DATABASE_URL", default_db),
        seed_demo=os.environ.get("CREWSENSE_SEED_DEMO", "true").strip().lower() == "true",
    )
