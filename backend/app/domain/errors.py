"""Domain-level exceptions. The API layer maps these to HTTP responses."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class FieldIssue:
    field: str
    message: str


class DomainError(Exception):
    """Base class for errors raised by domain and service code."""


class DomainValidationError(DomainError):
    def __init__(self, issues: list[FieldIssue]) -> None:
        super().__init__("One or more fields are invalid.")
        self.issues = issues


class NotFoundError(DomainError):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class DuplicateMeasurementError(DomainError):
    def __init__(self, existing_id: int | None) -> None:
        super().__init__("An identical measurement already exists.")
        self.existing_id = existing_id


class IdempotencyConflictError(DomainError):
    """The same client_scan_id was submitted again, but with a different body."""

    def __init__(self, existing_scan_id: int) -> None:
        super().__init__("This client_scan_id was already used for a different scan.")
        self.existing_scan_id = existing_scan_id
