"""Shared API schema types: UTC timestamps, error envelope, pagination."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer

T = TypeVar("T")


def _to_utc_z(value: datetime) -> str:
    """Serialise any aware datetime as UTC ISO 8601 with a 'Z' suffix."""
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


UtcDatetime = Annotated[
    datetime,
    PlainSerializer(_to_utc_z, return_type=str, when_used="always"),
]
"""Output timestamp. Always rendered as e.g. 2026-11-13T07:12:00Z."""


class ApiModel(BaseModel):
    """Base model for responses: attributes are read from ORM/domain objects where needed."""

    model_config = ConfigDict(from_attributes=True)


class ErrorDetail(BaseModel):
    field: str
    message: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[ErrorDetail] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    error: ErrorBody


class Page(ApiModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int
