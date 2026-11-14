"""Measurement persistence and queries."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import to_db_utc
from app.models import Measurement


def find_duplicate(
    session: Session,
    *,
    astronaut_id: int,
    metric_key: str,
    observed_at: datetime,
    value: float,
) -> Measurement | None:
    return session.scalar(
        select(Measurement).where(
            Measurement.astronaut_id == astronaut_id,
            Measurement.metric_key == metric_key,
            Measurement.observed_at == to_db_utc(observed_at),
            Measurement.value == value,
        )
    )


def list_until(session: Session, *, astronaut_id: int, until: datetime | None) -> list[Measurement]:
    """All measurements for an astronaut observed at or before `until` (or all when None)."""
    statement = select(Measurement).where(Measurement.astronaut_id == astronaut_id)
    if until is not None:
        statement = statement.where(Measurement.observed_at <= to_db_utc(until))
    return list(session.scalars(statement.order_by(Measurement.observed_at, Measurement.id)))


def list_filtered(
    session: Session,
    *,
    astronaut_id: int,
    metric_key: str | None,
    source_type: str | None,
    date_from: datetime | None,
    date_to: datetime | None,
    limit: int,
    offset: int,
) -> tuple[list[Measurement], int]:
    statement = select(Measurement).where(Measurement.astronaut_id == astronaut_id)
    if metric_key is not None:
        statement = statement.where(Measurement.metric_key == metric_key)
    if source_type is not None:
        statement = statement.where(Measurement.source_type == source_type)
    if date_from is not None:
        statement = statement.where(Measurement.observed_at >= to_db_utc(date_from))
    if date_to is not None:
        statement = statement.where(Measurement.observed_at <= to_db_utc(date_to))

    total = session.scalar(select(func.count()).select_from(statement.subquery())) or 0
    rows = session.scalars(
        statement.order_by(Measurement.observed_at.desc(), Measurement.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(rows), int(total)


def get_many(session: Session, ids: list[int]) -> dict[int, Measurement]:
    if not ids:
        return {}
    rows = session.scalars(select(Measurement).where(Measurement.id.in_(ids)))
    return {row.id: row for row in rows}
