"""Metric definitions, seeded from the domain catalogue."""

from __future__ import annotations

from sqlalchemy import JSON, Boolean, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MetricDefinition(Base):
    __tablename__ = "metric_definitions"

    metric_key: Mapped[str] = mapped_column(String(64), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(40))
    canonical_unit: Mapped[str] = mapped_column(String(20))
    description: Mapped[str] = mapped_column(Text)
    plausible_min: Mapped[float] = mapped_column(Float)
    plausible_max: Mapped[float] = mapped_column(Float)
    freshness_hours: Mapped[float] = mapped_column(Float)
    allowed_source_types: Mapped[list[str]] = mapped_column(JSON)
    daily_expected: Mapped[bool] = mapped_column(Boolean, default=False)
