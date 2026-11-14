"""FastAPI dependencies: database session and reference time."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime, timezone

from fastapi import Request
from sqlalchemy.orm import Session


def get_db(request: Request) -> Iterator[Session]:
    session = request.app.state.session_factory()
    try:
        yield session
    finally:
        session.close()


def get_now() -> datetime:
    return datetime.now(timezone.utc)
