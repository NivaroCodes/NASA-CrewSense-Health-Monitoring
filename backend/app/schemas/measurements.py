"""Measurement request and response schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field

from app.schemas.common import ApiModel, UtcDatetime

SourceTypeInput = Literal["sensor_reading", "manual_input", "imported_examination"]
"""Source types a client may submit. Self-reported wellbeing is captured on scans only."""


class MeasurementInput(BaseModel):
    """One measurement as submitted by a client (also used inside a scan submission)."""

    model_config = ConfigDict(extra="forbid")

    metric_key: str = Field(min_length=1, max_length=64, examples=["diastolic_bp"])
    value: float = Field(allow_inf_nan=False, examples=[76])
    unit: str = Field(min_length=1, max_length=20, examples=["mmHg"])
    observed_at: AwareDatetime = Field(examples=["2026-11-13T07:05:00Z"])
    source_type: SourceTypeInput = Field(examples=["manual_input"])
    source_detail: str | None = Field(default=None, max_length=200, examples=["Manual cuff entry"])


class MeasurementCreate(MeasurementInput):
    """Body of POST /api/v1/measurements."""

    astronaut_id: int = Field(default=1, ge=1, examples=[1])


class MeasurementOut(ApiModel):
    id: int
    astronaut_id: int
    metric_key: str
    display_name: str
    category: str
    value: float
    unit: str
    observed_at: UtcDatetime
    recorded_at: UtcDatetime
    source_type: str
    source_detail: str | None
    validation_status: str
    validation_notes: str | None
    is_synthetic: bool


class MeasurementUsedOut(ApiModel):
    measurement_id: int
    metric_key: str
    value: float
    unit: str
    observed_at: UtcDatetime
    source_type: str
    is_synthetic: bool
