"""Daily Health Scan: submission, persistence, and retrieval.

submit_scan runs the full pipeline in one transaction:

    validate new measurements ─► persist ─► evaluate (pure analysis at as_of)
        ─► persist scan, links, baselines, alerts ─► commit ─► return stored result

Everything the response shows is read back from the stored rows, so a scan
retrieved later is identical to the one returned on submission.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta

from sqlalchemy import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import from_db_utc, to_db_utc
from app.core.monitoring_config import FUTURE_TOLERANCE_MINUTES
from app.domain.analysis import evaluate
from app.domain.errors import (
    DomainValidationError,
    DuplicateMeasurementError,
    FieldIssue,
    IdempotencyConflictError,
    NotFoundError,
)
from app.domain.metrics import METRICS
from app.domain.mission import mission_day
from app.domain.recommendations import DISCLAIMER, build_next_steps
from app.domain.types import Freshness, Severity, WellbeingRecord
from app.models import Alert, Baseline, HealthScan, Measurement, scan_measurements
from app.repositories import astronauts as astronaut_repo
from app.repositories import measurements as measurement_repo
from app.repositories import scans as scan_repo
from app.repositories.mappers import to_observation, to_wellbeing
from app.schemas.measurements import MeasurementInput
from app.schemas.scans import (
    AlertOut,
    BaselineOut,
    DataNoticeOut,
    EvidenceOut,
    EvidenceValues,
    MeasurementUsedOut,
    NextStepOut,
    ProblemAreaSummaryOut,
    ScanCreate,
    ScanOut,
    ScanSummaryCounts,
    ScanSummaryOut,
    WellbeingOut,
)
from app.services import measurement_service


def submit_scan(session: Session, body: ScanCreate, *, now: datetime) -> tuple[ScanOut, bool]:
    """Store a scan, or return the earlier one when the same client_scan_id was already submitted.

    Returns (scan, replayed). replayed is True when no new scan was created.

    Duplicate handling:
    - Same client_scan_id, same body: the stored scan is returned. Nothing is written.
    - Same client_scan_id, different body: IdempotencyConflictError (HTTP 409).
    - Two identical requests racing: the unique index rejects the second insert. Its transaction is rolled back
      (so its staged measurements are discarded too) and the stored scan is then returned or the conflict raised.
    """
    _load_astronaut(session, body.astronaut_id)
    fingerprint = request_fingerprint(body) if body.client_scan_id else None

    if body.client_scan_id:
        existing = scan_repo.find_by_client_scan_id(
            session, astronaut_id=body.astronaut_id, client_scan_id=body.client_scan_id
        )
        if existing is not None:
            return _replay(session, existing, fingerprint), True

    try:
        return _submit_new(session, body, now=now, fingerprint=fingerprint), False
    except (IntegrityError, DuplicateMeasurementError):
        session.rollback()
        existing = (
            scan_repo.find_by_client_scan_id(session, astronaut_id=body.astronaut_id, client_scan_id=body.client_scan_id)
            if body.client_scan_id
            else None
        )
        if existing is None:
            raise
        return _replay(session, existing, fingerprint), True


def request_fingerprint(body: ScanCreate) -> str:
    """SHA-256 of the canonical request body, excluding client_scan_id, so a retry with the same data matches."""
    payload = body.model_dump(mode="json", exclude={"client_scan_id"})
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _replay(session: Session, existing: HealthScan, fingerprint: str | None) -> ScanOut:
    if existing.request_fingerprint != fingerprint:
        raise IdempotencyConflictError(existing.id)
    return get_scan(session, existing.id)


def _submit_new(session: Session, body: ScanCreate, *, now: datetime, fingerprint: str | None) -> ScanOut:
    astronaut = _load_astronaut(session, body.astronaut_id)
    as_of = body.as_of or now
    if as_of > now + timedelta(minutes=FUTURE_TOLERANCE_MINUTES):
        raise DomainValidationError(
            [FieldIssue("as_of", "Reference time is in the future beyond the allowed clock tolerance.")]
        )

    # 1. Validate and stage any measurements that accompany the scan.
    new_inputs: list[MeasurementInput] = list(body.new_measurements)
    measurement_service.stage_measurements(
        session,
        astronaut_id=astronaut.id,
        inputs=new_inputs,
        now=now,
        field_prefixes=[f"new_measurements[{i}]." for i in range(len(new_inputs))],
    )

    # 2. Gather the data the analysis is allowed to see (nothing after as_of).
    observations = [
        to_observation(row)
        for row in measurement_repo.list_until(session, astronaut_id=astronaut.id, until=as_of)
    ]
    prior_wellbeing = [
        to_wellbeing(row)
        for row in scan_repo.prior_scans_before(session, astronaut_id=astronaut.id, before=as_of)
    ]
    current_wellbeing = WellbeingRecord(
        scan_id=None,
        as_of=as_of,
        mood_score=body.wellbeing.mood_score,
        stress_score=body.wellbeing.stress_score,
        sleep_hours=body.wellbeing.sleep_hours,
        symptoms=tuple(body.wellbeing.symptoms),
    )

    # 3. Analyse (pure, deterministic).
    evaluation = evaluate(
        as_of=as_of,
        metrics=METRICS,
        observations=observations,
        prior_wellbeing=prior_wellbeing,
        current_wellbeing=current_wellbeing,
    )
    next_steps = build_next_steps(evaluation.findings, evaluation.requirements)

    # 4. Persist the scan and its related rows.
    scan = HealthScan(
        astronaut_id=astronaut.id,
        client_scan_id=body.client_scan_id,
        request_fingerprint=fingerprint,
        submitted_at=to_db_utc(now),
        as_of=to_db_utc(as_of),
        mission_day=mission_day(astronaut.mission_start_date, as_of),
        mood_score=body.wellbeing.mood_score,
        stress_score=body.wellbeing.stress_score,
        sleep_hours=body.wellbeing.sleep_hours,
        symptoms=list(body.wellbeing.symptoms),
        notes=body.wellbeing.notes,
        processing_status="completed",
        overall_status=evaluation.overall_status.value,
        summary=_build_summary(evaluation, next_steps),
    )
    session.add(scan)
    session.flush()

    used_ids = [
        ind.latest.measurement_id
        for ind in evaluation.indicators
        if ind.latest is not None and ind.freshness is Freshness.CURRENT
    ]
    if used_ids:
        session.execute(
            insert(scan_measurements),
            [{"scan_id": scan.id, "measurement_id": mid} for mid in used_ids],
        )

    baseline_ids: dict[str, int] = {}
    for key, baseline in evaluation.baselines.items():
        row = Baseline(
            scan_id=scan.id,
            astronaut_id=astronaut.id,
            metric_key=key,
            method=baseline.method,
            reference_value=baseline.reference_value,
            unit=baseline.unit,
            observation_count=baseline.observation_count,
            window_start=to_db_utc(baseline.window_start),
            window_end=to_db_utc(baseline.window_end),
            calculated_at=to_db_utc(now),
        )
        session.add(row)
        session.flush()
        baseline_ids[key] = row.id

    for finding in evaluation.findings:
        session.add(
            Alert(
                scan_id=scan.id,
                astronaut_id=astronaut.id,
                category=finding.category.value,
                severity=finding.severity.value,
                rule_id=finding.rule_id,
                title=finding.title,
                explanation=finding.explanation,
                evidence={
                    "measurement_ids": list(finding.measurement_ids),
                    "baseline_id": baseline_ids.get(finding.baseline_key) if finding.baseline_key else None,
                    "values": {
                        "latest": finding.latest_value,
                        "reference": finding.reference_value,
                        "change": finding.change,
                        "change_unit": "percent" if finding.comparison == "percent" else "absolute",
                        "threshold": finding.threshold,
                    },
                },
                created_at=to_db_utc(now),
            )
        )

    session.commit()
    return get_scan(session, scan.id)


def get_scan(session: Session, scan_id: int) -> ScanOut:
    scan = scan_repo.get_scan(session, scan_id)
    if scan is None:
        raise NotFoundError(f"Scan {scan_id} was not found.")

    measurements = measurement_repo.get_many(session, scan_repo.measurement_ids_for_scan(session, scan_id))
    baselines = scan_repo.baselines_for_scan(session, scan_id)
    alerts = scan_repo.alerts_for_scan(session, scan_id)
    summary = scan.summary or {}

    return ScanOut(
        id=scan.id,
        astronaut_id=scan.astronaut_id,
        client_scan_id=scan.client_scan_id,
        submitted_at=from_db_utc(scan.submitted_at),
        as_of=from_db_utc(scan.as_of),
        mission_day=scan.mission_day,
        processing_status="completed",
        wellbeing=WellbeingOut(
            mood_score=scan.mood_score,
            stress_score=scan.stress_score,
            sleep_hours=scan.sleep_hours,
            symptoms=list(scan.symptoms or []),
            notes=scan.notes,
        ),
        measurements_used=[measurement_to_used_schema(m) for m in measurements.values()],
        baselines=[baseline_to_schema(b) for b in baselines],
        alerts=[alert_to_schema(a) for a in alerts],
        data_notices=[DataNoticeOut(**n) for n in summary.get("data_notices", [])],
        summary=ScanSummaryOut(
            overall_status=scan.overall_status,
            counts=ScanSummaryCounts(**summary["counts"]),
            problem_areas=[ProblemAreaSummaryOut(**p) for p in summary.get("problem_areas", [])],
        ),
        next_steps=[NextStepOut(**s) for s in summary.get("next_steps", [])],
        disclaimer=summary.get("disclaimer", DISCLAIMER),
    )


def list_scans(session: Session, *, astronaut_id: int, limit: int, offset: int) -> tuple[list[HealthScan], int]:
    _load_astronaut(session, astronaut_id)
    return scan_repo.list_scans(session, astronaut_id=astronaut_id, limit=limit, offset=offset)


def scan_alert_count(session: Session, scan_id: int) -> int:
    return scan_repo.count_alerts_for_scan(session, scan_id)


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _load_astronaut(session: Session, astronaut_id: int):
    astronaut = astronaut_repo.get_by_id(session, astronaut_id)
    if astronaut is None:
        raise NotFoundError(f"Astronaut {astronaut_id} was not found.")
    return astronaut


def _build_summary(evaluation, next_steps) -> dict:
    attention = sum(1 for f in evaluation.findings if f.severity is Severity.ATTENTION)
    info = sum(1 for f in evaluation.findings if f.severity is Severity.INFO)
    return {
        "counts": {
            "alerts_attention": attention,
            "alerts_info": info,
            "data_notices": len(evaluation.notices),
        },
        "problem_areas": [
            {"area": area.area.value, "status": area.status.value, "alert_count": area.alert_count}
            for area in evaluation.areas
        ],
        "data_notices": [
            {"id": notice.notice_id.value, "metric_key": notice.metric_key, "message": notice.message}
            for notice in evaluation.notices
        ],
        "next_steps": [
            {
                "priority": step.priority,
                "text": step.text,
                "related_rule_ids": list(step.related_rule_ids),
                "related_notice_ids": list(step.related_notice_ids),
            }
            for step in next_steps
        ],
        "disclaimer": DISCLAIMER,
    }


def measurement_to_used_schema(row: Measurement) -> MeasurementUsedOut:
    return MeasurementUsedOut(
        measurement_id=row.id,
        metric_key=row.metric_key,
        value=row.value,
        unit=row.unit,
        observed_at=from_db_utc(row.observed_at),
        source_type=row.source_type,
        is_synthetic=row.is_synthetic,
    )


def baseline_to_schema(row: Baseline) -> BaselineOut:
    return BaselineOut(
        baseline_id=row.id,
        metric_key=row.metric_key,
        method=row.method,
        reference_value=row.reference_value,
        unit=row.unit,
        observation_count=row.observation_count,
        window_start=from_db_utc(row.window_start),
        window_end=from_db_utc(row.window_end),
    )


def alert_to_schema(row: Alert) -> AlertOut:
    evidence = row.evidence or {}
    values = evidence.get("values", {})
    return AlertOut(
        id=row.id,
        scan_id=row.scan_id,
        category=row.category,
        severity=row.severity,
        rule_id=row.rule_id,
        title=row.title,
        explanation=row.explanation,
        evidence=EvidenceOut(
            measurement_ids=list(evidence.get("measurement_ids", [])),
            baseline_id=evidence.get("baseline_id"),
            values=EvidenceValues(**values),
        ),
        created_at=from_db_utc(row.created_at),
    )
