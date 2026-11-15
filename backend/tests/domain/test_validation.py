from datetime import timedelta

import pytest

from app.domain.metrics import METRICS_BY_KEY
from app.domain.types import SourceType
from app.domain.validation import validate_measurement_input
from tests.factories import ts

NOW = ts("2026-11-13T07:30:00Z")


def _issues(**overrides):
    params = dict(
        spec=METRICS_BY_KEY["heart_rate"],
        value=80,
        unit="bpm",
        observed_at=NOW - timedelta(minutes=5),
        source_type=SourceType.SENSOR_READING,
        now=NOW,
    )
    params.update(overrides)
    return validate_measurement_input(**params)


def test_valid_input_has_no_issues():
    assert _issues() == []


@pytest.mark.parametrize("value", [19.9, 250.1, float("nan"), float("inf")])
def test_values_outside_plausibility_bounds_or_non_finite_are_rejected(value):
    issues = _issues(value=value)
    assert [i.field for i in issues] == ["value"]


def test_plausibility_bounds_are_inclusive():
    assert _issues(value=20) == []
    assert _issues(value=250) == []


def test_non_canonical_unit_is_rejected_without_conversion():
    issues = _issues(unit="kPa", spec=METRICS_BY_KEY["diastolic_bp"], value=70)
    assert [i.field for i in issues] == ["unit"]
    assert "Expected 'mmHg'" in issues[0].message


def test_future_timestamp_beyond_tolerance_is_rejected():
    issues = _issues(observed_at=NOW + timedelta(minutes=6))
    assert [i.field for i in issues] == ["observed_at"]


def test_future_timestamp_within_tolerance_is_accepted():
    assert _issues(observed_at=NOW + timedelta(minutes=4)) == []


def test_naive_timestamp_is_rejected():
    from datetime import datetime

    issues = _issues(observed_at=datetime(2026, 11, 13, 7, 0))
    assert [i.field for i in issues] == ["observed_at"]


def test_source_type_not_allowed_for_metric_is_rejected():
    issues = _issues(
        spec=METRICS_BY_KEY["lymphocyte_count"],
        value=2.0,
        unit="10^9/L",
        source_type=SourceType.MANUAL_INPUT,
    )
    assert [i.field for i in issues] == ["source_type"]


def test_field_prefix_points_into_nested_request_body():
    issues = _issues(value=500, field_prefix="new_measurements[2].")
    assert issues[0].field == "new_measurements[2].value"
