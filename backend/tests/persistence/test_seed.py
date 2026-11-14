"""Persistence tests. Require sqlalchemy; skipped otherwise (not executed in the authoring environment)."""

import pytest

pytest.importorskip("sqlalchemy")

from app.core.database import init_db, make_engine, make_session_factory  # noqa: E402
from app.domain.metrics import METRICS  # noqa: E402
from app.demo.mission_day_087 import MEASUREMENTS, PRIOR_SCANS  # noqa: E402
from app.models import HealthScan, Measurement, MetricDefinition  # noqa: E402
from app.services.demo_service import seed_demo_astronaut, seed_metric_definitions  # noqa: E402


@pytest.fixture()
def session(tmp_path):
    engine = make_engine(f"sqlite:///{tmp_path / 'seed.db'}")
    init_db(engine)
    factory = make_session_factory(engine)
    with factory() as s:
        yield s


def test_metric_definitions_seed_matches_catalogue(session):
    seed_metric_definitions(session)
    seed_metric_definitions(session)  # idempotent
    assert session.query(MetricDefinition).count() == len(METRICS)


def test_demo_seed_is_idempotent_and_synthetic(session):
    seed_metric_definitions(session)
    assert seed_demo_astronaut(session) is True
    assert seed_demo_astronaut(session) is False
    assert session.query(Measurement).count() == len(MEASUREMENTS)
    assert session.query(HealthScan).count() == len(PRIOR_SCANS)
    assert all(m.is_synthetic for m in session.query(Measurement).all())
    assert all(s.overall_status == "not_evaluated" for s in session.query(HealthScan).all())
