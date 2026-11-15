"""Measurement endpoints: manual entry, imported examinations, history."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import AwareDatetime
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, get_now
from app.schemas.common import Page
from app.schemas.measurements import MeasurementCreate, MeasurementOut
from app.services import measurement_service

router = APIRouter(tags=["measurements"])


@router.post(
    "/measurements",
    status_code=201,
    response_model=MeasurementOut,
    summary="Store a manual measurement or imported examination result",
)
def create_measurement(
    body: MeasurementCreate,
    db: Session = Depends(get_db),
    now: datetime = Depends(get_now),
) -> MeasurementOut:
    row = measurement_service.create_measurement(db, astronaut_id=body.astronaut_id, data=body, now=now)
    return measurement_service.measurement_to_schema(row)


@router.get("/measurements", response_model=Page[MeasurementOut], summary="Measurement history")
def list_measurements(
    astronaut_id: int = Query(1, ge=1),
    metric_key: str | None = Query(None, max_length=64),
    source_type: Literal["sensor_reading", "manual_input", "imported_examination"] | None = Query(None),
    from_: AwareDatetime | None = Query(None, alias="from"),
    to: AwareDatetime | None = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> Page[MeasurementOut]:
    rows, total = measurement_service.list_measurements(
        db,
        astronaut_id=astronaut_id,
        metric_key=metric_key,
        source_type=source_type,
        date_from=from_,
        date_to=to,
        limit=limit,
        offset=offset,
    )
    return Page[MeasurementOut](
        items=[measurement_service.measurement_to_schema(r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
    )
