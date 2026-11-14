"""Daily Health Scan request and response schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator

from app.core.monitoring_config import MAX_NEW_MEASUREMENTS_PER_SCAN
from app.schemas.common import ApiModel, UtcDatetime
from app.schemas.measurements import MeasurementInput, MeasurementUsedOut

Symptom = Literal[
    "headache",
    "dizziness",
    "nausea",
    "fatigue",
    "muscle_soreness",
    "joint_pain",
    "sleep_disturbance",
    "other",
]


class WellbeingInput(BaseModel):
    """Short self-reported wellbeing assessment. Not a sensor measurement."""

    model_config = ConfigDict(extra="forbid")

    mood_score: int = Field(ge=1, le=5, examples=[3])
    stress_score: int = Field(ge=0, le=10, examples=[6])
    sleep_hours: float = Field(ge=0, le=24, allow_inf_nan=False, examples=[5.2])
    symptoms: list[Symptom] = Field(default_factory=list, examples=[["fatigue"]])
    notes: str | None = Field(default=None, max_length=500)

    @field_validator("symptoms")
    @classmethod
    def _symptoms_unique(cls, value: list[str]) -> list[str]:
        if len(set(value)) != len(value):
            raise ValueError("Symptoms must be unique.")
        return value


class ScanCreate(BaseModel):
    """Body of POST /api/v1/scans."""

    model_config = ConfigDict(extra="forbid")

    astronaut_id: int = Field(default=1, ge=1, examples=[1])
    as_of: AwareDatetime | None = Field(
        default=None,
        description="Reference time for freshness and baselines. Defaults to server time.",
        examples=["2026-11-13T07:30:00Z"],
    )
    wellbeing: WellbeingInput
    new_measurements: list[MeasurementInput] = Field(
        default_factory=list,
        max_length=MAX_NEW_MEASUREMENTS_PER_SCAN,
    )


class WellbeingOut(ApiModel):
    source_type: Literal["self_reported"] = "self_reported"
    mood_score: int
    stress_score: int
    sleep_hours: float
    symptoms: list[str]
    notes: str | None


class BaselineOut(ApiModel):
    baseline_id: int | None
    metric_key: str
    method: str
    reference_value: float | None
    unit: str
    observation_count: int
    window_start: UtcDatetime
    window_end: UtcDatetime


class EvidenceValues(BaseModel):
    latest: float
    reference: float | None
    change: float
    change_unit: Literal["percent", "absolute"]
    threshold: float


class EvidenceOut(BaseModel):
    measurement_ids: list[int]
    baseline_id: int | None
    values: EvidenceValues


class AlertOut(ApiModel):
    id: int | None
    scan_id: int | None = None
    category: str
    severity: str
    rule_id: str
    title: str
    explanation: str
    evidence: EvidenceOut
    created_at: UtcDatetime | None = None


class DataNoticeOut(BaseModel):
    id: str
    metric_key: str | None
    message: str


class ProblemAreaSummaryOut(BaseModel):
    area: str
    status: str
    alert_count: int


class ScanSummaryCounts(BaseModel):
    alerts_attention: int
    alerts_info: int
    data_notices: int


class ScanSummaryOut(BaseModel):
    overall_status: str
    counts: ScanSummaryCounts
    problem_areas: list[ProblemAreaSummaryOut]


class NextStepOut(BaseModel):
    priority: int
    text: str
    related_rule_ids: list[str] = Field(default_factory=list)
    related_notice_ids: list[str] = Field(default_factory=list)


class ScanOut(ApiModel):
    """Full scan result. Returned by POST /scans and GET /scans/{scan_id}."""

    id: int
    astronaut_id: int
    submitted_at: UtcDatetime
    as_of: UtcDatetime
    mission_day: int
    processing_status: Literal["completed"]
    wellbeing: WellbeingOut
    measurements_used: list[MeasurementUsedOut]
    baselines: list[BaselineOut]
    alerts: list[AlertOut]
    data_notices: list[DataNoticeOut]
    summary: ScanSummaryOut
    next_steps: list[NextStepOut]
    disclaimer: str


class ScanListItem(ApiModel):
    id: int
    as_of: UtcDatetime
    mission_day: int
    submitted_at: UtcDatetime
    processing_status: str
    overall_status: str
    alert_count: int
