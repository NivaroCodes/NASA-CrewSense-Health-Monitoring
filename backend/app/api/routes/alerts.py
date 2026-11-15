"""GET /alerts: monitoring alerts persisted by scans."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.common import Page
from app.schemas.scans import AlertOut
from app.services import alert_service

router = APIRouter(tags=["alerts"])


@router.get("/alerts", response_model=Page[AlertOut], summary="Monitoring alerts, newest first")
def list_alerts(
    astronaut_id: int = Query(1, ge=1),
    scan_id: int | None = Query(None, ge=1),
    category: Literal["cardiovascular", "bone_muscle", "immune", "behavioral"] | None = Query(None),
    severity: Literal["info", "attention"] | None = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> Page[AlertOut]:
    items, total = alert_service.list_alerts(
        db,
        astronaut_id=astronaut_id,
        scan_id=scan_id,
        category=category,
        severity=severity,
        limit=limit,
        offset=offset,
    )
    return Page[AlertOut](items=items, total=total, limit=limit, offset=offset)
