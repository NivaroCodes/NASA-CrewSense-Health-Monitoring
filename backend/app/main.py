"""Application factory and ASGI entry point.

Run locally (from the backend folder):
    uvicorn app.main:create_app --factory --reload
Swagger UI: http://127.0.0.1:8000/docs
"""

from __future__ import annotations

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import register_error_handlers
from app.api.routes import alerts, dashboard, health, measurements, metrics, scans
from app.core.config import API_PREFIX, API_VERSION, Settings, load_settings
from app.core.database import ensure_migrated, init_db, make_engine, make_session_factory
from app.services.demo_service import seed_demo_astronaut, seed_metric_definitions


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()
    engine = make_engine(settings.database_url)
    if engine.dialect.name == "sqlite":
        # Local development and tests. PostgreSQL schemas come only from Alembic migrations.
        init_db(engine)
    else:
        ensure_migrated(engine)
    session_factory = make_session_factory(engine)

    with session_factory() as session:
        seed_metric_definitions(session)
        if settings.seed_demo:
            seed_demo_astronaut(session)

    app = FastAPI(
        title="CrewSense Backend",
        version=API_VERSION,
        summary="Astronaut health monitoring and decision-support prototype (non-clinical).",
        description=(
            "Unified dashboard, Daily Health Scan, measurements with provenance, "
            "personal-baseline monitoring, and explainable alerts. Prototype heuristics "
            "only; not a medical device and not a diagnostic tool."
        ),
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
    app.state.engine = engine
    app.state.session_factory = session_factory
    register_error_handlers(app)

    api = APIRouter(prefix=API_PREFIX)
    api.include_router(health.router)
    api.include_router(metrics.router)
    api.include_router(dashboard.router)
    api.include_router(measurements.router)
    api.include_router(scans.router)
    api.include_router(alerts.router)
    app.include_router(api)
    return app
