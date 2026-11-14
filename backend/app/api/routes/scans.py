"""Daily Health Scan endpoints."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, get_now
from app.core.database import from_db_utc
from app.schemas.common import Page
from app.schemas.scans import ScanCreate, ScanListItem, ScanOut
from app.services import scan_service

router = APIRouter(tags=["scans"])


@router.post("/scans", status_code=201, response_model=ScanOut, summary="Submit a Daily Health Scan")
def submit_scan(
    body: ScanCreate,
    db: Session = Depends(get_db),
    now: datetime = Depends(get_now),
) -> ScanOut:
    return scan_service.submit_scan(db, body, now=now)


@router.get("/scans", response_model=Page[ScanListItem], summary="Scan history, newest first")
def list_scans(
    astronaut_id: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> Page[ScanListItem]:
    rows, total = scan_service.list_scans(db, astronaut_id=astronaut_id, limit=limit, offset=offset)
    items = [
        ScanListItem(
            id=row.id,
            as_of=from_db_utc(row.as_of),
            mission_day=row.mission_day,
            submitted_at=from_db_utc(row.submitted_at),
            processing_status=row.processing_status,
            overall_status=row.overall_status,
            alert_count=scan_service.scan_alert_count(db, row.id),
        )
        for row in rows
    ]
    return Page[ScanListItem](items=items, total=total, limit=limit, offset=offset)


@router.get("/scans/{scan_id}", response_model=ScanOut, summary="Retrieve a stored scan result")
def get_scan(scan_id: int, db: Session = Depends(get_db)) -> ScanOut:
    return scan_service.get_scan(db, scan_id)
