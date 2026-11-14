"""Astronaut lookups."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Astronaut


def get_by_id(session: Session, astronaut_id: int) -> Astronaut | None:
    return session.get(Astronaut, astronaut_id)


def get_by_display_id(session: Session, display_id: str) -> Astronaut | None:
    return session.scalar(select(Astronaut).where(Astronaut.display_id == display_id))
