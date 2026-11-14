"""Canonical metric catalogue.

This is the only place where metric keys, canonical units and plausibility
bounds are defined. The database seeds its metric_definitions table from this
tuple, and the API serves it from there.

plausible_min / plausible_max are INPUT PLAUSIBILITY bounds (is the recorded
value physically possible?). They are not clinical reference ranges.
"""

from __future__ import annotations

from app.domain.types import Category, MetricSpec, SourceType

_SENSOR_OR_MANUAL = frozenset({SourceType.SENSOR_READING, SourceType.MANUAL_INPUT})

METRICS: tuple[MetricSpec, ...] = (
    MetricSpec(
        metric_key="heart_rate",
        display_name="Heart rate",
        category=Category.CARDIOVASCULAR,
        canonical_unit="bpm",
        plausible_min=20,
        plausible_max=250,
        freshness_hours=24,
        allowed_source_types=_SENSOR_OR_MANUAL,
        description="Beats per minute from a sensor reading or a manual count.",
        daily_expected=True,
    ),
    MetricSpec(
        metric_key="systolic_bp",
        display_name="Systolic blood pressure",
        category=Category.CARDIOVASCULAR,
        canonical_unit="mmHg",
        plausible_min=60,
        plausible_max=260,
        freshness_hours=72,
        allowed_source_types=_SENSOR_OR_MANUAL,
        description="Upper blood pressure value from a cuff measurement.",
        daily_expected=True,
    ),
    MetricSpec(
        metric_key="diastolic_bp",
        display_name="Diastolic blood pressure",
        category=Category.CARDIOVASCULAR,
        canonical_unit="mmHg",
        plausible_min=30,
        plausible_max=180,
        freshness_hours=72,
        allowed_source_types=_SENSOR_OR_MANUAL,
        description="Lower blood pressure value from a cuff measurement.",
        daily_expected=True,
    ),
    MetricSpec(
        metric_key="exercise_duration",
        display_name="Exercise duration",
        category=Category.BONE_MUSCLE,
        canonical_unit="min",
        plausible_min=0,
        plausible_max=1440,
        freshness_hours=48,
        allowed_source_types=_SENSOR_OR_MANUAL,
        description=(
            "Minutes of recorded physical activity. Activity is not a measure "
            "of bone density or muscle mass."
        ),
        daily_expected=True,
    ),
    MetricSpec(
        metric_key="lymphocyte_count",
        display_name="Lymphocyte count",
        category=Category.IMMUNE,
        canonical_unit="10^9/L",
        plausible_min=0,
        plausible_max=20,
        freshness_hours=4320,
        allowed_source_types=frozenset({SourceType.IMPORTED_EXAMINATION}),
        description=(
            "Lymphocyte count from an imported laboratory examination. The app "
            "does not measure immune status directly."
        ),
        daily_expected=False,
    ),
)

METRICS_BY_KEY: dict[str, MetricSpec] = {metric.metric_key: metric for metric in METRICS}

_SELF_REPORTED = frozenset({SourceType.SELF_REPORTED})

WELLBEING_METRICS: dict[str, MetricSpec] = {
    "mood_score": MetricSpec(
        metric_key="mood_score",
        display_name="Mood (self-reported)",
        category=Category.BEHAVIORAL,
        canonical_unit="points",
        plausible_min=1,
        plausible_max=5,
        freshness_hours=24,
        allowed_source_types=_SELF_REPORTED,
        description="Daily self-reported mood on a 1–5 scale.",
        daily_expected=True,
    ),
    "stress_score": MetricSpec(
        metric_key="stress_score",
        display_name="Stress (self-reported)",
        category=Category.BEHAVIORAL,
        canonical_unit="points",
        plausible_min=0,
        plausible_max=10,
        freshness_hours=24,
        allowed_source_types=_SELF_REPORTED,
        description="Daily self-reported stress on a 0–10 scale.",
        daily_expected=True,
    ),
    "sleep_hours": MetricSpec(
        metric_key="sleep_hours",
        display_name="Sleep (self-reported)",
        category=Category.BEHAVIORAL,
        canonical_unit="h",
        plausible_min=0,
        plausible_max=24,
        freshness_hours=24,
        allowed_source_types=_SELF_REPORTED,
        description="Self-reported hours of sleep in the previous night.",
        daily_expected=True,
    ),
}
