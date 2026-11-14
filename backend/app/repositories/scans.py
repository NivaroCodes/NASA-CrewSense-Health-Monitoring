"""Scan, baseline, alert and wellbeing-history persistence and queries."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import to_db_utc
from app.models import Alert, Baseline, HealthScan, scan_measurements


def get_scan(session: Session, scan_id: int) -> HealthScan | None:
    return session.get(HealthScan, scan_id)


def last_scan_at_or_before(session: Session, *, astronaut_id: int, as_of: datetime) -> HealthScan | None:
    return session.scalar(
        select(HealthScan)
        .where(HealthScan.astronaut_id == astronaut_id, HealthScan.as_of <= to_db_utc(as_of))
        .order_by(HealthScan.as_of.desc(), HealthScan.id.desc())
        .limit(1)
    )


def prior_scans_before(session: Session, *, astronaut_id: int, before: datetime) -> list[HealthScan]:
    return list(
        session.scalars(
            select(HealthScan)
            .where(HealthScan.astronaut_id == astronaut_id, HealthScan.as_of < to_db_utc(before))
            .order_by(HealthScan.as_of, HealthScan.id)
        )
    )


def list_scans(session: Session, *, astronaut_id: int, limit: int, offset: int) -> tuple[list[HealthScan], int]:
    base = select(HealthScan).where(HealthScan.astronaut_id == astronaut_id)
    total = session.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = session.scalars(
        base.order_by(HealthScan.as_of.desc(), HealthScan.id.desc()).limit(limit).offset(offset)
    )
    return list(rows), int(total)


def measurement_ids_for_scan(session: Session, scan_id: int) -> list[int]:
    return list(
        session.scalars(
            select(scan_measurements.c.measurement_id)
            .where(scan_measurements.c.scan_id == scan_id)
            .order_by(scan_measurements.c.measurement_id)
        )
    )


def baselines_for_scan(session: Session, scan_id: int) -> list[Baseline]:
    return list(session.scalars(select(Baseline).where(Baseline.scan_id == scan_id).order_by(Baseline.id)))


def alerts_for_scan(session: Session, scan_id: int) -> list[Alert]:
    return list(session.scalars(select(Alert).where(Alert.scan_id == scan_id).order_by(Alert.id)))


def count_alerts_for_scan(session: Session, scan_id: int) -> int:
    return int(session.scalar(select(func.count()).select_from(Alert).where(Alert.scan_id == scan_id)) or 0)


def list_alerts(
    session: Session,
    *,
    astronaut_id: int,
    scan_id: int | None,
    category: str | None,
    severity: str | None,
    limit: int,
    offset: int,
) -> tuple[list[Alert], int]:
    statement = select(Alert).where(Alert.astronaut_id == astronaut_id)
    if scan_id is not None:
        statement = statement.where(Alert.scan_id == scan_id)
    if category is not None:
        statement = statement.where(Alert.category == category)
    if severity is not None:
        statement = statement.where(Alert.severity == severity)
    total = session.scalar(select(func.count()).select_from(statement.subquery())) or 0
    rows = session.scalars(
        statement.order_by(Alert.created_at.desc(), Alert.id.desc()).limit(limit).offset(offset)
    )
    return list(rows), int(total)
