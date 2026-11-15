"""Stored measurements with provenance."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Measurement(Base):
    __tablename__ = "measurements"
    __table_args__ = (
        Index("ix_measurements_astronaut_metric_observed", "astronaut_id", "metric_key", "observed_at"),
        UniqueConstraint("astronaut_id", "metric_key", "observed_at", "value", name="uq_measurement_identity"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    astronaut_id: Mapped[int] = mapped_column(ForeignKey("astronauts.id"))
    metric_key: Mapped[str] = mapped_column(ForeignKey("metric_definitions.metric_key"))
    value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(20))
    observed_at: Mapped[datetime] = mapped_column(DateTime)
    recorded_at: Mapped[datetime] = mapped_column(DateTime)
    source_type: Mapped[str] = mapped_column(String(40))
    source_detail: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
    validation_status: Mapped[str] = mapped_column(String(40), default="valid")
    validation_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
