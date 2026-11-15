"""Runtime configuration, read from environment variables.

CREWSENSE_ENV           "production" or "development". When unset, the process counts as production
                        if it runs on Fly.io (FLY_APP_NAME) or Railway (RAILWAY_ENVIRONMENT), and as
                        development otherwise. The Docker image sets it to "production".
CREWSENSE_DATABASE_URL  SQLAlchemy URL. Takes precedence over DATABASE_URL.
DATABASE_URL            Set by Fly.io, Railway and similar hosts. A postgres:// or postgresql:// URL
                        is rewritten to use the psycopg driver.
                        Development default when neither is set: a local SQLite file in the backend
                        folder. Production has no default: a missing URL, or a SQLite URL, stops the
                        process with a ConfigurationError.
CREWSENSE_SEED_DEMO     "true" or "false". Seeds the synthetic Mission Day 087 demo astronaut on
                        startup. Default: "true" in development, "false" in production. Any other
                        value is rejected.
CREWSENSE_CORS_ORIGINS  Comma-separated list of browser origins allowed to call the API. "*" is
                        never accepted. Default: the local Vite dev server in development, no
                        origins at all in production.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from pathlib import Path

BACKEND_ROOT: Path = Path(__file__).resolve().parents[2]
API_VERSION: str = "1.0.0"
API_PREFIX: str = "/api/v1"
DEFAULT_CORS_ORIGINS: tuple[str, ...] = ("http://localhost:5173", "http://127.0.0.1:5173")

_PRODUCTION_NAMES = frozenset({"production", "prod"})
_DEVELOPMENT_NAMES = frozenset({"development", "dev", "local", "test"})
_TRUE_VALUES = frozenset({"true", "1", "yes", "on"})
_FALSE_VALUES = frozenset({"false", "0", "no", "off"})

logger = logging.getLogger(__name__)


class ConfigurationError(RuntimeError):
    """The environment is not usable. Raised at startup so a misconfigured deploy fails fast."""


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


def is_production() -> bool:
    """True when CREWSENSE_ENV says so, or when it is unset and a hosting platform is detected."""
    explicit = os.environ.get("CREWSENSE_ENV", "").strip().lower()
    if explicit in _PRODUCTION_NAMES:
        return True
    if explicit in _DEVELOPMENT_NAMES:
        return False
    if explicit:
        raise ConfigurationError(f"CREWSENSE_ENV must be 'production' or 'development', got {explicit!r}.")
    return bool(os.environ.get("FLY_APP_NAME") or os.environ.get("RAILWAY_ENVIRONMENT"))


def _parse_origins(raw: str) -> tuple[str, ...]:
    origins = tuple(o.strip().rstrip("/") for o in raw.split(",") if o.strip())
    for origin in origins:
        if not origin.startswith(("http://", "https://")):
            raise ValueError(f"CREWSENSE_CORS_ORIGINS entry must start with http:// or https://: {origin!r}")
    return origins


def _parse_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name, "").strip().lower()
    if not raw:
        return default
    if raw in _TRUE_VALUES:
        return True
    if raw in _FALSE_VALUES:
        return False
    raise ConfigurationError(f"{name} must be 'true' or 'false', got {raw!r}.")


def _database_url(production: bool) -> str:
    raw_url = (os.environ.get("CREWSENSE_DATABASE_URL") or os.environ.get("DATABASE_URL") or "").strip()
    if not production:
        return normalize_database_url(raw_url or f"sqlite:///{(BACKEND_ROOT / 'crewsense.db').as_posix()}")
    if not raw_url:
        raise ConfigurationError(
            "DATABASE_URL is not set. Production requires a PostgreSQL database and never falls back "
            "to SQLite. Set DATABASE_URL (or CREWSENSE_DATABASE_URL) to the PostgreSQL URL."
        )
    url = normalize_database_url(raw_url)
    if url.startswith("sqlite"):
        raise ConfigurationError(
            "The database URL points to SQLite, which is not allowed in production. "
            "Set DATABASE_URL (or CREWSENSE_DATABASE_URL) to a PostgreSQL URL."
        )
    return url


def load_settings() -> Settings:
    production = is_production()
    origins_env = os.environ.get("CREWSENSE_CORS_ORIGINS", "").strip()
    if origins_env:
        cors_origins = _parse_origins(origins_env)
    elif production:
        cors_origins = ()
        logger.warning("CREWSENSE_CORS_ORIGINS is not set: no browser origin may call the API.")
    else:
        cors_origins = DEFAULT_CORS_ORIGINS
    return Settings(
        database_url=_database_url(production),
        seed_demo=_parse_bool("CREWSENSE_SEED_DEMO", default=not production),
        cors_origins=cors_origins,
    )
