"""Monitoring analysis pipeline (pure, deterministic).

One call evaluates the whole astronaut state at a reference time `as_of`:

    observations ──► freshness ──► personal baseline ──► configured rules
                                                      ──► findings (alerts)
                                                      ──► data notices
                                                      ──► data requirements
                                                      ──► area and overall status

Used by both the dashboard (read-only, nothing persisted) and the scan
pipeline (results persisted by the service layer).

Principles enforced here:
  * Observations after `as_of` are ignored, so results never depend on future data.
  * Missing data produces a notice and a "missing" status, never a normal result.
  * Values older than their freshness window are "outdated" and are not compared.
  * Only personal baselines are used; too little history means "not evaluated".
  * The value being judged is excluded from its own baseline.
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime, timedelta

from app.core.monitoring_config import (
    BASELINE_MIN_OBSERVATIONS,
    EXERCISE_BASELINE_WEEKS,
    EXERCISE_MIN_WEEKS_WITH_DATA,
    EXERCISE_RECENT_WINDOW_DAYS,
    RULES,
    WELLBEING_MIN_SCANS,
    RuleSpec,
)
from app.domain.alerts import build_finding
from app.domain.baseline import (
    median_observation_baseline,
    wellbeing_baseline,
    weekly_exercise_baseline,
)
from app.domain.metrics import WELLBEING_METRICS
from app.domain.types import (
    AreaStatus,
    AreaSummary,
    Baseline,
    Category,
    DataNotice,
    DataRequirement,
    Evaluation,
    Freshness,
    IndicatorResult,
    IndicatorStatus,
    MetricSpec,
    NoticeId,
    Observation,
    RuleFinding,
    WellbeingRecord,
)

_RULE_BY_METRIC: dict[str, RuleSpec] = {rule.metric_key: rule for rule in RULES}
_AREAS: tuple[Category, ...] = (
    Category.CARDIOVASCULAR,
    Category.BONE_MUSCLE,
    Category.IMMUNE,
    Category.BEHAVIORAL,
)


def evaluate(
    *,
    as_of: datetime,
    metrics: Sequence[MetricSpec],
    observations: Sequence[Observation],
    prior_wellbeing: Sequence[WellbeingRecord],
    current_wellbeing: WellbeingRecord | None,
) -> Evaluation:
    """Evaluate the astronaut state at `as_of`.

    `prior_wellbeing` must contain scans from before the one being judged.
    `current_wellbeing` is None when no scan is being evaluated (dashboard),
    in which case all wellbeing rules report "not evaluated".
    """

    series_by_metric = _group_newest_first(
        obs for obs in observations if obs.observed_at <= as_of
    )

    baselines: dict[str, Baseline] = {}
    indicators: list[IndicatorResult] = []
    findings: list[RuleFinding] = []
    notices: list[DataNotice] = []
    requirements: list[DataRequirement] = []
    evaluated_rules: set[str] = set()

    for spec in metrics:
        series = series_by_metric.get(spec.metric_key, [])
        latest = series[0] if series else None
        freshness, age_hours = _freshness(latest, spec.freshness_hours, as_of)

        if freshness is Freshness.MISSING:
            indicators.append(
                _indicator(spec, None, freshness, None, None, None, IndicatorStatus.MISSING)
            )
            if spec.daily_expected:
                notices.append(
                    DataNotice(
                        NoticeId.MISSING,
                        spec.metric_key,
                        f"No {spec.display_name.lower()} value is stored. "
                        "The comparison was not evaluated.",
                    )
                )
                requirements.append(DataRequirement(spec.metric_key, Freshness.MISSING))
            continue

        if freshness is Freshness.OUTDATED:
            indicators.append(
                _indicator(spec, latest, freshness, age_hours, None, None, IndicatorStatus.OUTDATED)
            )
            notices.append(
                DataNotice(
                    NoticeId.OUTDATED,
                    spec.metric_key,
                    f"The latest {spec.display_name.lower()} value is older than its "
                    f"{spec.freshness_hours:g}-hour window and was excluded from comparison.",
                )
            )
            if spec.daily_expected:
                requirements.append(DataRequirement(spec.metric_key, Freshness.OUTDATED))
            continue

        outcome = _evaluate_current_metric(spec, series, as_of)
        if outcome.baseline is not None:
            baselines[spec.metric_key] = outcome.baseline
        if outcome.notice is not None:
            notices.append(outcome.notice)
        if outcome.finding is not None:
            findings.append(outcome.finding)
        if outcome.rule_id is not None and outcome.status is not IndicatorStatus.NOT_EVALUATED:
            evaluated_rules.add(outcome.rule_id)

        indicators.append(
            _indicator(
                spec,
                latest,
                freshness,
                age_hours,
                outcome.compared_value,
                outcome.baseline,
                outcome.status,
                outcome.change,
                tuple(f.rule_id for f in ([outcome.finding] if outcome.finding else [])),
                outcome.note,
            )
        )

    if current_wellbeing is not None:
        for field_name, spec in WELLBEING_METRICS.items():
            rule = _RULE_BY_METRIC[field_name]
            baseline = wellbeing_baseline(
                field_name=field_name,
                unit=spec.canonical_unit,
                prior_scans=prior_wellbeing,
                as_of=as_of,
            )
            baselines[field_name] = baseline
            current_value = float(getattr(current_wellbeing, field_name))
            reference = baseline.reference_value
            if reference is None:
                notices.append(
                    DataNotice(
                        NoticeId.BASELINE,
                        field_name,
                        f"Not enough prior scans for a personal {spec.display_name.lower()} "
                        f"baseline ({baseline.observation_count} of {WELLBEING_MIN_SCANS} "
                        "required). The comparison was not evaluated.",
                    )
                )
                continue
            evaluated_rules.add(rule.rule_id)
            change = current_value - reference
            finding = _fire_if_matched(
                rule,
                metric=spec,
                latest_value=current_value,
                reference_value=reference,
                change=change,
                measurement_ids=(),
                baseline_key=field_name,
                observation_count=baseline.observation_count,
                latest_observed_at=current_wellbeing.as_of,
            )
            if finding is not None:
                findings.append(finding)

    areas = _area_summaries(indicators, findings, evaluated_rules)
    overall = _overall_status(findings, evaluated_rules)

    return Evaluation(
        as_of=as_of,
        indicators=tuple(indicators),
        findings=tuple(findings),
        notices=tuple(notices),
        requirements=tuple(requirements),
        baselines=baselines,
        evaluated_rule_ids=frozenset(evaluated_rules),
        areas=areas,
        overall_status=overall,
    )


# ---------------------------------------------------------------------------
# Per-metric evaluation
# ---------------------------------------------------------------------------


class _Outcome:
    """Result of evaluating one current metric (internal to this module)."""

    __slots__ = (
        "status",
        "compared_value",
        "change",
        "baseline",
        "finding",
        "notice",
        "note",
        "rule_id",
    )

    def __init__(self) -> None:
        self.status = IndicatorStatus.NOT_EVALUATED
        self.compared_value: float | None = None
        self.change: float | None = None
        self.baseline: Baseline | None = None
        self.finding: RuleFinding | None = None
        self.notice: DataNotice | None = None
        self.note: str | None = None
        self.rule_id: str | None = None


def _evaluate_current_metric(
    spec: MetricSpec, series: list[Observation], as_of: datetime
) -> _Outcome:
    if spec.metric_key == "exercise_duration":
        return _evaluate_exercise(spec, series, as_of)
    if spec.metric_key == "lymphocyte_count":
        return _evaluate_lymphocyte(spec, series)
    return _evaluate_against_baseline(spec, series, as_of)


def _evaluate_against_baseline(
    spec: MetricSpec, series: list[Observation], as_of: datetime
) -> _Outcome:
    """Cardiovascular-style rules: latest value vs median personal baseline (percent change)."""

    outcome = _Outcome()
    latest = series[0]
    rule = _RULE_BY_METRIC[spec.metric_key]
    outcome.rule_id = rule.rule_id
    outcome.compared_value = latest.value

    baseline = median_observation_baseline(
        metric_key=spec.metric_key,
        unit=spec.canonical_unit,
        observations=series,
        as_of=as_of,
        exclude_measurement_id=latest.measurement_id,
    )
    outcome.baseline = baseline
    reference = baseline.reference_value

    if reference is None:
        outcome.note = (
            f"Not enough prior observations for a personal baseline "
            f"({baseline.observation_count} of {BASELINE_MIN_OBSERVATIONS} required)."
        )
        outcome.notice = DataNotice(NoticeId.BASELINE, spec.metric_key, outcome.note)
        return outcome

    if reference == 0:
        outcome.note = "The personal baseline is zero, so a percentage change cannot be computed."
        outcome.notice = DataNotice(NoticeId.BASELINE, spec.metric_key, outcome.note)
        return outcome

    change = _percent_change(latest.value, reference)
    outcome.change = change
    outcome.finding = _fire_if_matched(
        rule,
        metric=spec,
        latest_value=latest.value,
        reference_value=reference,
        change=change,
        measurement_ids=(latest.measurement_id,),
        baseline_key=spec.metric_key,
        observation_count=baseline.observation_count,
        latest_observed_at=latest.observed_at,
    )
    outcome.status = _status_for(outcome.finding)
    return outcome


def _evaluate_exercise(spec: MetricSpec, series: list[Observation], as_of: datetime) -> _Outcome:
    """Recent 7-day total vs median of prior weekly totals (percent change)."""

    outcome = _Outcome()
    rule = _RULE_BY_METRIC[spec.metric_key]
    outcome.rule_id = rule.rule_id

    recent_start = as_of - timedelta(days=EXERCISE_RECENT_WINDOW_DAYS)
    recent = [obs for obs in series if obs.observed_at >= recent_start]
    recent_total = float(sum(obs.value for obs in recent))
    outcome.compared_value = recent_total

    baseline = weekly_exercise_baseline(
        unit=spec.canonical_unit, observations=series, as_of=as_of
    )
    outcome.baseline = baseline
    reference = baseline.reference_value

    if reference is None:
        outcome.note = (
            f"Not enough weeks with exercise data for a personal baseline "
            f"({baseline.observation_count} of {EXERCISE_MIN_WEEKS_WITH_DATA} required, "
            f"from up to {EXERCISE_BASELINE_WEEKS} weeks)."
        )
        outcome.notice = DataNotice(NoticeId.BASELINE, spec.metric_key, outcome.note)
        return outcome

    if reference == 0:
        outcome.note = "The weekly baseline is zero, so a percentage change cannot be computed."
        outcome.notice = DataNotice(NoticeId.BASELINE, spec.metric_key, outcome.note)
        return outcome

    change = _percent_change(recent_total, reference)
    outcome.change = change
    outcome.finding = _fire_if_matched(
        rule,
        metric=spec,
        latest_value=recent_total,
        reference_value=reference,
        change=change,
        measurement_ids=tuple(obs.measurement_id for obs in recent),
        baseline_key=spec.metric_key,
        observation_count=baseline.observation_count,
        latest_observed_at=series[0].observed_at,
    )
    outcome.status = _status_for(outcome.finding)
    return outcome


def _evaluate_lymphocyte(spec: MetricSpec, series: list[Observation]) -> _Outcome:
    """Latest imported examination vs the previous imported examination (percent change).

    This is a comparison between two examinations. No personal baseline is used.
    """

    outcome = _Outcome()
    rule = _RULE_BY_METRIC[spec.metric_key]
    outcome.rule_id = rule.rule_id
    latest = series[0]
    outcome.compared_value = latest.value

    if len(series) < 2:
        outcome.note = "A previous imported examination is needed before this value can be compared."
        outcome.notice = DataNotice(NoticeId.BASELINE, spec.metric_key, outcome.note)
        return outcome

    previous = series[1]
    if previous.value == 0:
        outcome.note = "The previous examination value is zero, so a percentage change cannot be computed."
        outcome.notice = DataNotice(NoticeId.BASELINE, spec.metric_key, outcome.note)
        return outcome

    change = _percent_change(latest.value, previous.value)
    outcome.change = change
    outcome.finding = _fire_if_matched(
        rule,
        metric=spec,
        latest_value=latest.value,
        reference_value=previous.value,
        change=change,
        measurement_ids=(latest.measurement_id, previous.measurement_id),
        baseline_key=None,
        observation_count=1,
        latest_observed_at=latest.observed_at,
        previous_observed_at=previous.observed_at,
    )
    outcome.status = _status_for(outcome.finding)
    return outcome


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _group_newest_first(observations) -> dict[str, list[Observation]]:
    grouped: dict[str, list[Observation]] = {}
    ordered = sorted(
        observations,
        key=lambda obs: (obs.observed_at, obs.measurement_id),
        reverse=True,
    )
    for obs in ordered:
        grouped.setdefault(obs.metric_key, []).append(obs)
    return grouped


def _freshness(
    latest: Observation | None, freshness_hours: float, as_of: datetime
) -> tuple[Freshness, float | None]:
    if latest is None:
        return Freshness.MISSING, None
    age_hours = (as_of - latest.observed_at).total_seconds() / 3600
    if age_hours > freshness_hours:
        return Freshness.OUTDATED, age_hours
    return Freshness.CURRENT, age_hours


def _percent_change(latest: float, reference: float) -> float:
    return (latest - reference) / reference * 100


def _fire_if_matched(
    rule: RuleSpec,
    *,
    metric: MetricSpec,
    latest_value: float,
    reference_value: float,
    change: float,
    measurement_ids: tuple[int, ...],
    baseline_key: str | None,
    observation_count: int,
    latest_observed_at: datetime,
    previous_observed_at: datetime | None = None,
) -> RuleFinding | None:
    if rule.direction == "increase":
        matched = change >= rule.threshold
    else:
        matched = change <= rule.threshold
    if not matched:
        return None
    return build_finding(
        rule,
        metric=metric,
        latest_value=latest_value,
        reference_value=reference_value,
        change=change,
        measurement_ids=measurement_ids,
        baseline_key=baseline_key,
        observation_count=observation_count,
        latest_observed_at=latest_observed_at,
        previous_observed_at=previous_observed_at,
    )


def _status_for(finding: RuleFinding | None) -> IndicatorStatus:
    return IndicatorStatus.RULE_FIRED if finding is not None else IndicatorStatus.NO_RULE_FIRED


def _indicator(
    spec: MetricSpec,
    latest: Observation | None,
    freshness: Freshness,
    age_hours: float | None,
    compared_value: float | None,
    baseline: Baseline | None,
    status: IndicatorStatus,
    change: float | None = None,
    rule_ids: tuple[str, ...] = (),
    note: str | None = None,
) -> IndicatorResult:
    return IndicatorResult(
        metric_key=spec.metric_key,
        spec=spec,
        latest=latest,
        freshness=freshness,
        age_hours=round(age_hours, 1) if age_hours is not None else None,
        compared_value=compared_value,
        baseline=baseline,
        change_pct=round(change, 1) if change is not None else None,
        status=status,
        rule_ids=rule_ids,
        note=note,
    )


def _area_summaries(
    indicators: Sequence[IndicatorResult],
    findings: Sequence[RuleFinding],
    evaluated_rules: set[str],
) -> tuple[AreaSummary, ...]:
    summaries: list[AreaSummary] = []
    for area in _AREAS:
        area_findings = [f for f in findings if f.category is area]
        area_rule_ids = {rule.rule_id for rule in RULES if rule.category == area.value}
        if any(f.severity.value == "attention" for f in area_findings):
            status = AreaStatus.ATTENTION
        elif area_findings:
            status = AreaStatus.INFO
        elif area_rule_ids & evaluated_rules:
            status = AreaStatus.NO_ALERTS
        else:
            status = AreaStatus.NOT_EVALUATED
        summaries.append(
            AreaSummary(
                area=area,
                status=status,
                alert_count=len(area_findings),
                indicator_keys=tuple(
                    ind.metric_key for ind in indicators if ind.spec.category is area
                ),
            )
        )
    return tuple(summaries)


def _overall_status(findings: Sequence[RuleFinding], evaluated_rules: set[str]) -> AreaStatus:
    if any(f.severity.value == "attention" for f in findings):
        return AreaStatus.ATTENTION
    if findings:
        return AreaStatus.INFO
    if evaluated_rules:
        return AreaStatus.NO_ALERTS
    return AreaStatus.NOT_EVALUATED
