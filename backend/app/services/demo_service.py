"""Deterministic demo seeding (Mission Day 087). Idempotent: seeds only once."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.core.database import to_db_utc
from app.demo.mission_day_087 import DEMO_IDENTITY, MEASUREMENTS, PRIOR_SCANS
from app.domain.metrics import METRICS, METRICS_BY_KEY
from app.domain.mission import mission_day
from app.domain.recommendations import DISCLAIMER
from app.models import Astronaut, HealthScan, Measurement, MetricDefinition
from app.repositories import astronauts as astronaut_repo


def seed_metric_definitions(session: Session) -> None:
    """Insert any missing metric definitions from the domain catalogue."""
    existing = {row.metric_key for row in session.query(MetricDefinition).all()}
    for spec in METRICS:
        if spec.metric_key in existing:
            continue
        session.add(
            MetricDefinition(
                metric_key=spec.metric_key,
                display_name=spec.display_name,
                category=spec.category.value,
                canonical_unit=spec.canonical_unit,
                description=spec.description,
                plausible_min=spec.plausible_min,
                plausible_max=spec.plausible_max,
                freshness_hours=spec.freshness_hours,
                allowed_source_types=sorted(s.value for s in spec.allowed_source_types),
                daily_expected=spec.daily_expected,
            )
        )
    session.commit()


def seed_demo_astronaut(session: Session) -> bool:
    """Create the demo astronaut with its synthetic history. Returns False if already present."""
    if astronaut_repo.get_by_display_id(session, str(DEMO_IDENTITY["display_id"])) is not None:
        return False

    astronaut = Astronaut(**DEMO_IDENTITY)
    session.add(astronaut)
    session.flush()

    for record in MEASUREMENTS:
        metric_key = str(record["metric_key"])
        observed_at = datetime.fromisoformat(str(record["observed_at"]))
        session.add(
            Measurement(
                astronaut_id=astronaut.id,
                metric_key=metric_key,
                value=float(record["value"]),
                unit=METRICS_BY_KEY[metric_key].canonical_unit,
                observed_at=to_db_utc(observed_at),
                recorded_at=to_db_utc(observed_at),
                source_type=str(record["source_type"]),
                source_detail=str(record["source_detail"]),
                is_synthetic=True,
                validation_status="valid",
                validation_notes=None,
            )
        )

    for record in PRIOR_SCANS:
        as_of = datetime.fromisoformat(str(record["as_of"]))
        session.add(
            HealthScan(
                astronaut_id=astronaut.id,
                submitted_at=to_db_utc(as_of),
                as_of=to_db_utc(as_of),
                mission_day=mission_day(astronaut.mission_start_date, as_of),
                mood_score=int(record["mood_score"]),
                stress_score=int(record["stress_score"]),
                sleep_hours=float(record["sleep_hours"]),
                symptoms=list(record["symptoms"]),  # type: ignore[arg-type]
                notes=None,
                processing_status="completed",
                overall_status="not_evaluated",
                summary={
                    "counts": {"alerts_attention": 0, "alerts_info": 0, "data_notices": 0},
                    "problem_areas": [],
                    "data_notices": [],
                    "next_steps": [],
                    "disclaimer": DISCLAIMER,
                    "note": "Seeded wellbeing history for the demo. Analysis was not replayed.",
                },
            )
        )

    session.commit()
    return True
