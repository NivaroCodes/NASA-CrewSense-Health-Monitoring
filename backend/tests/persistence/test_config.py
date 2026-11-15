import pytest

from app.core.config import (
    BACKEND_ROOT,
    DEFAULT_CORS_ORIGINS,
    ConfigurationError,
    load_settings,
    normalize_database_url,
)

_ENV_NAMES = (
    "CREWSENSE_ENV",
    "FLY_APP_NAME",
    "RAILWAY_ENVIRONMENT",
    "CREWSENSE_DATABASE_URL",
    "DATABASE_URL",
    "CREWSENSE_SEED_DEMO",
    "CREWSENSE_CORS_ORIGINS",
)


@pytest.fixture(autouse=True)
def clean_environment(monkeypatch):
    """Every test starts as a plain local process, whatever the developer's shell exports."""
    for name in _ENV_NAMES:
        monkeypatch.delenv(name, raising=False)


@pytest.fixture
def production(monkeypatch):
    monkeypatch.setenv("CREWSENSE_ENV", "production")


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


def test_cors_wildcard_is_rejected(monkeypatch):
    monkeypatch.setenv("CREWSENSE_CORS_ORIGINS", "*")
    with pytest.raises(ValueError):
        load_settings()


# --- Development defaults -------------------------------------------------------------------


def test_development_falls_back_to_local_sqlite():
    settings = load_settings()
    assert settings.database_url == f"sqlite:///{(BACKEND_ROOT / 'crewsense.db').as_posix()}"
    assert settings.seed_demo is True


def test_explicit_development_overrides_platform_detection(monkeypatch):
    monkeypatch.setenv("FLY_APP_NAME", "nasa-crewsense-health-monitoring")
    monkeypatch.setenv("CREWSENSE_ENV", "development")
    assert load_settings().database_url.startswith("sqlite:///")


def test_unknown_environment_name_is_rejected(monkeypatch):
    monkeypatch.setenv("CREWSENSE_ENV", "staging-ish")
    with pytest.raises(ConfigurationError, match="CREWSENSE_ENV"):
        load_settings()


# --- Production: no SQLite, fail fast -------------------------------------------------------


def test_production_without_database_url_fails_fast(production):
    with pytest.raises(ConfigurationError, match="DATABASE_URL is not set"):
        load_settings()


def test_production_with_blank_database_url_fails_fast(production, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "   ")
    with pytest.raises(ConfigurationError, match="DATABASE_URL is not set"):
        load_settings()


@pytest.mark.parametrize("platform_variable", ["FLY_APP_NAME", "RAILWAY_ENVIRONMENT"])
def test_hosting_platform_counts_as_production(monkeypatch, platform_variable):
    monkeypatch.setenv(platform_variable, "anything")
    with pytest.raises(ConfigurationError, match="DATABASE_URL is not set"):
        load_settings()


@pytest.mark.parametrize("variable", ["DATABASE_URL", "CREWSENSE_DATABASE_URL"])
def test_production_rejects_sqlite_url(production, monkeypatch, variable):
    monkeypatch.setenv(variable, "sqlite:////data/crewsense.db")
    with pytest.raises(ConfigurationError, match="SQLite"):
        load_settings()


def test_production_accepts_postgres_url(production, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgres://u:p@db.internal:5432/crewsense")
    assert load_settings().database_url == "postgresql+psycopg://u:p@db.internal:5432/crewsense"


def test_create_app_fails_fast_in_production_without_database_url(production):
    from app.main import create_app

    with pytest.raises(ConfigurationError, match="DATABASE_URL is not set"):
        create_app()


# --- Production: CORS and demo data ---------------------------------------------------------


def test_production_without_cors_origins_allows_no_origin(production, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgres://u@host/db")
    assert load_settings().cors_origins == ()


def test_production_uses_only_the_listed_cors_origins(production, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgres://u@host/db")
    monkeypatch.setenv("CREWSENSE_CORS_ORIGINS", "https://crewsense.vercel.app")
    assert load_settings().cors_origins == ("https://crewsense.vercel.app",)


def test_production_does_not_seed_demo_data_unless_asked(production, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgres://u@host/db")
    assert load_settings().seed_demo is False
    monkeypatch.setenv("CREWSENSE_SEED_DEMO", "true")
    assert load_settings().seed_demo is True


@pytest.mark.parametrize(
    "raw, expected",
    [("true", True), ("TRUE", True), ("1", True), ("yes", True), ("false", False), ("0", False), (" No ", False)],
)
def test_seed_demo_accepts_common_boolean_spellings(monkeypatch, raw, expected):
    monkeypatch.setenv("CREWSENSE_SEED_DEMO", raw)
    assert load_settings().seed_demo is expected


def test_seed_demo_rejects_unrecognised_value(monkeypatch):
    monkeypatch.setenv("CREWSENSE_SEED_DEMO", "maybe")
    with pytest.raises(ConfigurationError, match="CREWSENSE_SEED_DEMO"):
        load_settings()
