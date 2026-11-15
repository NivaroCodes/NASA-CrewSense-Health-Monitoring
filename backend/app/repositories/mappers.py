"""Conversions between ORM rows and pure domain types."""

from __future__ import annotations

from app.core.database import from_db_utc
from app.domain.types import Observation, SourceType, ValidationStatus, WellbeingRecord
from app.models import HealthScan, Measurement


def to_observation(row: Measurement) -> Observation:
    return Observation(
        measurement_id=row.id,
        metric_key=row.metric_key,
        value=row.value,
        unit=row.unit,
        observed_at=from_db_utc(row.observed_at),
        source_type=SourceType(row.source_type),
        source_detail=row.source_detail,
        is_synthetic=row.is_synthetic,
        validation_status=ValidationStatus(row.validation_status),
    )


def to_wellbeing(row: HealthScan) -> WellbeingRecord:
    return WellbeingRecord(
        scan_id=row.id,
        as_of=from_db_utc(row.as_of),
        mood_score=row.mood_score,
        stress_score=row.stress_score,
        sleep_hours=row.sleep_hours,
        symptoms=tuple(row.symptoms or ()),
    )
