"""Plain domain types shared by the pure analysis modules.

These dataclasses carry no FastAPI, Pydantic or SQLAlchemy dependency. The
persistence layer converts ORM rows into these types, and the schema layer
converts them into API responses.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum


class SourceType(StrEnum):
    SENSOR_READING = "sensor_reading"
    MANUAL_INPUT = "manual_input"
    IMPORTED_EXAMINATION = "imported_examination"
    SELF_REPORTED = "self_reported"


class ValidationStatus(StrEnum):
    VALID = "valid"
    # Reserved for a future soft-plausibility band. Not produced in v1.
    PLAUSIBILITY_WARNING = "plausibility_warning"


class Category(StrEnum):
    CARDIOVASCULAR = "cardiovascular"
    BONE_MUSCLE = "bone_muscle"
    IMMUNE = "immune"
    BEHAVIORAL = "behavioral"
    NUTRITION = "nutrition"
    ENVIRONMENTAL = "environmental"


class Severity(StrEnum):
    INFO = "info"
    ATTENTION = "attention"


class Freshness(StrEnum):
    CURRENT = "current"
    OUTDATED = "outdated"
    MISSING = "missing"


class IndicatorStatus(StrEnum):
    RULE_FIRED = "rule_fired"
    NO_RULE_FIRED = "no_rule_fired"
    NOT_EVALUATED = "not_evaluated"
    MISSING = "missing"
    OUTDATED = "outdated"


class AreaStatus(StrEnum):
    ATTENTION = "attention"
    INFO = "info"
    NO_ALERTS = "no_alerts"
    NOT_EVALUATED = "not_evaluated"


class NoticeId(StrEnum):
    MISSING = "DQ-MISSING-01"
    OUTDATED = "DQ-OUTDATED-01"
    BASELINE = "DQ-BASELINE-01"
    PLAUSIBILITY = "DQ-PLAUSIBILITY-01"


@dataclass(frozen=True)
class MetricSpec:
    metric_key: str
    display_name: str
    category: Category
    canonical_unit: str
    plausible_min: float
    plausible_max: float
    freshness_hours: float
    allowed_source_types: frozenset[SourceType]
    description: str
    daily_expected: bool = False
    """True when the metric is normally recorded every day (drives missing-data notices)."""


@dataclass(frozen=True)
class Observation:
    """One stored measurement, as seen by the analysis."""

    measurement_id: int
    metric_key: str
    value: float
    unit: str
    observed_at: datetime
    source_type: SourceType
    source_detail: str | None
    is_synthetic: bool
    validation_status: ValidationStatus = ValidationStatus.VALID


@dataclass(frozen=True)
class WellbeingRecord:
    """Self-reported wellbeing captured on a scan."""

    scan_id: int | None
    as_of: datetime
    mood_score: int
    stress_score: int
    sleep_hours: float
    symptoms: tuple[str, ...] = ()


@dataclass(frozen=True)
class Baseline:
    method: str
    metric_key: str
    reference_value: float | None
    unit: str
    observation_count: int
    window_start: datetime
    window_end: datetime


@dataclass(frozen=True)
class IndicatorResult:
    metric_key: str
    spec: MetricSpec
    latest: Observation | None
    freshness: Freshness
    age_hours: float | None
    compared_value: float | None
    """The value a rule actually compared. Equals the latest value except for exercise,
    where it is the trailing 7-day total."""
    baseline: Baseline | None
    change_pct: float | None
    status: IndicatorStatus
    rule_ids: tuple[str, ...] = ()
    note: str | None = None


@dataclass(frozen=True)
class RuleFinding:
    rule_id: str
    category: Category
    severity: Severity
    title: str
    metric_key: str
    latest_value: float
    reference_value: float
    comparison: str
    change: float
    threshold: float
    unit: str
    measurement_ids: tuple[int, ...]
    baseline_key: str | None
    """Key into Evaluation.baselines identifying the baseline used (metric key or wellbeing field).
    None when the comparison is against another examination rather than a baseline."""
    explanation: str = ""


@dataclass(frozen=True)
class DataNotice:
    notice_id: NoticeId
    metric_key: str | None
    message: str


@dataclass(frozen=True)
class DataRequirement:
    metric_key: str
    reason: Freshness
    """MISSING or OUTDATED."""


@dataclass(frozen=True)
class AreaSummary:
    area: Category
    status: AreaStatus
    alert_count: int
    indicator_keys: tuple[str, ...]


@dataclass(frozen=True)
class Evaluation:
    """Complete, deterministic result of one analysis pass at a reference time."""

    as_of: datetime
    indicators: tuple[IndicatorResult, ...]
    findings: tuple[RuleFinding, ...]
    notices: tuple[DataNotice, ...]
    requirements: tuple[DataRequirement, ...]
    baselines: dict[str, Baseline] = field(default_factory=dict)
    evaluated_rule_ids: frozenset[str] = frozenset()
    areas: tuple[AreaSummary, ...] = ()
    overall_status: AreaStatus = AreaStatus.NOT_EVALUATED
