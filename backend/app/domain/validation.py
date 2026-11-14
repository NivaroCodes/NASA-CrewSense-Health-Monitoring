"""Input validation for measurements (pure, no I/O).

Returns a list of field issues. An empty list means the input is accepted.
Callers decide how to report issues (the API returns HTTP 422).
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta

from app.core.monitoring_config import FUTURE_TOLERANCE_MINUTES
from app.domain.errors import FieldIssue
from app.domain.types import MetricSpec, SourceType


def validate_measurement_input(
    *,
    spec: MetricSpec,
    value: float,
    unit: str,
    observed_at: datetime,
    source_type: SourceType,
    now: datetime,
    field_prefix: str = "",
) -> list[FieldIssue]:
    """Check one measurement against its metric definition.

    `observed_at` must be timezone-aware. `now` is the server reference time.
    `field_prefix` (e.g. "new_measurements[2].") is prepended to field names so
    that nested errors point at the right place in the request body.
    """

    issues: list[FieldIssue] = []
    prefix = field_prefix

    if not math.isfinite(value):
        issues.append(FieldIssue(f"{prefix}value", "Value must be a finite number."))
    elif not (spec.plausible_min <= value <= spec.plausible_max):
        issues.append(
            FieldIssue(
                f"{prefix}value",
                (
                    f"Value {_fmt(value)} is outside the plausibility bounds "
                    f"{_fmt(spec.plausible_min)}–{_fmt(spec.plausible_max)} "
                    f"for {spec.metric_key} ({spec.canonical_unit})."
                ),
            )
        )

    if unit != spec.canonical_unit:
        issues.append(
            FieldIssue(
                f"{prefix}unit",
                (
                    f"Unit '{unit}' is not accepted for {spec.metric_key}. "
                    f"Expected '{spec.canonical_unit}'."
                ),
            )
        )

    if observed_at.tzinfo is None:
        issues.append(FieldIssue(f"{prefix}observed_at", "Timestamp must include a timezone offset."))
    elif observed_at > now + timedelta(minutes=FUTURE_TOLERANCE_MINUTES):
        issues.append(
            FieldIssue(
                f"{prefix}observed_at",
                "Timestamp is in the future beyond the allowed clock tolerance.",
            )
        )

    if source_type not in spec.allowed_source_types:
        allowed = ", ".join(sorted(s.value for s in spec.allowed_source_types))
        issues.append(
            FieldIssue(
                f"{prefix}source_type",
                (
                    f"Source '{source_type.value}' is not allowed for {spec.metric_key}. "
                    f"Allowed: {allowed}."
                ),
            )
        )

    return issues


def _fmt(number: float) -> str:
    return f"{number:g}"
