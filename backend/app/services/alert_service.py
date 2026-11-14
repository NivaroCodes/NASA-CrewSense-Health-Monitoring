"""Alert listing across stored scans."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.domain.errors import NotFoundError
from app.repositories import astronauts as astronaut_repo
from app.repositories import scans as scan_repo
from app.schemas.scans import AlertOut
from app.services.scan_service import alert_to_schema


def list_alerts(
    session: Session,
    *,
    astronaut_id: int,
    scan_id: int | None,
    category: str | None,
    severity: str | None,
    limit: int,
    offset: int,
) -> tuple[list[AlertOut], int]:
    if astronaut_repo.get_by_id(session, astronaut_id) is None:
        raise NotFoundError(f"Astronaut {astronaut_id} was not found.")
    if scan_id is not None and scan_repo.get_scan(session, scan_id) is None:
        raise NotFoundError(f"Scan {scan_id} was not found.")
    rows, total = scan_repo.list_alerts(
        session,
        astronaut_id=astronaut_id,
        scan_id=scan_id,
        category=category,
        severity=severity,
        limit=limit,
        offset=offset,
    )
    return [alert_to_schema(row) for row in rows], total
