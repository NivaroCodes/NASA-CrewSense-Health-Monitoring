"""Measurement intake and retrieval.

Validation rules are defined in app.domain.validation. This module only
resolves metrics and astronauts, checks duplicates, and persists.
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.database import from_db_utc, to_db_utc
from app.domain.errors import DomainValidationError, DuplicateMeasurementError, FieldIssue, NotFoundError
from app.domain.metrics import METRICS_BY_KEY
from app.domain.types import SourceType
from app.domain.validation import validate_measurement_input
from app.models import Measurement
from app.repositories import astronauts as astronaut_repo
from app.repositories import measurements as measurement_repo
from app.schemas.measurements import MeasurementInput, MeasurementOut


def ensure_astronaut(session: Session, astronaut_id: int) -> None:
    if astronaut_repo.get_by_id(session, astronaut_id) is None:
        raise NotFoundError(f"Astronaut {astronaut_id} was not found.")


def stage_measurements(
    session: Session,
    *,
    astronaut_id: int,
    inputs: Sequence[MeasurementInput],
    now: datetime,
    field_prefixes: Sequence[str] | None = None,
    single_request: bool = False,
) -> list[Measurement]:
    """Validate and add measurements to the session without committing.

    All inputs are validated before anything is added, so a single invalid
    entry rejects the whole batch. `single_request=True` maps an unknown
    metric to 404 (POST /measurements); otherwise it is a field error (scans).
    """

    if field_prefixes is None:
        field_prefixes = [""] * len(inputs)

    issues: list[FieldIssue] = []
    for item, prefix in zip(inputs, field_prefixes, strict=True):
        spec = METRICS_BY_KEY.get(item.metric_key)
        if spec is None:
            if single_request:
                raise NotFoundError(f"Metric '{item.metric_key}' was not found.")
            issues.append(FieldIssue(f"{prefix}metric_key", f"Unknown metric '{item.metric_key}'."))
            continue
        issues.extend(
            validate_measurement_input(
                spec=spec,
                value=item.value,
                unit=item.unit,
                observed_at=item.observed_at,
                source_type=SourceType(item.source_type),
                now=now,
                field_prefix=prefix,
            )
        )
    if issues:
        raise DomainValidationError(issues)

    seen: set[tuple[str, datetime, float]] = set()
    rows: list[Measurement] = []
    for item in inputs:
        identity = (item.metric_key, item.observed_at, item.value)
        if identity in seen:
            raise DuplicateMeasurementError(None)
        seen.add(identity)

        existing = measurement_repo.find_duplicate(
            session,
            astronaut_id=astronaut_id,
            metric_key=item.metric_key,
            observed_at=item.observed_at,
            value=item.value,
        )
        if existing is not None:
            raise DuplicateMeasurementError(existing.id)

        spec = METRICS_BY_KEY[item.metric_key]
        row = Measurement(
            astronaut_id=astronaut_id,
            metric_key=item.metric_key,
            value=float(item.value),
            unit=spec.canonical_unit,
            observed_at=to_db_utc(item.observed_at),
            recorded_at=to_db_utc(now),
            source_type=item.source_type,
            source_detail=item.source_detail,
            is_synthetic=False,
            validation_status="valid",
            validation_notes=None,
        )
        session.add(row)
        rows.append(row)

    session.flush()
    return rows


def create_measurement(session: Session, *, astronaut_id: int, data: MeasurementInput, now: datetime) -> Measurement:
    ensure_astronaut(session, astronaut_id)
    (row,) = stage_measurements(
        session,
        astronaut_id=astronaut_id,
        inputs=[data],
        now=now,
        single_request=True,
    )
    session.commit()
    return row


def list_measurements(
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
    ensure_astronaut(session, astronaut_id)
    if metric_key is not None and metric_key not in METRICS_BY_KEY:
        raise NotFoundError(f"Metric '{metric_key}' was not found.")
    return measurement_repo.list_filtered(
        session,
        astronaut_id=astronaut_id,
        metric_key=metric_key,
        source_type=source_type,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )


def measurement_to_schema(row: Measurement) -> MeasurementOut:
    spec = METRICS_BY_KEY[row.metric_key]
    return MeasurementOut(
        id=row.id,
        astronaut_id=row.astronaut_id,
        metric_key=row.metric_key,
        display_name=spec.display_name,
        category=spec.category.value,
        value=row.value,
        unit=row.unit,
        observed_at=from_db_utc(row.observed_at),
        recorded_at=from_db_utc(row.recorded_at),
        source_type=row.source_type,
        source_detail=row.source_detail,
        validation_status=row.validation_status,
        validation_notes=row.validation_notes,
        is_synthetic=row.is_synthetic,
    )
