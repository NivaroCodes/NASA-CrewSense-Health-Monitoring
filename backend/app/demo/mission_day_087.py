"""Deterministic synthetic demo dataset: Mission Day 087.

DATA ONLY. This module contains literal values and no logic, no random generator
and no reference to the current clock. Every record is synthetic
(is_synthetic = True). The astronaut is a fictional demo identity.

The values are chosen so that the analysis of the demo scan produces the
results documented in docs/API_CONTRACT.md:

  * heart rate: 13 prior readings in the 14-day window with median 81 bpm,
    latest reading 96 bpm (+18.5%)               -> CV-HR-01 fires
  * exercise: prior weekly totals 210, 195, 225, 210 min (median 210),
    last 7 days 120 min (-42.9%)                 -> BM-EX-01 fires
  * lymphocyte count: 2.4 (2026-01-10) then 1.9 (2026-05-20), (-20.8%)
                                                  -> IM-LYM-01 fires
  * sleep: prior scans median 6.8 h, scan 5.2 h (-1.6 h) -> BH-SLP-01 (info)
  * systolic BP: never recorded                  -> DQ-MISSING-01
  * diastolic BP: last recorded 2026-11-07 (outdated) -> DQ-OUTDATED-01
"""

from __future__ import annotations

from datetime import date

DEMO_IDENTITY: dict[str, object] = {
    "display_id": "DEMO-CS-001",
    "display_name": "Demo Astronaut A",
    "mission_name": "Demo Mission",
    "mission_start_date": date(2026, 8, 19),
    "is_synthetic": True,
}

DEMO_AS_OF: str = "2026-11-13T07:30:00Z"
"""Fixed reference time for the Mission Day 087 scan (keeps results reproducible)."""

DEMO_MISSION_DAY: int = 87

_WEARABLE = "Demo wearable (synthetic)"
_ACTIVITY_LOG = "Demo activity log (synthetic)"
_MANUAL_CUFF = "Manual cuff entry (synthetic)"


def _sensor(metric_key: str, value: float, observed_at: str, detail: str) -> dict[str, object]:
    return {
        "metric_key": metric_key,
        "value": value,
        "observed_at": observed_at,
        "source_type": "sensor_reading",
        "source_detail": detail,
    }


def _exam(value: float, observed_at: str, detail: str) -> dict[str, object]:
    return {
        "metric_key": "lymphocyte_count",
        "value": value,
        "observed_at": observed_at,
        "source_type": "imported_examination",
        "source_detail": detail,
    }


MEASUREMENTS: tuple[dict[str, object], ...] = (
    # Heart rate: four readings before the baseline window (not counted),
    # then 13 readings inside the 14-day window (median 81 bpm), then the latest.
    _sensor("heart_rate", 80, "2026-10-27T07:12:00Z", _WEARABLE),
    _sensor("heart_rate", 82, "2026-10-28T07:12:00Z", _WEARABLE),
    _sensor("heart_rate", 79, "2026-10-29T07:12:00Z", _WEARABLE),
    _sensor("heart_rate", 81, "2026-10-30T07:12:00Z", _WEARABLE),
    _sensor("heart_rate", 79, "2026-10-31T07:12:00Z", _WEARABLE),
    _sensor("heart_rate", 81, "2026-11-01T07:12:00Z", _WEARABLE),
    _sensor("heart_rate", 84, "2026-11-02T07:12:00Z", _WEARABLE),
    _sensor("heart_rate", 78, "2026-11-03T07:12:00Z", _WEARABLE),
    _sensor("heart_rate", 80, "2026-11-04T07:12:00Z", _WEARABLE),
    _sensor("heart_rate", 82, "2026-11-05T07:12:00Z", _WEARABLE),
    _sensor("heart_rate", 81, "2026-11-06T07:12:00Z", _WEARABLE),
    _sensor("heart_rate", 85, "2026-11-07T07:12:00Z", _WEARABLE),
    _sensor("heart_rate", 80, "2026-11-08T07:12:00Z", _WEARABLE),
    _sensor("heart_rate", 83, "2026-11-09T07:12:00Z", _WEARABLE),
    _sensor("heart_rate", 81, "2026-11-10T07:12:00Z", _WEARABLE),
    _sensor("heart_rate", 79, "2026-11-11T07:12:00Z", _WEARABLE),
    _sensor("heart_rate", 82, "2026-11-12T07:12:00Z", _WEARABLE),
    _sensor("heart_rate", 96, "2026-11-13T07:12:00Z", _WEARABLE),

    # Diastolic blood pressure: last recorded 2026-11-07 (outdated on Day 087).
    # Systolic blood pressure: intentionally no records.
    {
        "metric_key": "diastolic_bp",
        "value": 74,
        "observed_at": "2026-11-07T06:50:00Z",
        "source_type": "manual_input",
        "source_detail": _MANUAL_CUFF,
    },

    # Exercise: four weekly totals before the recent window (210, 195, 225, 210 min),
    # then the recent 7-day window (40 + 45 + 35 = 120 min).
    _sensor("exercise_duration", 60, "2026-10-10T06:00:00Z", _ACTIVITY_LOG),
    _sensor("exercise_duration", 45, "2026-10-12T06:00:00Z", _ACTIVITY_LOG),
    _sensor("exercise_duration", 60, "2026-10-14T06:00:00Z", _ACTIVITY_LOG),
    _sensor("exercise_duration", 45, "2026-10-15T06:00:00Z", _ACTIVITY_LOG),
    _sensor("exercise_duration", 90, "2026-10-17T06:00:00Z", _ACTIVITY_LOG),
    _sensor("exercise_duration", 45, "2026-10-19T06:00:00Z", _ACTIVITY_LOG),
    _sensor("exercise_duration", 90, "2026-10-21T06:00:00Z", _ACTIVITY_LOG),
    _sensor("exercise_duration", 60, "2026-10-24T06:00:00Z", _ACTIVITY_LOG),
    _sensor("exercise_duration", 75, "2026-10-26T06:00:00Z", _ACTIVITY_LOG),
    _sensor("exercise_duration", 60, "2026-10-28T06:00:00Z", _ACTIVITY_LOG),
    _sensor("exercise_duration", 60, "2026-10-31T06:00:00Z", _ACTIVITY_LOG),
    _sensor("exercise_duration", 45, "2026-11-02T06:00:00Z", _ACTIVITY_LOG),
    _sensor("exercise_duration", 60, "2026-11-04T06:00:00Z", _ACTIVITY_LOG),
    _sensor("exercise_duration", 45, "2026-11-05T06:00:00Z", _ACTIVITY_LOG),
    _sensor("exercise_duration", 40, "2026-11-07T06:00:00Z", _ACTIVITY_LOG),
    _sensor("exercise_duration", 45, "2026-11-10T06:00:00Z", _ACTIVITY_LOG),
    _sensor("exercise_duration", 35, "2026-11-13T06:00:00Z", _ACTIVITY_LOG),

    # Lymphocyte count: two imported examinations (previous, then latest).
    _exam(2.4, "2026-01-10T08:00:00Z", "Demo examination report EX-2026-01 (synthetic)"),
    _exam(1.9, "2026-05-20T08:00:00Z", "Demo examination report EX-2026-05 (synthetic)"),
)

# Prior scans (wellbeing history). Analysis results for these historical scans are
# not replayed; they are stored with status "not_evaluated" and serve as baseline history.
PRIOR_SCANS: tuple[dict[str, object], ...] = (
    {"as_of": "2026-11-07T07:30:00Z", "mood_score": 4, "stress_score": 5, "sleep_hours": 6.5, "symptoms": []},
    {"as_of": "2026-11-08T07:30:00Z", "mood_score": 5, "stress_score": 4, "sleep_hours": 6.8, "symptoms": []},
    {"as_of": "2026-11-09T07:30:00Z", "mood_score": 3, "stress_score": 5, "sleep_hours": 6.5, "symptoms": ["fatigue"]},
    {"as_of": "2026-11-10T07:30:00Z", "mood_score": 4, "stress_score": 4, "sleep_hours": 7.2, "symptoms": []},
    {"as_of": "2026-11-11T07:30:00Z", "mood_score": 5, "stress_score": 5, "sleep_hours": 6.8, "symptoms": []},
    {"as_of": "2026-11-12T07:30:00Z", "mood_score": 4, "stress_score": 4, "sleep_hours": 7.0, "symptoms": []},
)

DEMO_SCAN: dict[str, object] = {
    "as_of": DEMO_AS_OF,
    "mood_score": 3,
    "stress_score": 6,
    "sleep_hours": 5.2,
    "symptoms": ["fatigue"],
    "notes": "Short night, feels tired.",
}
