"""Mission calendar helpers (pure)."""

from __future__ import annotations

from datetime import date, datetime, timezone


def mission_day(mission_start_date: date, as_of: datetime) -> int:
    """Mission Day number, 1-based, counted in UTC: day 1 is the start date."""
    as_of_date = as_of.astimezone(timezone.utc).date()
    return (as_of_date - mission_start_date).days + 1
