"""Test factories: build domain objects from literal data (no randomness, no clock)."""

from __future__ import annotations

from datetime import datetime, timezone

from app.demo.mission_day_087 import DEMO_AS_OF, MEASUREMENTS, PRIOR_SCANS
from app.domain.metrics import METRICS_BY_KEY
from app.domain.types import Observation, SourceType, WellbeingRecord

UTC = timezone.utc


def ts(text: str) -> datetime:
    return datetime.fromisoformat(text.replace("Z", "+00:00"))


def obs(
    measurement_id: int,
    metric_key: str,
    value: float,
    observed_at: str,
    source_type: str | None = None,
) -> Observation:
    spec = METRICS_BY_KEY[metric_key]
    if source_type is None:
        source_type = "imported_examination" if metric_key == "lymphocyte_count" else "sensor_reading"
    return Observation(
        measurement_id=measurement_id,
        metric_key=metric_key,
        value=float(value),
        unit=spec.canonical_unit,
        observed_at=ts(observed_at),
        source_type=SourceType(source_type),
        source_detail="test",
        is_synthetic=True,
    )


def wellbeing(as_of: str, mood: int, stress: int, sleep: float, scan_id: int | None = None) -> WellbeingRecord:
    return WellbeingRecord(
        scan_id=scan_id,
        as_of=ts(as_of),
        mood_score=mood,
        stress_score=stress,
        sleep_hours=sleep,
        symptoms=(),
    )


def demo_observations() -> list[Observation]:
    """The Mission Day 087 measurements as domain observations, with sequential ids."""
    result: list[Observation] = []
    for index, record in enumerate(MEASUREMENTS, start=1):
        result.append(
            obs(
                index,
                str(record["metric_key"]),
                float(record["value"]),  # type: ignore[arg-type]
                str(record["observed_at"]),
                str(record["source_type"]),
            )
        )
    return result


def demo_prior_wellbeing() -> list[WellbeingRecord]:
    return [
        wellbeing(
            str(s["as_of"]),
            int(s["mood_score"]),  # type: ignore[arg-type]
            int(s["stress_score"]),  # type: ignore[arg-type]
            float(s["sleep_hours"]),  # type: ignore[arg-type]
        )
        for s in PRIOR_SCANS
    ]


def demo_as_of() -> datetime:
    return ts(DEMO_AS_OF)
