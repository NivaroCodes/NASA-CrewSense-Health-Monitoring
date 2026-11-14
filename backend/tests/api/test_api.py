"""HTTP contract tests. Require fastapi, httpx and sqlalchemy; skipped otherwise.

These tests have NOT been executed in the environment where the Phase 1–2 code was
written, because FastAPI/SQLAlchemy/httpx were not installed. Run `pytest` after
`pip install -r requirements.txt` to execute them.
"""

import pytest

pytest.importorskip("fastapi")
pytest.importorskip("httpx")
pytest.importorskip("sqlalchemy")

from fastapi.testclient import TestClient  # noqa: E402

from app.core.config import Settings  # noqa: E402
from app.main import create_app  # noqa: E402

DAY_087_AS_OF = "2026-11-13T07:30:00Z"


@pytest.fixture()
def client(tmp_path):
    app = create_app(Settings(database_url=f"sqlite:///{tmp_path / 'test.db'}", seed_demo=True))
    with TestClient(app) as test_client:
        yield test_client


def _error(response):
    body = response.json()
    assert set(body) == {"error"}
    assert {"code", "message", "details"} <= set(body["error"])
    return body["error"]


def test_health_reports_ok(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["database"] == "ok"


def test_metric_catalogue_lists_five_metrics(client):
    body = client.get("/api/v1/metrics").json()
    assert body["total"] == 5
    keys = {item["metric_key"] for item in body["items"]}
    assert {"heart_rate", "systolic_bp", "diastolic_bp", "exercise_duration", "lymphocyte_count"} == keys


def test_dashboard_for_mission_day_087_matches_contract(client):
    body = client.get("/api/v1/dashboard", params={"as_of": DAY_087_AS_OF}).json()
    assert body["mission"]["mission_day"] == 87
    assert body["astronaut"]["is_synthetic"] is True
    assert {a["rule_id"] for a in body["alerts"]} == {"CV-HR-01", "BM-EX-01", "IM-LYM-01"}
    assert [r["metric_key"] for r in body["scan_requirements"]] == ["systolic_bp", "diastolic_bp"]
    assert body["wellbeing"]["required_today"] is True
    hr = next(i for i in body["indicators"] if i["metric_key"] == "heart_rate")
    assert hr["compared_value"] == 96.0
    assert hr["baseline"]["reference_value"] == 81.0


def test_manual_measurement_is_stored_with_provenance_and_not_synthetic(client):
    response = client.post(
        "/api/v1/measurements",
        json={
            "metric_key": "diastolic_bp",
            "value": 76,
            "unit": "mmHg",
            "observed_at": "2026-11-13T07:05:00Z",
            "source_type": "manual_input",
            "source_detail": "Manual cuff entry at morning check",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["is_synthetic"] is False
    assert body["source_type"] == "manual_input"
    assert body["unit"] == "mmHg"
    assert body["validation_status"] == "valid"
    assert body["observed_at"] == "2026-11-13T07:05:00Z"


def test_duplicate_measurement_returns_409(client):
    payload = {
        "metric_key": "diastolic_bp",
        "value": 76,
        "unit": "mmHg",
        "observed_at": "2026-11-13T07:05:00Z",
        "source_type": "manual_input",
    }
    assert client.post("/api/v1/measurements", json=payload).status_code == 201
    response = client.post("/api/v1/measurements", json=payload)
    assert response.status_code == 409
    assert _error(response)["code"] == "duplicate_measurement"


def test_unit_mismatch_returns_422_with_field_detail(client):
    response = client.post(
        "/api/v1/measurements",
        json={
            "metric_key": "diastolic_bp",
            "value": 10,
            "unit": "kPa",
            "observed_at": "2026-11-13T07:05:00Z",
            "source_type": "manual_input",
        },
    )
    assert response.status_code == 422
    error = _error(response)
    assert error["code"] == "validation_error"
    assert any(d["field"] == "unit" for d in error["details"])


def test_unknown_metric_returns_404(client):
    response = client.post(
        "/api/v1/measurements",
        json={
            "metric_key": "unknown_metric",
            "value": 1,
            "unit": "x",
            "observed_at": "2026-11-13T07:05:00Z",
            "source_type": "manual_input",
        },
    )
    assert response.status_code == 404
    assert _error(response)["code"] == "not_found"


def test_scan_submission_persists_and_is_retrievable_unchanged(client):
    body = {
        "as_of": DAY_087_AS_OF,
        "wellbeing": {"mood_score": 3, "stress_score": 6, "sleep_hours": 5.2, "symptoms": ["fatigue"]},
    }
    created = client.post("/api/v1/scans", json=body)
    assert created.status_code == 201
    scan = created.json()
    assert scan["mission_day"] == 87
    assert {a["rule_id"] for a in scan["alerts"]} == {"BH-SLP-01", "BM-EX-01", "CV-HR-01", "IM-LYM-01"}
    assert scan["summary"]["counts"] == {"alerts_attention": 3, "alerts_info": 1, "data_notices": 2}
    assert all(a["id"] is not None for a in scan["alerts"])

    fetched = client.get(f"/api/v1/scans/{scan['id']}").json()
    assert fetched == scan

    history = client.get("/api/v1/scans").json()
    assert history["items"][0]["id"] == scan["id"]


def test_invalid_scan_wellbeing_returns_422_and_stores_nothing(client):
    response = client.post(
        "/api/v1/scans",
        json={
            "as_of": DAY_087_AS_OF,
            "wellbeing": {"mood_score": 9, "stress_score": 6, "sleep_hours": 5.2},
            "new_measurements": [],
        },
    )
    assert response.status_code == 422
    fields = [d["field"] for d in _error(response)["details"]]
    assert "wellbeing.mood_score" in fields
    assert client.get("/api/v1/scans").json()["total"] == 6  # seeded history only


def test_invalid_new_measurement_rejects_whole_scan_and_stores_nothing(client):
    before = client.get("/api/v1/measurements", params={"limit": 500}).json()["total"]
    response = client.post(
        "/api/v1/scans",
        json={
            "as_of": DAY_087_AS_OF,
            "wellbeing": {"mood_score": 3, "stress_score": 6, "sleep_hours": 5.2},
            "new_measurements": [
                {"metric_key": "systolic_bp", "value": 120, "unit": "mmHg",
                 "observed_at": "2026-11-13T07:00:00Z", "source_type": "manual_input"},
                {"metric_key": "systolic_bp", "value": 900, "unit": "mmHg",
                 "observed_at": "2026-11-13T07:01:00Z", "source_type": "manual_input"},
            ],
        },
    )
    assert response.status_code == 422
    fields = [d["field"] for d in _error(response)["details"]]
    assert "new_measurements[1].value" in fields
    after = client.get("/api/v1/measurements", params={"limit": 500}).json()["total"]
    assert after == before


def test_unknown_scan_returns_404(client):
    response = client.get("/api/v1/scans/999999")
    assert response.status_code == 404
    assert _error(response)["code"] == "not_found"


def test_measurement_history_filters_by_metric(client):
    body = client.get("/api/v1/measurements", params={"metric_key": "heart_rate", "limit": 5}).json()
    assert body["total"] >= 1
    assert all(item["metric_key"] == "heart_rate" for item in body["items"])
    assert all(item["is_synthetic"] is True for item in body["items"])


def test_openapi_document_is_generated(client):
    paths = client.get("/openapi.json").json()["paths"]
    for path in [
        "/api/v1/health",
        "/api/v1/dashboard",
        "/api/v1/measurements",
        "/api/v1/scans",
        "/api/v1/scans/{scan_id}",
        "/api/v1/alerts",
        "/api/v1/metrics",
    ]:
        assert path in paths
