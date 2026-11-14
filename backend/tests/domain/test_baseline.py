from app.domain.baseline import (
    median_observation_baseline,
    weekly_exercise_baseline,
    wellbeing_baseline,
)
from app.domain.types import ValidationStatus
from tests.factories import obs, ts, wellbeing

AS_OF = ts("2026-11-13T07:30:00Z")


def test_median_uses_prior_observations_only_and_excludes_the_judged_value():
    observations = [
        obs(1, "heart_rate", 80, "2026-11-01T07:00:00Z"),
        obs(2, "heart_rate", 82, "2026-11-02T07:00:00Z"),
        obs(3, "heart_rate", 84, "2026-11-03T07:00:00Z"),
        obs(4, "heart_rate", 86, "2026-11-04T07:00:00Z"),
        obs(5, "heart_rate", 88, "2026-11-05T07:00:00Z"),
        obs(6, "heart_rate", 200, "2026-11-13T07:12:00Z"),  # judged value
    ]
    baseline = median_observation_baseline(
        metric_key="heart_rate",
        unit="bpm",
        observations=observations,
        as_of=AS_OF,
        exclude_measurement_id=6,
    )
    assert baseline.reference_value == 84
    assert baseline.observation_count == 5


def test_observations_outside_window_are_not_counted():
    observations = [obs(i, "heart_rate", 80, f"2026-11-0{i}T07:00:00Z") for i in range(1, 6)]
    observations.append(obs(99, "heart_rate", 500, "2026-10-01T07:00:00Z"))  # far outside window
    baseline = median_observation_baseline(
        metric_key="heart_rate",
        unit="bpm",
        observations=observations,
        as_of=AS_OF,
        exclude_measurement_id=None,
    )
    assert baseline.observation_count == 5
    assert baseline.reference_value == 80


def test_window_start_is_inclusive_and_as_of_is_exclusive():
    at_start = obs(1, "heart_rate", 70, "2026-10-30T07:30:00Z")  # exactly 14 days before
    at_as_of = obs(2, "heart_rate", 900, "2026-11-13T07:30:00Z")  # exactly as_of
    observations = [at_start, at_as_of] + [obs(10 + i, "heart_rate", 80, f"2026-11-0{i + 1}T07:00:00Z") for i in range(4)]
    baseline = median_observation_baseline(
        metric_key="heart_rate",
        unit="bpm",
        observations=observations,
        as_of=AS_OF,
        exclude_measurement_id=None,
    )
    assert baseline.observation_count == 5
    assert baseline.reference_value == 80


def test_insufficient_observations_yield_no_reference():
    observations = [obs(i, "heart_rate", 80, f"2026-11-0{i}T07:00:00Z") for i in range(1, 5)]
    baseline = median_observation_baseline(
        metric_key="heart_rate",
        unit="bpm",
        observations=observations,
        as_of=AS_OF,
        exclude_measurement_id=None,
    )
    assert baseline.observation_count == 4
    assert baseline.reference_value is None


def test_non_valid_observations_are_ignored():
    from dataclasses import replace

    good = [obs(i, "heart_rate", 80, f"2026-11-0{i}T07:00:00Z") for i in range(1, 6)]
    flagged = replace(obs(9, "heart_rate", 300, "2026-11-07T07:00:00Z"), validation_status=ValidationStatus.PLAUSIBILITY_WARNING)
    baseline = median_observation_baseline(
        metric_key="heart_rate",
        unit="bpm",
        observations=good + [flagged],
        as_of=AS_OF,
        exclude_measurement_id=None,
    )
    assert baseline.observation_count == 5


def test_weekly_exercise_baseline_uses_weeks_with_data_and_never_counts_empty_weeks_as_zero():
    # Week 1 (Oct 30 07:30 - Nov 6 07:30): 60 + 150 = 210
    # Week 2 (Oct 23 07:30 - Oct 30 07:30): no entries -> not data, not zero
    # Week 3 (Oct 16 07:30 - Oct 23 07:30): 225
    # Week 4 (Oct 9 07:30 - Oct 16 07:30): 210
    # Weeks with data: [210, 225, 210] -> median 210
    observations = [
        obs(1, "exercise_duration", 60, "2026-10-31T06:00:00Z"),
        obs(2, "exercise_duration", 150, "2026-11-04T06:00:00Z"),
        obs(3, "exercise_duration", 225, "2026-10-18T06:00:00Z"),
        obs(4, "exercise_duration", 210, "2026-10-11T06:00:00Z"),
    ]
    baseline = weekly_exercise_baseline(unit="min", observations=observations, as_of=AS_OF)
    assert baseline.observation_count == 3
    assert baseline.reference_value == 210.0


def test_weekly_exercise_baseline_needs_minimum_weeks_with_data():
    observations = [obs(1, "exercise_duration", 210, "2026-10-31T06:00:00Z")]
    baseline = weekly_exercise_baseline(unit="min", observations=observations, as_of=AS_OF)
    assert baseline.observation_count == 1
    assert baseline.reference_value is None


def test_wellbeing_baseline_uses_only_prior_scans_inside_window():
    prior = [
        wellbeing("2026-11-07T07:30:00Z", 4, 5, 6.5),
        wellbeing("2026-11-08T07:30:00Z", 5, 4, 6.8),
        wellbeing("2026-11-09T07:30:00Z", 3, 5, 6.5),
        wellbeing("2026-11-10T07:30:00Z", 4, 4, 7.2),
        wellbeing("2026-11-11T07:30:00Z", 5, 5, 6.8),
        wellbeing("2026-11-12T07:30:00Z", 4, 4, 7.0),
        wellbeing("2026-11-13T07:30:00Z", 1, 10, 0.0),  # the scan itself: must not be counted
        wellbeing("2026-09-01T07:30:00Z", 1, 1, 1.0),  # outside window
    ]
    baseline = wellbeing_baseline(field_name="sleep_hours", unit="h", prior_scans=prior, as_of=AS_OF)
    assert baseline.observation_count == 6
    assert baseline.reference_value == 6.8
