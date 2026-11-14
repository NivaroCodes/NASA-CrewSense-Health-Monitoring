from fastapi.testclient import TestClient

from app.main import create_app


def _client(tmp_path, monkeypatch):
    db_path = (tmp_path / "cors.db").as_posix()

    monkeypatch.setenv(
        "CREWSENSE_DATABASE_URL",
        f"sqlite:///{db_path}",
    )
    monkeypatch.setenv("CREWSENSE_SEED_DEMO", "false")

    return TestClient(create_app())


def test_preflight_allows_vite_origin(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)

    response = client.options(
        "/api/v1/metrics",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert (
        response.headers["access-control-allow-origin"]
        == "http://localhost:5173"
    )
    assert "GET" in response.headers["access-control-allow-methods"]


def test_preflight_rejects_unknown_origin(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)

    response = client.options(
        "/api/v1/metrics",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
