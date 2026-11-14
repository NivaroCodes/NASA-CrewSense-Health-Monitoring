"""Dashboard response schema (read-only, evaluated live at as_of)."""

from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import ApiModel, UtcDatetime
from app.schemas.scans import Symptom


class AstronautOut(BaseModel):
    id: int
    display_id: str
    display_name: str
    mission_name: str
    is_synthetic: bool


class MissionOut(BaseModel):
    mission_day: int
    mission_start_date: date


class LastScanOut(BaseModel):
    id: int
    as_of: UtcDatetime
    mission_day: int
    submitted_at: UtcDatetime


class WellbeingStatusOut(BaseModel):
    source_type: Literal["self_reported"] = "self_reported"
    as_of: UtcDatetime | None
    required_today: bool
    mood_score: int | None
    stress_score: int | None
    sleep_hours: float | None
    symptoms: list[Symptom] = Field(default_factory=list)


class ProblemAreaOut(BaseModel):
    area: str
    label: str
    status: str
    alert_count: int
    indicator_keys: list[str]


class LatestMeasurementOut(BaseModel):
    measurement_id: int
    value: float
    unit: str
    observed_at: UtcDatetime
    source_type: str
    source_detail: str | None
    validation_status: str
    is_synthetic: bool


class BaselineSnapshotOut(BaseModel):
    baseline_id: int | None
    method: str
    reference_value: float
    unit: str
    observation_count: int
    window_start: UtcDatetime
    window_end: UtcDatetime


class IndicatorOut(BaseModel):
    metric_key: str
    display_name: str
    category: str
    problem_area: str
    latest: LatestMeasurementOut | None
    freshness: Literal["current", "outdated", "missing"]
    age_hours: float | None
    freshness_window_hours: float
    compared_value: float | None
    baseline: BaselineSnapshotOut | None
    change_pct: float | None
    status: Literal["rule_fired", "no_rule_fired", "not_evaluated", "missing", "outdated"]
    rule_ids: list[str]
    note: str | None


class LiveAlertOut(BaseModel):
    """A rule that fires at the dashboard reference time. Not persisted, so it has no id."""

    rule_id: str
    category: str
    severity: str
    title: str
    metric_key: str


class ScanRequirementOut(BaseModel):
    metric_key: str
    display_name: str
    unit: str
    reason: Literal["missing", "outdated"]
    allowed_source_types: list[str]


class DataNoticeOut(BaseModel):
    id: str
    metric_key: str | None
    message: str


class DashboardOut(ApiModel):
    generated_at: UtcDatetime
    as_of: UtcDatetime
    astronaut: AstronautOut
    mission: MissionOut
    last_scan: LastScanOut | None
    wellbeing: WellbeingStatusOut
    problem_areas: list[ProblemAreaOut]
    indicators: list[IndicatorOut]
    alerts: list[LiveAlertOut]
    scan_requirements: list[ScanRequirementOut]
    data_notices: list[DataNoticeOut]
    disclaimer: str
