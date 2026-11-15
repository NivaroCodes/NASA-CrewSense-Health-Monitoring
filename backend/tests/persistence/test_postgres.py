"""PostgreSQL checks: migrations, persistence across an application restart, and idempotent replay.

Runs only when CREWSENSE_TEST_POSTGRES_URL is set, for example:
    CREWSENSE_TEST_POSTGRES_URL=postgresql+psycopg://postgres@localhost:5433/crewsense_test pytest tests/persistence
The database is wiped (public schema dropped) on every run. Use a disposable database only.
"""

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.core.config import Settings
from app.main import create_app

URL = os.environ.get("CREWSENSE_TEST_POSTGRES_URL")
BACKEND_ROOT = Path(__file__).resolve().parents[2]

pytestmark = pytest.mark.skipif(not URL, reason="set CREWSENSE_TEST_POSTGRES_URL to run PostgreSQL tests")


def _reset_and_migrate() -> None:
    from alembic import command
    from alembic.config import Config

    engine = create_engine(URL)
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    engine.dispose()
    previous = os.environ.get("CREWSENSE_DATABASE_URL")
    os.environ["CREWSENSE_DATABASE_URL"] = URL
    try:
        command.upgrade(Config(str(BACKEND_ROOT / "alembic.ini")), "head")
    finally:
        if previous is None:
            os.environ.pop("CREWSENSE_DATABASE_URL", None)
        else:
            os.environ["CREWSENSE_DATABASE_URL"] = previous


def _scan_body(client_scan_id: str) -> dict:
    return {
        "as_of": "2026-11-13T07:30:00Z",
        "client_scan_id": client_scan_id,
        "wellbeing": {"mood_score": 3, "stress_score": 6, "sleep_hours": 5.2, "symptoms": ["fatigue"]},
        "new_measurements": [],
    }


def test_migrations_then_scan_persists_across_restart_and_replays_once():
    _reset_and_migrate()
    settings = Settings(database_url=URL, seed_demo=True)

    first = TestClient(create_app(settings))
    created = first.post("/api/v1/scans", json=_scan_body("pg-test-scan-0001"))
    assert created.status_code == 201, created.text
    scan_id = created.json()["id"]

    replay = first.post("/api/v1/scans", json=_scan_body("pg-test-scan-0001"))
    assert replay.status_code == 200
    assert replay.json()["id"] == scan_id

    # A new application instance on the same database stands in for a restart.
    second = TestClient(create_app(settings))
    reread = second.get(f"/api/v1/scans/{scan_id}")
    assert reread.status_code == 200
    assert reread.json()["wellbeing"]["mood_score"] == 3

    listed = second.get("/api/v1/scans", params={"limit": 50}).json()
    assert sum(1 for s in listed["items"] if s["id"] == scan_id) == 1


def test_application_refuses_to_start_on_postgres_without_migrations():
    engine = create_engine(URL)
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    engine.dispose()
    with pytest.raises(RuntimeError, match="alembic upgrade head"):
        create_app(Settings(database_url=URL, seed_demo=False))
