"""client_scan_id idempotency for POST /api/v1/scans.

NOT EXECUTED in the environment where these were written: FastAPI, SQLAlchemy and pytest could not be installed there.
Run `pytest` after `pip install -r requirements.txt` to execute them.
"""

import pytest

pytest.importorskip("fastapi")
pytest.importorskip("httpx")
pytest.importorskip("sqlalchemy")

from fastapi.testclient import TestClient  # noqa: E402

from app.core.config import Settings  # noqa: E402
from app.core.database import init_db, make_engine  # noqa: E402
from app.main import create_app  # noqa: E402
from app.repositories import scans as scan_repo  # noqa: E402
from app.schemas.scans import ScanCreate  # noqa: E402
from app.services.scan_service import request_fingerprint  # noqa: E402

AS_OF = "2026-11-13T07:30:00Z"
CID = "3f2c1a9e-6b1d-4f0e-9a33-2d7c5e8b1a10"
OTHER_CID = "9b7e2d10-1c3a-4e5f-8a6b-0c9d8e7f6a5b"


def _body(client_scan_id=CID, mood=3, new_measurements=None):
    body = {
        "astronaut_id": 1,
        "as_of": AS_OF,
        "wellbeing": {"mood_score": mood, "stress_score": 4, "sleep_hours": 6.5, "symptoms": [], "notes": None},
        "new_measurements": new_measurements or [],
    }
    if client_scan_id is not None:
        body["client_scan_id"] = client_scan_id
    return body


def _bp_measurement(value=118):
    return {
        "metric_key": "systolic_bp",
        "value": value,
        "unit": "mmHg",
        "observed_at": "2026-11-13T07:20:00Z",
        "source_type": "manual_input",
        "source_detail": "test",
    }


@pytest.fixture()
def client(tmp_path):
    app = create_app(Settings(database_url=f"sqlite:///{tmp_path / 'idem.db'}", seed_demo=True))
    with TestClient(app) as test_client:
        yield test_client


def _scan_total(client):
    return client.get("/api/v1/scans", params={"astronaut_id": 1}).json()["total"]


def _measurement_total(client):
    return client.get("/api/v1/measurements", params={"astronaut_id": 1, "metric_key": "systolic_bp"}).json()["total"]


def test_first_submission_is_created_and_echoes_client_scan_id(client):
    response = client.post("/api/v1/scans", json=_body())
    assert response.status_code == 201
    assert response.json()["client_scan_id"] == CID


def test_same_id_and_same_body_returns_stored_scan_without_duplicating(client):
    first = client.post("/api/v1/scans", json=_body())
    before = _scan_total(client)

    replay = client.post("/api/v1/scans", json=_body())

    assert replay.status_code == 200
    assert replay.json()["id"] == first.json()["id"]
    assert _scan_total(client) == before


def test_same_id_with_different_body_is_a_409_conflict_and_stores_nothing(client):
    client.post("/api/v1/scans", json=_body(mood=3))
    before = _scan_total(client)

    response = client.post("/api/v1/scans", json=_body(mood=5))

    assert response.status_code == 409
    error = response.json()["error"]
    assert error["code"] == "idempotency_conflict"
    assert error["details"][0]["field"] == "client_scan_id"
    assert _scan_total(client) == before


def test_retry_with_measurements_does_not_duplicate_measurements(client):
    body = _body(new_measurements=[_bp_measurement(118)])
    client.post("/api/v1/scans", json=body)
    before = _measurement_total(client)

    replay = client.post("/api/v1/scans", json=body)

    assert replay.status_code == 200
    assert _measurement_total(client) == before


def test_conflicting_resubmit_does_not_store_its_measurements(client):
    client.post("/api/v1/scans", json=_body(new_measurements=[_bp_measurement(118)]))
    before = _measurement_total(client)

    response = client.post("/api/v1/scans", json=_body(new_measurements=[_bp_measurement(121)]))

    assert response.status_code == 409
    assert _measurement_total(client) == before


def test_scans_without_client_scan_id_are_still_accepted_each_time(client):
    first = client.post("/api/v1/scans", json=_body(client_scan_id=None))
    second = client.post("/api/v1/scans", json=_body(client_scan_id=None))
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] != second.json()["id"]
    assert first.json()["client_scan_id"] is None


def test_different_ids_create_different_scans(client):
    first = client.post("/api/v1/scans", json=_body(client_scan_id=CID))
    second = client.post("/api/v1/scans", json=_body(client_scan_id=OTHER_CID))
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] != second.json()["id"]


def test_malformed_client_scan_id_is_rejected(client):
    response = client.post("/api/v1/scans", json=_body(client_scan_id="has spaces and !"))
    assert response.status_code == 422


def test_race_between_identical_requests_returns_the_stored_scan(client, monkeypatch):
    """Simulates two identical requests that both passed the pre-check: the unique index must catch the second."""
    client.post("/api/v1/scans", json=_body())
    before = _scan_total(client)

    real_find = scan_repo.find_by_client_scan_id
    calls = {"n": 0}

    def find_missing_once(session, **kwargs):
        calls["n"] += 1
        return None if calls["n"] == 1 else real_find(session, **kwargs)

    monkeypatch.setattr(scan_repo, "find_by_client_scan_id", find_missing_once)

    response = client.post("/api/v1/scans", json=_body())

    assert response.status_code == 200
    assert _scan_total(client) == before


def test_request_fingerprint_ignores_client_scan_id_but_not_data():
    a = ScanCreate.model_validate(_body(client_scan_id=CID))
    b = ScanCreate.model_validate(_body(client_scan_id=OTHER_CID))
    c = ScanCreate.model_validate(_body(client_scan_id=CID, mood=4))
    assert request_fingerprint(a) == request_fingerprint(b)
    assert request_fingerprint(a) != request_fingerprint(c)


def test_legacy_sqlite_database_gains_idempotency_columns_and_keeps_rows(tmp_path):
    engine = make_engine(f"sqlite:///{tmp_path / 'legacy.db'}")
    with engine.begin() as conn:
        conn.exec_driver_sql(
            "CREATE TABLE health_scans (id INTEGER PRIMARY KEY, astronaut_id INTEGER, submitted_at DATETIME, "
            "as_of DATETIME, mission_day INTEGER, mood_score INTEGER, stress_score INTEGER, sleep_hours FLOAT, "
            "symptoms JSON, notes TEXT, processing_status VARCHAR(20), overall_status VARCHAR(20), summary JSON)"
        )
        conn.exec_driver_sql(
            "INSERT INTO health_scans (id, astronaut_id, submitted_at, as_of, mission_day, mood_score, stress_score, "
            "sleep_hours, symptoms, notes, processing_status, overall_status, summary) VALUES "
            "(1, 1, '2026-11-13 07:30:00', '2026-11-13 07:30:00', 87, 3, 4, 6.5, '[]', NULL, 'completed', 'stable', '{}')"
        )

    init_db(engine)
    init_db(engine)  # running the upgrade twice must be harmless

    with engine.connect() as conn:
        columns = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(health_scans)")}
        assert {"client_scan_id", "request_fingerprint"} <= columns
        rows = conn.exec_driver_sql("SELECT id, client_scan_id FROM health_scans").all()
        assert [tuple(r) for r in rows] == [(1, None)]
        index_names = {row[1] for row in conn.exec_driver_sql("PRAGMA index_list(health_scans)")}
        assert "ux_health_scans_astronaut_client_scan_id" in index_names


def test_measurement_observed_after_reference_time_is_rejected_and_nothing_is_stored(client):
    """observed_at later than as_of would be left out of the analysis, so the request is refused (422)."""
    body = _body(new_measurements=[{**_bp_measurement(118), "observed_at": "2026-11-13T07:40:00Z"}])
    before_scans = _scan_total(client)
    before_measurements = _measurement_total(client)

    response = client.post("/api/v1/scans", json=body)

    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == "new_measurements[0].observed_at"
    assert _scan_total(client) == before_scans
    assert _measurement_total(client) == before_measurements


def test_measurement_observed_exactly_at_reference_time_is_accepted(client):
    body = _body(new_measurements=[{**_bp_measurement(119), "observed_at": AS_OF}])
    response = client.post("/api/v1/scans", json=body)
    assert response.status_code == 201
