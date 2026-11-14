"""Monitoring pipeline tests, including the Mission Day 087 demo expectations."""

from datetime import timedelta
from dataclasses import replace

from app.domain.analysis import evaluate
from app.domain.metrics import METRICS
from app.domain.types import AreaStatus, Freshness, IndicatorStatus, NoticeId
from tests.factories import demo_as_of, demo_observations, demo_prior_wellbeing, obs, wellbeing


def _evaluate(observations, *, as_of=None, prior=(), current=None):
    return evaluate(
        as_of=as_of or demo_as_of(),
        metrics=METRICS,
        observations=observations,
        prior_wellbeing=list(prior),
        current_wellbeing=current,
    )


def _indicator(evaluation, key):
    return next(i for i in evaluation.indicators if i.metric_key == key)


def _rule_ids(evaluation):
    return sorted(f.rule_id for f in evaluation.findings)


# --- Mission Day 087: must match docs/API_CONTRACT.md -----------------------


def test_demo_dashboard_without_scan_matches_contract():
    ev = _evaluate(demo_observations())

    hr = _indicator(ev, "heart_rate")
    assert hr.status is IndicatorStatus.RULE_FIRED
    assert hr.compared_value == 96.0
    assert hr.baseline.reference_value == 81.0
    assert hr.baseline.observation_count == 13
    assert hr.change_pct == 18.5

    assert _indicator(ev, "systolic_bp").status is IndicatorStatus.MISSING
    assert _indicator(ev, "diastolic_bp").status is IndicatorStatus.OUTDATED
    assert _indicator(ev, "diastolic_bp").freshness is Freshness.OUTDATED

    ex = _indicator(ev, "exercise_duration")
    assert ex.compared_value == 120.0
    assert ex.baseline.reference_value == 210.0
    assert ex.change_pct == -42.9

    lym = _indicator(ev, "lymphocyte_count")
    assert lym.compared_value == 1.9
    assert lym.change_pct == -20.8
    assert lym.baseline is None

    assert _rule_ids(ev) == ["BM-EX-01", "CV-HR-01", "IM-LYM-01"]
    assert ev.overall_status is AreaStatus.ATTENTION

    notices = {(n.notice_id, n.metric_key) for n in ev.notices}
    assert notices == {
        (NoticeId.MISSING, "systolic_bp"),
        (NoticeId.OUTDATED, "diastolic_bp"),
    }
    assert [(r.metric_key, r.reason) for r in ev.requirements] == [
        ("systolic_bp", Freshness.MISSING),
        ("diastolic_bp", Freshness.OUTDATED),
    ]

    behavioral = next(a for a in ev.areas if a.area.value == "behavioral")
    assert behavioral.status is AreaStatus.NOT_EVALUATED


def test_demo_scan_adds_wellbeing_rule_and_matches_contract():
    current = wellbeing("2026-11-13T07:30:00Z", mood=3, stress=6, sleep=5.2)
    ev = _evaluate(demo_observations(), prior=demo_prior_wellbeing(), current=current)

    assert _rule_ids(ev) == ["BH-SLP-01", "BM-EX-01", "CV-HR-01", "IM-LYM-01"]
    sleep = next(f for f in ev.findings if f.rule_id == "BH-SLP-01")
    assert sleep.severity.value == "info"
    assert sleep.reference_value == 6.8
    assert round(sleep.change, 1) == -1.6

    assert ev.baselines["mood_score"].reference_value == 4.0
    assert ev.baselines["stress_score"].reference_value == 4.5
    assert ev.baselines["sleep_hours"].observation_count == 6

    # Mood (3 vs 4) and stress (6 vs 4.5) do not reach their configured thresholds.
    assert not any(f.rule_id in ("BH-MOOD-01", "BH-STRESS-01") for f in ev.findings)
    assert {"BH-MOOD-01", "BH-STRESS-01", "BH-SLP-01"} <= set(ev.evaluated_rule_ids)

    behavioral = next(a for a in ev.areas if a.area.value == "behavioral")
    assert behavioral.status is AreaStatus.INFO
    assert ev.overall_status is AreaStatus.ATTENTION


def test_demo_evaluation_is_deterministic():
    current = wellbeing("2026-11-13T07:30:00Z", mood=3, stress=6, sleep=5.2)
    first = _evaluate(demo_observations(), prior=demo_prior_wellbeing(), current=current)
    second = _evaluate(demo_observations(), prior=demo_prior_wellbeing(), current=current)
    assert first == second


# --- Principles: missing, outdated, future, insufficient history ------------


def test_future_observations_are_ignored_at_reference_time():
    as_of = demo_as_of()
    future = obs(999, "heart_rate", 240, "2026-11-13T09:00:00Z")
    ev = _evaluate(demo_observations() + [future], as_of=as_of)
    assert _indicator(ev, "heart_rate").compared_value == 96.0


def test_insufficient_baseline_is_not_evaluated_not_normal():
    observations = [obs(i, "heart_rate", 80, f"2026-11-1{i}T07:00:00Z") for i in range(0, 3)]
    observations.append(obs(50, "heart_rate", 120, "2026-11-13T07:12:00Z"))
    ev = _evaluate(observations)
    hr = _indicator(ev, "heart_rate")
    assert hr.status is IndicatorStatus.NOT_EVALUATED
    assert hr.baseline.reference_value is None
    assert hr.rule_ids == ()
    assert not any(f.rule_id == "CV-HR-01" for f in ev.findings)
    assert any(n.notice_id is NoticeId.BASELINE and n.metric_key == "heart_rate" for n in ev.notices)


def test_missing_non_daily_metric_is_reported_missing_without_daily_requirement():
    observations = [o for o in demo_observations() if o.metric_key != "lymphocyte_count"]
    ev = _evaluate(observations)
    assert _indicator(ev, "lymphocyte_count").status is IndicatorStatus.MISSING
    assert not any(r.metric_key == "lymphocyte_count" for r in ev.requirements)


def test_outdated_value_is_excluded_from_comparison_even_if_it_would_fire():
    observations = [
        obs(1, "heart_rate", 80, "2026-11-01T07:00:00Z"),
        obs(2, "heart_rate", 80, "2026-11-02T07:00:00Z"),
        obs(3, "heart_rate", 80, "2026-11-03T07:00:00Z"),
        obs(4, "heart_rate", 80, "2026-11-04T07:00:00Z"),
        obs(5, "heart_rate", 80, "2026-11-05T07:00:00Z"),
        obs(6, "heart_rate", 120, "2026-11-10T07:00:00Z"),  # > 24 h before as_of
    ]
    ev = _evaluate(observations)
    hr = _indicator(ev, "heart_rate")
    assert hr.freshness is Freshness.OUTDATED
    assert hr.status is IndicatorStatus.OUTDATED
    assert hr.baseline is None
    assert not ev.findings


def test_percent_threshold_is_inclusive():
    # Baseline median 80; latest 92 is exactly +15 % -> fires (threshold is >= 15 %).
    base = [obs(i, "heart_rate", 80, f"2026-11-0{i}T07:00:00Z") for i in range(1, 6)]
    latest = obs(10, "heart_rate", 92, "2026-11-13T07:00:00Z")
    ev = _evaluate(base + [latest], as_of=demo_as_of())
    assert [f.rule_id for f in ev.findings] == ["CV-HR-01"]
    assert ev.findings[0].change == 15.0


def test_just_below_threshold_does_not_fire():
    base = [obs(i, "heart_rate", 80, f"2026-11-0{i}T07:00:00Z") for i in range(1, 6)]
    latest = obs(10, "heart_rate", 91.9, "2026-11-13T07:00:00Z")
    ev = _evaluate(base + [latest], as_of=demo_as_of())
    assert ev.findings == ()
    assert _indicator(ev, "heart_rate").status is IndicatorStatus.NO_RULE_FIRED


def test_lymphocyte_without_previous_examination_is_not_evaluated():
    observations = [obs(1, "lymphocyte_count", 1.9, "2026-05-20T08:00:00Z")]
    ev = _evaluate(observations)
    lym = _indicator(ev, "lymphocyte_count")
    assert lym.status is IndicatorStatus.NOT_EVALUATED
    assert not ev.findings


def test_exercise_with_zero_weekly_baseline_is_not_evaluated():
    observations = [
        obs(1, "exercise_duration", 0, "2026-10-17T06:00:00Z"),
        obs(2, "exercise_duration", 0, "2026-10-10T06:00:00Z"),
        obs(3, "exercise_duration", 30, "2026-11-12T06:00:00Z"),
    ]
    ev = _evaluate(observations)
    ex = _indicator(ev, "exercise_duration")
    assert ex.status is IndicatorStatus.NOT_EVALUATED
    assert "zero" in (ex.note or "")


def test_exercise_rule_uses_only_entries_in_recent_window():
    # Recent window: Nov 6 07:30 - Nov 13 07:30 (only Nov 12 counts: 190 min).
    # Prior weekly totals: [700 (incl. Nov 5 500 + Oct 31 200), 200, 200, 200] -> median 200.
    observations = [
        obs(1, "exercise_duration", 200, "2026-10-31T06:00:00Z"),
        obs(2, "exercise_duration", 200, "2026-10-24T06:00:00Z"),
        obs(3, "exercise_duration", 200, "2026-10-17T06:00:00Z"),
        obs(4, "exercise_duration", 200, "2026-10-10T06:00:00Z"),
        obs(5, "exercise_duration", 500, "2026-11-05T06:00:00Z"),  # previous week, not recent
        obs(6, "exercise_duration", 190, "2026-11-12T06:00:00Z"),
    ]
    ev = _evaluate(observations)
    ex = _indicator(ev, "exercise_duration")
    assert ex.compared_value == 190.0
    assert ex.baseline.reference_value == 200.0
    assert ex.change_pct == -5.0
    assert not ev.findings
