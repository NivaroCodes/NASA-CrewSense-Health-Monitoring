"""Alert construction: findings and explanation text (pure).

Explanations are template-based and always contain the numbers the rule used.
They describe a change from the astronaut's own history. They never name a
diagnosis, a treatment, or a cause.
"""

from __future__ import annotations

from datetime import datetime

from app.core.monitoring_config import (
    BASELINE_WINDOW_DAYS,
    EXERCISE_RECENT_WINDOW_DAYS,
    WELLBEING_BASELINE_WINDOW_DAYS,
    RuleSpec,
)
from app.domain.types import Category, MetricSpec, RuleFinding, Severity

_SELF_REPORT_LABELS: dict[str, tuple[str, str]] = {
    "mood_score": ("mood", "1–5 scale"),
    "stress_score": ("stress", "0–10 scale"),
}


def build_finding(
    rule: RuleSpec,
    *,
    metric: MetricSpec,
    latest_value: float,
    reference_value: float,
    change: float,
    measurement_ids: tuple[int, ...],
    baseline_key: str | None,
    observation_count: int,
    latest_observed_at: datetime,
    previous_observed_at: datetime | None = None,
) -> RuleFinding:
    """Create a RuleFinding for a rule that has fired, with its explanation text."""

    explanation = _explain(
        rule,
        metric=metric,
        latest_value=latest_value,
        reference_value=reference_value,
        change=change,
        observation_count=observation_count,
        latest_observed_at=latest_observed_at,
        previous_observed_at=previous_observed_at,
    )
    return RuleFinding(
        rule_id=rule.rule_id,
        category=Category(rule.category),
        severity=Severity(rule.severity),
        title=rule.title,
        metric_key=metric.metric_key,
        latest_value=latest_value,
        reference_value=reference_value,
        comparison=rule.comparison,
        change=round(change, 1),
        threshold=rule.threshold,
        unit=metric.canonical_unit,
        measurement_ids=measurement_ids,
        baseline_key=baseline_key,
        explanation=explanation,
    )


def _explain(
    rule: RuleSpec,
    *,
    metric: MetricSpec,
    latest_value: float,
    reference_value: float,
    change: float,
    observation_count: int,
    latest_observed_at: datetime,
    previous_observed_at: datetime | None,
) -> str:
    direction = "above" if change > 0 else "below"
    magnitude = f"{abs(change):.1f}"

    if rule.rule_id == "BM-EX-01":
        return (
            f"Recorded exercise over the last {EXERCISE_RECENT_WINDOW_DAYS} days totals "
            f"{latest_value:g} {metric.canonical_unit}. This is {magnitude}% {direction} the "
            f"median weekly total of {reference_value:g} {metric.canonical_unit} over the prior "
            f"{observation_count} weeks with data. "
            "Activity is not a measure of bone density or muscle mass."
        )

    if rule.rule_id == "IM-LYM-01":
        exam_date = latest_observed_at.date().isoformat()
        return (
            f"The imported examination of {exam_date} reports {latest_value:g} x 10^9/L, "
            f"{magnitude}% {direction} the previous imported examination of "
            f"{reference_value:g} x 10^9/L. This compares two examinations; it does not "
            "measure immune status."
        )

    if rule.rule_id == "BH-SLP-01":
        return (
            f"Self-reported sleep is {latest_value:g} h, {magnitude} h {direction} this "
            f"astronaut's median of {reference_value:g} h over the prior "
            f"{WELLBEING_BASELINE_WINDOW_DAYS} days ({observation_count} scans). Sleep is "
            "self-reported and not verified by a sensor."
        )

    if rule.rule_id in ("BH-MOOD-01", "BH-STRESS-01"):
        label, scale = _SELF_REPORT_LABELS[rule.metric_key]
        return (
            f"Self-reported {label} is {latest_value:g} on the {scale}, {magnitude} points "
            f"{direction} this astronaut's median of {reference_value:g} over the prior "
            f"{WELLBEING_BASELINE_WINDOW_DAYS} days ({observation_count} scans). Self-reported "
            "values are not verified by a sensor."
        )

    # Default: personal-baseline percentage comparison (cardiovascular rules).
    return (
        f"{metric.display_name} is {latest_value:g} {metric.canonical_unit} in the latest "
        f"fresh reading, {magnitude}% {direction} this astronaut's median of "
        f"{reference_value:g} {metric.canonical_unit} over the prior {BASELINE_WINDOW_DAYS} "
        f"days ({observation_count} observations). This describes a change from personal "
        "history, not a diagnosis."
    )
