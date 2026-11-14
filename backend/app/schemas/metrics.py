"""Metric catalogue response schema."""

from __future__ import annotations

from pydantic import BaseModel


class MetricOut(BaseModel):
    metric_key: str
    display_name: str
    category: str
    canonical_unit: str
    description: str
    plausible_min: float
    plausible_max: float
    freshness_hours: float
    allowed_source_types: list[str]
