"""Daily Health Scan persistence: scans, their measurement links, baselines and alerts."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Index, Integer, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

scan_measurements = Table(
    "scan_measurements",
    Base.metadata,
    Column("scan_id", ForeignKey("health_scans.id", ondelete="CASCADE"), primary_key=True),
    Column("measurement_id", ForeignKey("measurements.id"), primary_key=True),
)


class HealthScan(Base):
    __tablename__ = "health_scans"

    id: Mapped[int] = mapped_column(primary_key=True)
    astronaut_id: Mapped[int] = mapped_column(ForeignKey("astronauts.id"))
    submitted_at: Mapped[datetime] = mapped_column(DateTime)
    as_of: Mapped[datetime] = mapped_column(DateTime)
    mission_day: Mapped[int] = mapped_column(Integer)
    mood_score: Mapped[int] = mapped_column(Integer)
    stress_score: Mapped[int] = mapped_column(Integer)
    sleep_hours: Mapped[float] = mapped_column(Float)
    symptoms: Mapped[list[str]] = mapped_column(JSON, default=list)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    processing_status: Mapped[str] = mapped_column(String(20), default="completed")
    overall_status: Mapped[str] = mapped_column(String(20))
    summary: Mapped[dict] = mapped_column(JSON, default=dict)
    """Counts, problem-area summary, data notices, next steps and disclaimer for this scan."""


Index("ix_health_scans_astronaut_as_of", HealthScan.astronaut_id, HealthScan.as_of)


class Baseline(Base):
    __tablename__ = "baselines"

    id: Mapped[int] = mapped_column(primary_key=True)
    scan_id: Mapped[int] = mapped_column(ForeignKey("health_scans.id", ondelete="CASCADE"))
    astronaut_id: Mapped[int] = mapped_column(ForeignKey("astronauts.id"))
    metric_key: Mapped[str] = mapped_column(String(64))
    method: Mapped[str] = mapped_column(String(80))
    reference_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str] = mapped_column(String(20))
    observation_count: Mapped[int] = mapped_column(Integer)
    window_start: Mapped[datetime] = mapped_column(DateTime)
    window_end: Mapped[datetime] = mapped_column(DateTime)
    calculated_at: Mapped[datetime] = mapped_column(DateTime)


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True)
    scan_id: Mapped[int] = mapped_column(ForeignKey("health_scans.id", ondelete="CASCADE"))
    astronaut_id: Mapped[int] = mapped_column(ForeignKey("astronauts.id"))
    category: Mapped[str] = mapped_column(String(40))
    severity: Mapped[str] = mapped_column(String(20))
    rule_id: Mapped[str] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(String(200))
    explanation: Mapped[str] = mapped_column(Text)
    evidence: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime)
