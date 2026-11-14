"""Map domain and framework errors onto the single JSON error envelope."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.domain.errors import DomainValidationError, DuplicateMeasurementError, NotFoundError


def _envelope(status: int, code: str, message: str, details: list[dict[str, str]] | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message, "details": details or []}},
    )


def _loc_to_field(loc: tuple[Any, ...]) -> str:
    """('body', 'new_measurements', 0, 'value') -> 'new_measurements[0].value'."""
    parts = [str(p) for p in loc if p != "body"]
    field = ""
    for part in parts:
        if part.isdigit():
            field += f"[{part}]"
        else:
            field = f"{field}.{part}" if field else part
    return field or "body"


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainValidationError)
    async def _domain_validation(_: Request, exc: DomainValidationError) -> JSONResponse:
        details = [{"field": i.field, "message": i.message} for i in exc.issues]
        return _envelope(422, "validation_error", "One or more fields are invalid.", details)

    @app.exception_handler(NotFoundError)
    async def _not_found(_: Request, exc: NotFoundError) -> JSONResponse:
        return _envelope(404, "not_found", exc.message)

    @app.exception_handler(DuplicateMeasurementError)
    async def _duplicate(_: Request, exc: DuplicateMeasurementError) -> JSONResponse:
        message = (
            f"Existing measurement id {exc.existing_id}."
            if exc.existing_id is not None
            else "Identical measurements appear more than once in this request."
        )
        return _envelope(
            409,
            "duplicate_measurement",
            "An identical measurement already exists.",
            [{"field": "observed_at", "message": message}],
        )

    @app.exception_handler(RequestValidationError)
    async def _request_validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        details = [
            {"field": _loc_to_field(tuple(err.get("loc", ()))), "message": str(err.get("msg", "Invalid value."))}
            for err in exc.errors()
        ]
        return _envelope(422, "validation_error", "One or more fields are invalid.", details)

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        if exc.status_code == 404:
            return _envelope(404, "not_found", "The requested resource was not found.")
        if exc.status_code == 405:
            return _envelope(405, "method_not_allowed", "This method is not allowed for the resource.")
        return _envelope(exc.status_code, "bad_request", str(exc.detail))

    @app.exception_handler(Exception)
    async def _unexpected(_: Request, exc: Exception) -> JSONResponse:
        # Do not leak internal details to clients.
        return _envelope(500, "internal_error", "An unexpected error occurred.")
