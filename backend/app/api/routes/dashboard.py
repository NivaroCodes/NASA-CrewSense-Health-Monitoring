"""GET /dashboard: consolidated, read-only overview at a reference time."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import AwareDatetime
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, get_now
from app.schemas.dashboard import DashboardOut
from app.services.dashboard_service import build_dashboard

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardOut, summary="Consolidated dashboard")
def get_dashboard(
    astronaut_id: int = Query(1, ge=1),
    as_of: AwareDatetime | None = Query(None),
    db: Session = Depends(get_db),
    now: datetime = Depends(get_now),
) -> DashboardOut:
    return build_dashboard(db, astronaut_id=astronaut_id, as_of=as_of or now, now=now)
