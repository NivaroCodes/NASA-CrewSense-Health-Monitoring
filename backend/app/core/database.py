"""Database engine, session factory and schema initialisation (SQLAlchemy 2.x).

Timestamps are stored as naive UTC datetimes. Use `to_db_utc` before writing and
`from_db_utc` after reading, so the rest of the code only ever sees aware UTC.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def make_engine(database_url: str) -> Engine:
    connect_args: dict[str, object] = {}
    if database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    engine = create_engine(database_url, connect_args=connect_args)

    if database_url.startswith("sqlite"):

        @event.listens_for(engine, "connect")
        def _enable_sqlite_foreign_keys(dbapi_connection, _record) -> None:  # type: ignore[no-untyped-def]
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


def make_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def init_db(engine: Engine) -> None:
    """Create all tables. Imports the models so that they are registered on Base."""
    from app import models  # noqa: F401  (registers ORM classes)

    Base.metadata.create_all(engine)


def to_db_utc(value: datetime) -> datetime:
    """Convert an aware datetime to naive UTC for storage."""
    if value.tzinfo is None:
        raise ValueError("Timestamps must be timezone-aware before storage.")
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def from_db_utc(value: datetime) -> datetime:
    """Attach UTC to a naive datetime read from storage."""
    return value.replace(tzinfo=timezone.utc)
