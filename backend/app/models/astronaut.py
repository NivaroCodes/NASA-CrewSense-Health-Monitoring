"""Astronaut profile (demo identity only in the MVP)."""

from __future__ import annotations

from datetime import date

from sqlalchemy import Boolean, Date, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Astronaut(Base):
    __tablename__ = "astronauts"

    id: Mapped[int] = mapped_column(primary_key=True)
    display_id: Mapped[str] = mapped_column(String(64), unique=True)
    display_name: Mapped[str] = mapped_column(String(120))
    mission_name: Mapped[str] = mapped_column(String(120))
    mission_start_date: Mapped[date] = mapped_column(Date)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
