import pytest

from app.core.config import DEFAULT_CORS_ORIGINS, load_settings, normalize_database_url


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("postgres://u:p@host:5432/db", "postgresql+psycopg://u:p@host:5432/db"),
        ("postgresql://u@host/db", "postgresql+psycopg://u@host/db"),
        ("postgresql+psycopg://u@host/db", "postgresql+psycopg://u@host/db"),
        ("sqlite:///x.db", "sqlite:///x.db"),
    ],
)
def test_postgres_urls_use_psycopg_driver(raw, expected):
    assert normalize_database_url(raw) == expected


def test_crewsense_database_url_takes_precedence_over_database_url(monkeypatch):
    monkeypatch.setenv("CREWSENSE_DATABASE_URL", "sqlite:////tmp/a.db")
    monkeypatch.setenv("DATABASE_URL", "postgres://u@host/db")
    assert load_settings().database_url == "sqlite:////tmp/a.db"


def test_database_url_is_used_when_crewsense_url_absent(monkeypatch):
    monkeypatch.delenv("CREWSENSE_DATABASE_URL", raising=False)
    monkeypatch.setenv("DATABASE_URL", "postgres://u@host/db")
    assert load_settings().database_url == "postgresql+psycopg://u@host/db"


def test_cors_origins_default_to_local_dev_server(monkeypatch):
    monkeypatch.delenv("CREWSENSE_CORS_ORIGINS", raising=False)
    assert load_settings().cors_origins == DEFAULT_CORS_ORIGINS


def test_cors_origins_come_from_environment(monkeypatch):
    monkeypatch.setenv("CREWSENSE_CORS_ORIGINS", "https://crewsense.vercel.app/, https://preview.example.com")
    assert load_settings().cors_origins == ("https://crewsense.vercel.app", "https://preview.example.com")


def test_cors_origin_without_scheme_is_rejected(monkeypatch):
    monkeypatch.setenv("CREWSENSE_CORS_ORIGINS", "crewsense.vercel.app")
    with pytest.raises(ValueError):
        load_settings()
