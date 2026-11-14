"""Consolidated dashboard: read-only, evaluated at `as_of`, nothing persisted."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.core.database import from_db_utc
from app.domain.analysis import evaluate
from app.domain.errors import NotFoundError
from app.domain.metrics import METRICS, METRICS_BY_KEY
from app.domain.mission import mission_day
from app.domain.recommendations import DISCLAIMER
from app.domain.types import IndicatorResult
from app.repositories import astronauts as astronaut_repo
from app.repositories import measurements as measurement_repo
from app.repositories import scans as scan_repo
from app.repositories.mappers import to_observation
from app.schemas.dashboard import (
    AstronautOut,
    BaselineSnapshotOut,
    DashboardOut,
    DataNoticeOut,
    IndicatorOut,
    LastScanOut,
    LatestMeasurementOut,
    LiveAlertOut,
    MissionOut,
    ProblemAreaOut,
    ScanRequirementOut,
    WellbeingStatusOut,
)

_AREA_LABELS: dict[str, str] = {
    "cardiovascular": "Cardiovascular",
    "bone_muscle": "Bone and muscle",
    "immune": "Immune (examination)",
    "behavioral": "Behavioral health",
}


def build_dashboard(session: Session, *, astronaut_id: int, as_of: datetime, now: datetime) -> DashboardOut:
    astronaut = astronaut_repo.get_by_id(session, astronaut_id)
    if astronaut is None:
        raise NotFoundError(f"Astronaut {astronaut_id} was not found.")

    observations = [
        to_observation(row)
        for row in measurement_repo.list_until(session, astronaut_id=astronaut_id, until=as_of)
    ]
    evaluation = evaluate(
        as_of=as_of,
        metrics=METRICS,
        observations=observations,
        prior_wellbeing=[],
        current_wellbeing=None,
    )

    current_day = mission_day(astronaut.mission_start_date, as_of)
    last = scan_repo.last_scan_at_or_before(session, astronaut_id=astronaut_id, as_of=as_of)

    return DashboardOut(
        generated_at=now,
        as_of=as_of,
        astronaut=AstronautOut(
            id=astronaut.id,
            display_id=astronaut.display_id,
            display_name=astronaut.display_name,
            mission_name=astronaut.mission_name,
            is_synthetic=astronaut.is_synthetic,
        ),
        mission=MissionOut(mission_day=current_day, mission_start_date=astronaut.mission_start_date),
        last_scan=(
            LastScanOut(
                id=last.id,
                as_of=from_db_utc(last.as_of),
                mission_day=last.mission_day,
                submitted_at=from_db_utc(last.submitted_at),
            )
            if last is not None
            else None
        ),
        wellbeing=WellbeingStatusOut(
            as_of=from_db_utc(last.as_of) if last is not None else None,
            required_today=last is None or last.mission_day != current_day,
            mood_score=last.mood_score if last is not None else None,
            stress_score=last.stress_score if last is not None else None,
            sleep_hours=last.sleep_hours if last is not None else None,
            symptoms=list(last.symptoms or []) if last is not None else [],
        ),
        problem_areas=[
            ProblemAreaOut(
                area=area.area.value,
                label=_AREA_LABELS[area.area.value],
                status=area.status.value,
                alert_count=area.alert_count,
                indicator_keys=list(area.indicator_keys),
            )
            for area in evaluation.areas
        ],
        indicators=[_indicator_out(ind) for ind in evaluation.indicators],
        alerts=[
            LiveAlertOut(
                rule_id=f.rule_id,
                category=f.category.value,
                severity=f.severity.value,
                title=f.title,
                metric_key=f.metric_key,
            )
            for f in evaluation.findings
        ],
        scan_requirements=[
            ScanRequirementOut(
                metric_key=req.metric_key,
                display_name=METRICS_BY_KEY[req.metric_key].display_name,
                unit=METRICS_BY_KEY[req.metric_key].canonical_unit,
                reason=req.reason.value,
                allowed_source_types=sorted(s.value for s in METRICS_BY_KEY[req.metric_key].allowed_source_types),
            )
            for req in evaluation.requirements
        ],
        data_notices=[
            DataNoticeOut(id=n.notice_id.value, metric_key=n.metric_key, message=n.message)
            for n in evaluation.notices
        ],
        disclaimer=DISCLAIMER,
    )


def _indicator_out(ind: IndicatorResult) -> IndicatorOut:
    latest = None
    if ind.latest is not None:
        latest = LatestMeasurementOut(
            measurement_id=ind.latest.measurement_id,
            value=ind.latest.value,
            unit=ind.latest.unit,
            observed_at=ind.latest.observed_at,
            source_type=ind.latest.source_type.value,
            source_detail=ind.latest.source_detail,
            validation_status=ind.latest.validation_status.value,
            is_synthetic=ind.latest.is_synthetic,
        )

    baseline = None
    if ind.baseline is not None and ind.baseline.reference_value is not None:
        baseline = BaselineSnapshotOut(
            baseline_id=None,
            method=ind.baseline.method,
            reference_value=ind.baseline.reference_value,
            unit=ind.baseline.unit,
            observation_count=ind.baseline.observation_count,
            window_start=ind.baseline.window_start,
            window_end=ind.baseline.window_end,
        )

    return IndicatorOut(
        metric_key=ind.metric_key,
        display_name=ind.spec.display_name,
        category=ind.spec.category.value,
        problem_area=ind.spec.category.value,
        latest=latest,
        freshness=ind.freshness.value,
        age_hours=ind.age_hours,
        freshness_window_hours=ind.spec.freshness_hours,
        compared_value=ind.compared_value,
        baseline=baseline,
        change_pct=ind.change_pct,
        status=ind.status.value,
        rule_ids=list(ind.rule_ids),
        note=ind.note,
    )
