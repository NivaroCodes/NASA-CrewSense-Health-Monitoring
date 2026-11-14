import pytest
from datetime import datetime, timezone
from pydantic import BaseModel, ValidationError

from app.schemas.common import UtcDatetime
from app.schemas.measurements import MeasurementCreate, MeasurementInput
from app.schemas.scans import ScanCreate, WellbeingInput

VALID_WELLBEING = {"mood_score": 3, "stress_score": 6, "sleep_hours": 5.2, "symptoms": ["fatigue"]}


def test_measurement_create_accepts_valid_manual_entry():
    body = MeasurementCreate(
        metric_key="diastolic_bp",
        value=76,
        unit="mmHg",
        observed_at="2026-11-13T07:05:00Z",
        source_type="manual_input",
        source_detail="Manual cuff entry",
    )
    assert body.astronaut_id == 1
    assert body.observed_at.tzinfo is not None


@pytest.mark.parametrize(
    "overrides",
    [
        {"value": float("inf")},
        {"observed_at": "2026-11-13T07:05:00"},  # naive timestamp
        {"source_type": "self_reported"},  # wellbeing is not a measurement source
        {"source_type": "guess"},
        {"unexpected": 1},  # extra fields are forbidden
    ],
)
def test_measurement_create_rejects_invalid_input(overrides):
    data = dict(
        metric_key="diastolic_bp",
        value=76,
        unit="mmHg",
        observed_at="2026-11-13T07:05:00Z",
        source_type="manual_input",
    )
    data.update(overrides)
    with pytest.raises(ValidationError):
        MeasurementCreate(**data)


@pytest.mark.parametrize(
    "overrides",
    [
        {"mood_score": 0},
        {"mood_score": 6},
        {"stress_score": 11},
        {"sleep_hours": 25},
        {"sleep_hours": -1},
        {"symptoms": ["fatigue", "fatigue"]},
        {"symptoms": ["not_a_symptom"]},
        {"notes": "x" * 501},
    ],
)
def test_wellbeing_bounds_and_vocabulary_are_enforced(overrides):
    data = {**VALID_WELLBEING, **overrides}
    with pytest.raises(ValidationError):
        WellbeingInput(**data)


def test_scan_create_limits_new_measurements_and_requires_aware_as_of():
    many = [
        MeasurementInput(
            metric_key="heart_rate",
            value=80 + i * 0.1,
            unit="bpm",
            observed_at="2026-11-13T07:00:00Z",
            source_type="manual_input",
        )
        for i in range(21)
    ]
    with pytest.raises(ValidationError):
        ScanCreate(wellbeing=VALID_WELLBEING, new_measurements=many)
    with pytest.raises(ValidationError):
        ScanCreate(wellbeing=VALID_WELLBEING, as_of="2026-11-13T07:30:00")


def test_scan_create_defaults():
    body = ScanCreate(wellbeing=VALID_WELLBEING)
    assert body.astronaut_id == 1
    assert body.as_of is None
    assert body.new_measurements == []
    assert body.wellbeing.notes is None


def test_utc_datetime_is_rendered_with_z_suffix():
    class Holder(BaseModel):
        at: UtcDatetime

    from datetime import timedelta

    tz_plus_five = timezone(timedelta(hours=5))
    rendered = Holder(at=datetime(2026, 11, 13, 12, 12, tzinfo=tz_plus_five)).model_dump(mode="json")
    assert rendered == {"at": "2026-11-13T07:12:00Z"}
