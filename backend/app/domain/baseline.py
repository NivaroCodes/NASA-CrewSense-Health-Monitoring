"""Personal baseline calculations (pure, deterministic).

A baseline always belongs to one astronaut, one metric and one unit. The
value being judged is excluded from its own baseline, so a current reading
is never compared with a median that already contains it.
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime, timedelta
from statistics import median

from app.core.monitoring_config import (
    BASELINE_MIN_OBSERVATIONS,
    BASELINE_WINDOW_DAYS,
    EXERCISE_BASELINE_WEEKS,
    EXERCISE_MIN_WEEKS_WITH_DATA,
    EXERCISE_RECENT_WINDOW_DAYS,
    WELLBEING_BASELINE_WINDOW_DAYS,
    WELLBEING_MIN_SCANS,
)
from app.domain.types import Baseline, Observation, ValidationStatus, WellbeingRecord

METHOD_OBSERVATIONS = f"median_prior_observations_{BASELINE_WINDOW_DAYS}d_v1"
METHOD_WEEKLY_TOTALS = f"median_prior_weekly_totals_{EXERCISE_BASELINE_WEEKS}w_v1"
METHOD_WELLBEING = f"median_prior_scans_{WELLBEING_BASELINE_WINDOW_DAYS}d_v1"


def median_observation_baseline(
    *,
    metric_key: str,
    unit: str,
    observations: Sequence[Observation],
    as_of: datetime,
    exclude_measurement_id: int | None,
) -> Baseline:
    """Median of valid prior observations in the trailing window.

    Only observations strictly before `as_of` and inside the window count.
    The measurement being judged (`exclude_measurement_id`) is never included.
    """

    window_start = as_of - timedelta(days=BASELINE_WINDOW_DAYS)
    values = [
        obs.value
        for obs in observations
        if obs.metric_key == metric_key
        and obs.measurement_id != exclude_measurement_id
        and obs.validation_status is ValidationStatus.VALID
        and window_start <= obs.observed_at < as_of
    ]
    reference = _reference_or_none(values, BASELINE_MIN_OBSERVATIONS)
    return Baseline(
        method=METHOD_OBSERVATIONS,
        metric_key=metric_key,
        reference_value=reference,
        unit=unit,
        observation_count=len(values),
        window_start=window_start,
        window_end=as_of,
    )


def weekly_exercise_baseline(
    *,
    unit: str,
    observations: Sequence[Observation],
    as_of: datetime,
    metric_key: str = "exercise_duration",
) -> Baseline:
    """Median of weekly exercise totals for the weeks before the recent window.

    Week k covers [as_of - 7(k+1) days, as_of - 7k days) for k = 1..EXERCISE_BASELINE_WEEKS.
    A week with no entries is treated as "no data", not as zero minutes, so
    missing activity is never counted as inactivity.
    """

    recent_start = as_of - timedelta(days=EXERCISE_RECENT_WINDOW_DAYS)
    weekly_totals: list[float] = []
    for week in range(1, EXERCISE_BASELINE_WEEKS + 1):
        end = as_of - timedelta(days=EXERCISE_RECENT_WINDOW_DAYS * week)
        start = as_of - timedelta(days=EXERCISE_RECENT_WINDOW_DAYS * (week + 1))
        entries = [
            obs.value
            for obs in observations
            if obs.metric_key == metric_key
            and obs.validation_status is ValidationStatus.VALID
            and start <= obs.observed_at < end
        ]
        if entries:
            weekly_totals.append(float(sum(entries)))

    reference = _reference_or_none(weekly_totals, EXERCISE_MIN_WEEKS_WITH_DATA)
    return Baseline(
        method=METHOD_WEEKLY_TOTALS,
        metric_key=metric_key,
        reference_value=reference,
        unit=unit,
        observation_count=len(weekly_totals),
        window_start=as_of - timedelta(days=EXERCISE_RECENT_WINDOW_DAYS * (EXERCISE_BASELINE_WEEKS + 1)),
        window_end=recent_start,
    )


def wellbeing_baseline(
    *,
    field_name: str,
    unit: str,
    prior_scans: Sequence[WellbeingRecord],
    as_of: datetime,
) -> Baseline:
    """Median of a self-reported wellbeing field over prior scans in the window.

    `prior_scans` must already exclude the scan being judged. Only scans
    strictly before `as_of` are used.
    """

    window_start = as_of - timedelta(days=WELLBEING_BASELINE_WINDOW_DAYS)
    values = [
        float(getattr(scan, field_name))
        for scan in prior_scans
        if window_start <= scan.as_of < as_of
    ]
    reference = _reference_or_none(values, WELLBEING_MIN_SCANS)
    return Baseline(
        method=METHOD_WELLBEING,
        metric_key=field_name,
        reference_value=reference,
        unit=unit,
        observation_count=len(values),
        window_start=window_start,
        window_end=as_of,
    )


def _reference_or_none(values: Sequence[float], minimum: int) -> float | None:
    if len(values) < minimum:
        return None
    return float(median(values))
