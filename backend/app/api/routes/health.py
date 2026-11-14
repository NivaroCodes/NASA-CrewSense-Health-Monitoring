"""GET /health: backend liveness and database reachability."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, get_now
from app.core.config import API_VERSION
from app.schemas.common import UtcDatetime

router = APIRouter(tags=["health"])


class HealthOut(BaseModel):
    status: str
    version: str
    database: str
    server_time: UtcDatetime


@router.get("/health", response_model=HealthOut, summary="Backend health check")
def health(db: Session = Depends(get_db), now: datetime = Depends(get_now)) -> HealthOut:
    try:
        db.execute(text("SELECT 1"))
        database = "ok"
    except Exception:  # noqa: BLE001 - report, do not leak details
        database = "unavailable"
    return HealthOut(
        status="ok" if database == "ok" else "degraded",
        version=API_VERSION,
        database=database,
        server_time=now,
    )
