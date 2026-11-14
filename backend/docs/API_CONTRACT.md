# CrewSense Backend — API Contract (v1)

Base path: `/api/v1`. Format: JSON. Interactive docs: `/docs` (Swagger UI) and `/openapi.json`, generated from the same Pydantic schemas as this document.

> **Stability rule.** Field names, types, and enum values in this document are the contract. Additive changes (new optional fields, new endpoints, new rule IDs) are allowed. Renames, removals, or changed meanings require a version bump and prior agreement with the Frontend Owner.

> **Non-clinical.** Every response that carries alerts or recommendations includes the `disclaimer` string. Alerts describe changes from the astronaut's own history. They are not diagnoses.

## 0. Conventions

### Identity and time

- `astronaut_id` (integer) selects the astronaut. The MVP ships one demo astronaut with `id = 1`. Endpoints default to `1` when the parameter is omitted, so the frontend can integrate before a selector exists.
- All timestamps are ISO 8601 with an offset, normalised to UTC on output, for example `2026-11-13T07:12:00Z`.
- `as_of` (optional, on dashboard and scan submission) is the reference time for freshness and baselines. Default: server time. The demo uses a fixed `as_of` so results are reproducible.

### Provenance vocabulary

| Field | Values | Meaning |
|---|---|---|
| `source_type` (measurements) | `sensor_reading`, `manual_input`, `imported_examination` | Where a measurement came from. The API never creates demo values. |
| `source_type` (wellbeing) | `self_reported` | Wellbeing lives on the scan. |
| `is_synthetic` | `true` / `false` | `true` only for seeded demo data. |
| `validation_status` | `valid`, `plausibility_warning` | Values outside plausibility bounds are rejected (422) and never stored. |
| `freshness` | `current`, `outdated`, `missing` | Relative to `as_of` and the metric's freshness window. |

### Error envelope

Every error (4xx and 5xx) uses the same shape.

```json
{
  "error": {
    "code": "validation_error",
    "message": "One or more fields are invalid.",
    "details": [
      {"field": "value", "message": "Value 320 is outside the plausibility bounds 20–250 for heart_rate (bpm)."}
    ]
  }
}
```

| HTTP | `code` | When |
|---|---|---|
| 400 | `bad_request` | Malformed query parameter that cannot be parsed. |
| 404 | `not_found` | Unknown `astronaut_id`, `scan_id`, or `metric_key`. |
| 409 | `duplicate_measurement` | Same astronaut, metric, `observed_at`, and value already stored. |
| 422 | `validation_error` | Body or value fails validation. `details` lists each field. |
| 500 | `internal_error` | Unexpected failure. No internal detail is leaked. |

### Pagination

List endpoints return:

```json
{"items": [ ... ], "total": 42, "limit": 50, "offset": 0}
```

### Enumerations

| Name | Values |
|---|---|
| `category` | `cardiovascular`, `bone_muscle`, `immune`, `behavioral`, `nutrition`, `environmental` |
| `problem_area` | `cardiovascular`, `bone_muscle`, `immune`, `behavioral` |
| `problem_area.status` | `attention` (≥1 `attention` alert), `info` (only `info` alerts), `no_alerts` (evaluated, nothing fired), `not_evaluated` (no comparison possible) |
| `severity` | `info`, `attention` |
| `freshness` | `current`, `outdated`, `missing` |
| `indicator_status` | `rule_fired`, `no_rule_fired`, `not_evaluated`, `missing`, `outdated` |
| `symptom` | `headache`, `dizziness`, `nausea`, `fatigue`, `muscle_soreness`, `joint_pain`, `sleep_disturbance`, `other` |
| `data_notice_id` | `DQ-MISSING-01`, `DQ-OUTDATED-01`, `DQ-BASELINE-01`, `DQ-PLAUSIBILITY-01` |

---

## 1. `GET /api/v1/health`

Backend health check.

**Response 200**

```json
{
  "status": "ok",
  "version": "1.0.0",
  "database": "ok",
  "server_time": "2026-11-13T07:30:00Z"
}
```

---

## 2. `GET /api/v1/metrics`

Metric catalogue. Use it to build measurement forms: canonical unit, plausibility bounds, and allowed source types. The frontend should not hard-code these values.

**Response 200**

```json
{
  "items": [
    {
      "metric_key": "heart_rate",
      "display_name": "Heart rate",
      "category": "cardiovascular",
      "canonical_unit": "bpm",
      "description": "Beats per minute from a sensor reading or a manual count.",
      "plausible_min": 20,
      "plausible_max": 250,
      "freshness_hours": 24,
      "allowed_source_types": ["sensor_reading", "manual_input"]
    },
    {
      "metric_key": "systolic_bp",
      "display_name": "Systolic blood pressure",
      "category": "cardiovascular",
      "canonical_unit": "mmHg",
      "description": "Upper blood pressure value from a cuff measurement.",
      "plausible_min": 60,
      "plausible_max": 260,
      "freshness_hours": 72,
      "allowed_source_types": ["manual_input", "sensor_reading"]
    },
    {
      "metric_key": "diastolic_bp",
      "display_name": "Diastolic blood pressure",
      "category": "cardiovascular",
      "canonical_unit": "mmHg",
      "description": "Lower blood pressure value from a cuff measurement.",
      "plausible_min": 30,
      "plausible_max": 180,
      "freshness_hours": 72,
      "allowed_source_types": ["manual_input", "sensor_reading"]
    },
    {
      "metric_key": "exercise_duration",
      "display_name": "Exercise duration",
      "category": "bone_muscle",
      "canonical_unit": "min",
      "description": "Minutes of recorded physical activity. Activity is not a measure of bone density or muscle mass.",
      "plausible_min": 0,
      "plausible_max": 1440,
      "freshness_hours": 48,
      "allowed_source_types": ["manual_input", "sensor_reading"]
    },
    {
      "metric_key": "lymphocyte_count",
      "display_name": "Lymphocyte count",
      "category": "immune",
      "canonical_unit": "10^9/L",
      "description": "Lymphocyte count from an imported laboratory examination. The app does not measure immune status directly.",
      "plausible_min": 0,
      "plausible_max": 20,
      "freshness_hours": 4320,
      "allowed_source_types": ["imported_examination"]
    }
  ],
  "total": 5,
  "limit": 5,
  "offset": 0
}
```

---

## 3. `GET /api/v1/dashboard`

Consolidated dashboard. One call returns everything the unified screen needs.

**Query parameters**

| Name | Type | Default | Notes |
|---|---|---|---|
| `astronaut_id` | int | `1` | |
| `as_of` | datetime | server time | Reference time for freshness and baselines. |

**Response 200**

```json
{
  "generated_at": "2026-11-13T07:30:00Z",
  "as_of": "2026-11-13T07:30:00Z",
  "astronaut": {
    "id": 1,
    "display_id": "DEMO-CS-001",
    "display_name": "Demo Astronaut A",
    "mission_name": "Demo Mission",
    "is_synthetic": true
  },
  "mission": {
    "mission_day": 87,
    "mission_start_date": "2026-08-19"
  },
  "last_scan": {
    "id": 42,
    "as_of": "2026-11-12T07:30:00Z",
    "mission_day": 86,
    "submitted_at": "2026-11-12T07:31:10Z"
  },
  "wellbeing": {
    "source_type": "self_reported",
    "as_of": "2026-11-12T07:30:00Z",
    "required_today": true,
    "mood_score": 4,
    "stress_score": 4,
    "sleep_hours": 7.0,
    "symptoms": []
  },
  "problem_areas": [
    {"area": "cardiovascular", "label": "Cardiovascular", "status": "attention", "alert_count": 1, "indicator_keys": ["heart_rate", "systolic_bp", "diastolic_bp"]},
    {"area": "bone_muscle", "label": "Bone and muscle", "status": "attention", "alert_count": 1, "indicator_keys": ["exercise_duration"]},
    {"area": "immune", "label": "Immune (examination)", "status": "attention", "alert_count": 1, "indicator_keys": ["lymphocyte_count"]},
    {"area": "behavioral", "label": "Behavioral health", "status": "not_evaluated", "alert_count": 0, "indicator_keys": []}
  ],
  "indicators": [
    {
      "metric_key": "heart_rate",
      "display_name": "Heart rate",
      "category": "cardiovascular",
      "problem_area": "cardiovascular",
      "latest": {
        "measurement_id": 412,
        "value": 96.0,
        "unit": "bpm",
        "observed_at": "2026-11-13T07:12:00Z",
        "source_type": "sensor_reading",
        "source_detail": "Demo wearable (synthetic)",
        "validation_status": "valid",
        "is_synthetic": true
      },
      "freshness": "current",
      "age_hours": 0.3,
      "freshness_window_hours": 24,
      "baseline": {
        "baseline_id": 301,
        "method": "median_prior_observations_14d_v1",
        "reference_value": 81.0,
        "unit": "bpm",
        "observation_count": 13,
        "window_start": "2026-10-30T07:30:00Z",
        "window_end": "2026-11-13T07:30:00Z"
      },
      "change_pct": 18.5,
      "status": "rule_fired",
      "rule_ids": ["CV-HR-01"]
    },
    {
      "metric_key": "systolic_bp",
      "display_name": "Systolic blood pressure",
      "category": "cardiovascular",
      "problem_area": "cardiovascular",
      "latest": null,
      "freshness": "missing",
      "age_hours": null,
      "freshness_window_hours": 72,
      "baseline": null,
      "change_pct": null,
      "status": "missing",
      "rule_ids": []
    },
    {
      "metric_key": "diastolic_bp",
      "display_name": "Diastolic blood pressure",
      "category": "cardiovascular",
      "problem_area": "cardiovascular",
      "latest": {
        "measurement_id": 398,
        "value": 74.0,
        "unit": "mmHg",
        "observed_at": "2026-11-07T06:50:00Z",
        "source_type": "manual_input",
        "source_detail": "Manual cuff entry",
        "validation_status": "valid",
        "is_synthetic": true
      },
      "freshness": "outdated",
      "age_hours": 144.7,
      "freshness_window_hours": 72,
      "baseline": null,
      "change_pct": null,
      "status": "outdated",
      "rule_ids": []
    },
    {
      "metric_key": "exercise_duration",
      "display_name": "Exercise duration",
      "category": "bone_muscle",
      "problem_area": "bone_muscle",
      "latest": {
        "measurement_id": 455,
        "value": 35.0,
        "unit": "min",
        "observed_at": "2026-11-13T06:00:00Z",
        "source_type": "sensor_reading",
        "source_detail": "Demo activity log (synthetic)",
        "validation_status": "valid",
        "is_synthetic": true
      },
      "freshness": "current",
      "age_hours": 1.5,
      "freshness_window_hours": 48,
      "baseline": {
        "baseline_id": 302,
        "method": "median_prior_weekly_totals_4w_v1",
        "reference_value": 210.0,
        "unit": "min",
        "observation_count": 4,
        "window_start": "2026-10-09T07:30:00Z",
        "window_end": "2026-11-06T07:30:00Z"
      },
      "change_pct": -42.9,
      "status": "rule_fired",
      "rule_ids": ["BM-EX-01"]
    },
    {
      "metric_key": "lymphocyte_count",
      "display_name": "Lymphocyte count",
      "category": "immune",
      "problem_area": "immune",
      "latest": {
        "measurement_id": 390,
        "value": 1.9,
        "unit": "10^9/L",
        "observed_at": "2026-05-20T08:00:00Z",
        "source_type": "imported_examination",
        "source_detail": "Demo examination report EX-2026-05",
        "validation_status": "valid",
        "is_synthetic": true
      },
      "freshness": "current",
      "age_hours": 4247.5,
      "freshness_window_hours": 4320,
      "baseline": null,
      "change_pct": -20.8,
      "status": "rule_fired",
      "rule_ids": ["IM-LYM-01"]
    }
  ],
  "alerts": [
    {"rule_id": "CV-HR-01", "category": "cardiovascular", "severity": "attention", "title": "Heart rate above personal baseline", "metric_key": "heart_rate"},
    {"rule_id": "BM-EX-01", "category": "bone_muscle", "severity": "attention", "title": "Lower activity than personal recent weeks", "metric_key": "exercise_duration"},
    {"rule_id": "IM-LYM-01", "category": "immune", "severity": "attention", "title": "Lymphocyte count lower than previous examination", "metric_key": "lymphocyte_count"}
  ],
  "scan_requirements": [
    {
      "metric_key": "systolic_bp",
      "display_name": "Systolic blood pressure",
      "unit": "mmHg",
      "reason": "missing",
      "allowed_source_types": ["manual_input", "sensor_reading"]
    },
    {
      "metric_key": "diastolic_bp",
      "display_name": "Diastolic blood pressure",
      "unit": "mmHg",
      "reason": "outdated",
      "allowed_source_types": ["manual_input", "sensor_reading"]
    }
  ],
  "data_notices": [
    {"id": "DQ-MISSING-01", "metric_key": "systolic_bp", "message": "No systolic blood pressure value is stored. The comparison was not evaluated."},
    {"id": "DQ-OUTDATED-01", "metric_key": "diastolic_bp", "message": "The latest diastolic value is older than its 72-hour window and was excluded from comparison."}
  ],
  "disclaimer": "Prototype monitoring guidance. Alerts describe changes from this astronaut's own history. They are not medical diagnoses and require review by qualified medical personnel."
}
```

Notes for the frontend:

- `indicators` is ordered by `problem_area`, then `metric_key`.
- `alerts` and `rule_ids` are **evaluated live at `as_of`** and are read-only. They are not persisted and have no ids. Only `POST /scans` persists alerts (with ids). Wellbeing rules (`BH-*`) need a submitted scan, so before today's scan the behavioral area is `not_evaluated`.
- `latest` is `null` when no value exists. Never show a `null` as "normal".
- `status: "not_evaluated"` means data exists but a comparison could not be made (for example, insufficient baseline). Show it as not evaluated.
- `scan_requirements` is the list the Daily Health Scan should ask for. It contains only metrics that are missing or outdated.
- `wellbeing.required_today` is `true` when no scan exists for the current mission day.

---

## 4. `POST /api/v1/measurements`

Store one manual measurement or one imported examination result. Sensor ingestion uses `source_type: "sensor_reading"` with `source_detail` naming the device.

The API never creates synthetic data. Stored records have `is_synthetic: false`.

**Request body**

```json
{
  "astronaut_id": 1,
  "metric_key": "diastolic_bp",
  "value": 76,
  "unit": "mmHg",
  "observed_at": "2026-11-13T07:05:00Z",
  "source_type": "manual_input",
  "source_detail": "Manual cuff entry at morning check"
}
```

| Field | Required | Rules |
|---|---|---|
| `astronaut_id` | no (default `1`) | Must exist. |
| `metric_key` | yes | Must exist in the catalogue. |
| `value` | yes | Finite number within `plausible_min`…`plausible_max`. Outside → 422. |
| `unit` | yes | Must equal `canonical_unit` exactly. Otherwise 422. No automatic conversion. |
| `observed_at` | yes | ISO datetime. Must not be more than 5 minutes in the future. |
| `source_type` | yes | Must be in the metric's `allowed_source_types`. |
| `source_detail` | no | Max 200 characters. |

**Response 201**

```json
{
  "id": 456,
  "astronaut_id": 1,
  "metric_key": "diastolic_bp",
  "display_name": "Diastolic blood pressure",
  "category": "cardiovascular",
  "value": 76.0,
  "unit": "mmHg",
  "observed_at": "2026-11-13T07:05:00Z",
  "recorded_at": "2026-11-13T07:31:02Z",
  "source_type": "manual_input",
  "source_detail": "Manual cuff entry at morning check",
  "validation_status": "valid",
  "validation_notes": null,
  "is_synthetic": false
}
```

**Response 422 example**

```json
{
  "error": {
    "code": "validation_error",
    "message": "One or more fields are invalid.",
    "details": [
      {"field": "unit", "message": "Unit 'kPa' is not accepted for diastolic_bp. Expected 'mmHg'."}
    ]
  }
}
```

**Response 409 example** (same astronaut, metric, `observed_at`, and value already stored)

```json
{
  "error": {
    "code": "duplicate_measurement",
    "message": "An identical measurement already exists.",
    "details": [{"field": "observed_at", "message": "Existing measurement id 456."}]
  }
}
```

---

## 5. `GET /api/v1/measurements`

Measurement history.

**Query parameters**

| Name | Type | Default | Notes |
|---|---|---|---|
| `astronaut_id` | int | `1` | |
| `metric_key` | string | all | Optional filter. |
| `source_type` | string | all | Optional filter. |
| `from` / `to` | datetime | none | Filter on `observed_at`. |
| `limit` | int | `50` | 1–500. |
| `offset` | int | `0` | |

**Response 200**

```json
{
  "items": [
    {
      "id": 412,
      "astronaut_id": 1,
      "metric_key": "heart_rate",
      "display_name": "Heart rate",
      "category": "cardiovascular",
      "value": 96.0,
      "unit": "bpm",
      "observed_at": "2026-11-13T07:12:00Z",
      "recorded_at": "2026-11-13T07:12:05Z",
      "source_type": "sensor_reading",
      "source_detail": "Demo wearable (synthetic)",
      "validation_status": "valid",
      "validation_notes": null,
      "is_synthetic": true
    }
  ],
  "total": 118,
  "limit": 50,
  "offset": 0
}
```

Unknown `metric_key` → 404 `not_found`.

---

## 6. `POST /api/v1/scans`

Submit a Daily Health Scan. The backend stores the wellbeing assessment, optionally stores new measurements in the same request, runs the full pipeline, persists the scan, and returns the consolidated result.

Measurements in `new_measurements` follow the same rules as `POST /measurements`. If any entry fails validation, the whole request is rejected with 422 and nothing is stored.

**Request body**

```json
{
  "astronaut_id": 1,
  "as_of": "2026-11-13T07:30:00Z",
  "wellbeing": {
    "mood_score": 3,
    "stress_score": 6,
    "sleep_hours": 5.2,
    "symptoms": ["fatigue"],
    "notes": "Short night, feels tired."
  },
  "new_measurements": []
}
```

| Field | Required | Rules |
|---|---|---|
| `astronaut_id` | no (default `1`) | |
| `as_of` | no | Default: server time. Must not be more than 5 minutes in the future. |
| `wellbeing.mood_score` | yes | Integer 1–5. |
| `wellbeing.stress_score` | yes | Integer 0–10. |
| `wellbeing.sleep_hours` | yes | Number 0–24, one decimal place is typical. |
| `wellbeing.symptoms` | no | Array of `symptom` values. Unique. Default `[]`. |
| `wellbeing.notes` | no | Max 500 characters. |
| `new_measurements` | no | Array of measurement bodies (same fields as section 4 without `astronaut_id`). Max 20. |

**Response 201**

```json
{
  "id": 43,
  "astronaut_id": 1,
  "submitted_at": "2026-11-13T07:30:00Z",
  "as_of": "2026-11-13T07:30:00Z",
  "mission_day": 87,
  "processing_status": "completed",
  "wellbeing": {
    "source_type": "self_reported",
    "mood_score": 3,
    "stress_score": 6,
    "sleep_hours": 5.2,
    "symptoms": ["fatigue"],
    "notes": "Short night, feels tired."
  },
  "measurements_used": [
    {"measurement_id": 412, "metric_key": "heart_rate", "value": 96.0, "unit": "bpm", "observed_at": "2026-11-13T07:12:00Z", "source_type": "sensor_reading", "is_synthetic": true},
    {"measurement_id": 455, "metric_key": "exercise_duration", "value": 35.0, "unit": "min", "observed_at": "2026-11-13T06:00:00Z", "source_type": "sensor_reading", "is_synthetic": true},
    {"measurement_id": 390, "metric_key": "lymphocyte_count", "value": 1.9, "unit": "10^9/L", "observed_at": "2026-05-20T08:00:00Z", "source_type": "imported_examination", "is_synthetic": true}
  ],
  "baselines": [
    {"baseline_id": 301, "metric_key": "heart_rate", "method": "median_prior_observations_14d_v1", "reference_value": 81.0, "unit": "bpm", "observation_count": 13},
    {"baseline_id": 302, "metric_key": "exercise_duration", "method": "median_prior_weekly_totals_4w_v1", "reference_value": 210.0, "unit": "min", "observation_count": 4},
    {"baseline_id": 303, "metric_key": "sleep_hours", "method": "median_prior_scans_14d_v1", "reference_value": 6.8, "unit": "h", "observation_count": 6},
    {"baseline_id": 304, "metric_key": "mood_score", "method": "median_prior_scans_14d_v1", "reference_value": 4.0, "unit": "points", "observation_count": 6},
    {"baseline_id": 305, "metric_key": "stress_score", "method": "median_prior_scans_14d_v1", "reference_value": 4.5, "unit": "points", "observation_count": 6}
  ],
  "alerts": [
    {
      "id": 901,
      "category": "cardiovascular",
      "severity": "attention",
      "rule_id": "CV-HR-01",
      "title": "Heart rate above personal baseline",
      "explanation": "Heart rate is 96 bpm in the latest fresh reading, 18.5% above this astronaut's median of 81 bpm over the prior 14 days (13 observations). This describes a change from personal history, not a diagnosis.",
      "evidence": {
        "measurement_ids": [412],
        "baseline_id": 301,
        "values": {"latest": 96.0, "reference": 81.0, "change_pct": 18.5, "threshold_pct": 15}
      },
      "created_at": "2026-11-13T07:30:00Z"
    },
    {
      "id": 902,
      "category": "bone_muscle",
      "severity": "attention",
      "rule_id": "BM-EX-01",
      "title": "Lower activity than personal recent weeks",
      "explanation": "Recorded exercise over the last 7 days totals 120 min. This is 42.9% below the median weekly total of 210 min over the prior 4 weeks. Activity is not a measure of bone density or muscle mass.",
      "evidence": {
        "measurement_ids": [455],
        "baseline_id": 302,
        "values": {"latest": 120.0, "reference": 210.0, "change_pct": -42.9, "threshold_pct": -30}
      },
      "created_at": "2026-11-13T07:30:00Z"
    },
    {
      "id": 903,
      "category": "immune",
      "severity": "attention",
      "rule_id": "IM-LYM-01",
      "title": "Lymphocyte count lower than previous examination",
      "explanation": "The imported examination of 2026-05-20 reports 1.9 x 10^9/L, 20.8% below the previous imported examination of 2.4 x 10^9/L. This compares two examinations; it does not measure immune status.",
      "evidence": {
        "measurement_ids": [390, 371],
        "baseline_id": null,
        "values": {"latest": 1.9, "reference": 2.4, "change_pct": -20.8, "threshold_pct": -20}
      },
      "created_at": "2026-11-13T07:30:00Z"
    },
    {
      "id": 904,
      "category": "behavioral",
      "severity": "info",
      "rule_id": "BH-SLP-01",
      "title": "Self-reported sleep below personal baseline",
      "explanation": "Self-reported sleep is 5.2 h, 1.6 h below this astronaut's median of 6.8 h over the prior 14 days (6 scans). Sleep is self-reported and not verified by a sensor.",
      "evidence": {
        "measurement_ids": [],
        "baseline_id": 303,
        "values": {"latest": 5.2, "reference": 6.8, "change_abs": -1.6, "threshold_abs": -1.5}
      },
      "created_at": "2026-11-13T07:30:00Z"
    }
  ],
  "data_notices": [
    {"id": "DQ-MISSING-01", "metric_key": "systolic_bp", "message": "No systolic blood pressure value is stored. The comparison was not evaluated."},
    {"id": "DQ-OUTDATED-01", "metric_key": "diastolic_bp", "message": "The latest diastolic value is older than its 72-hour window and was excluded from comparison."}
  ],
  "summary": {
    "overall_status": "attention",
    "counts": {"alerts_attention": 3, "alerts_info": 1, "data_notices": 2},
    "problem_areas": [
      {"area": "cardiovascular", "status": "attention", "alert_count": 1},
      {"area": "bone_muscle", "status": "attention", "alert_count": 1},
      {"area": "immune", "status": "attention", "alert_count": 1},
      {"area": "behavioral", "status": "info", "alert_count": 1}
    ]
  },
  "next_steps": [
    {"priority": 1, "text": "Recheck heart rate at the next scan. Share this summary with the crew medical officer for review.", "related_alert_ids": [901]},
    {"priority": 2, "text": "Enter the missing systolic blood pressure value at the next scan.", "related_data_notice_ids": ["DQ-MISSING-01"]},
    {"priority": 3, "text": "Enter a current diastolic blood pressure value at the next scan.", "related_data_notice_ids": ["DQ-OUTDATED-01"]},
    {"priority": 4, "text": "Review the lymphocyte trend with the next scheduled examination.", "related_alert_ids": [903]}
  ],
  "disclaimer": "Prototype monitoring guidance. Alerts describe changes from this astronaut's own history. They are not medical diagnoses and require review by qualified medical personnel."
}
```

**Response 422 example**

```json
{
  "error": {
    "code": "validation_error",
    "message": "One or more fields are invalid.",
    "details": [
      {"field": "wellbeing.mood_score", "message": "Must be an integer between 1 and 5."}
    ]
  }
}
```

---

## 7. `GET /api/v1/scans/{scan_id}`

Full stored scan result, in the same shape as the `POST /scans` response. Stored results do not change when newer data arrives. Use this for offline caching.

**Response 200**: identical to section 6 response.

**Response 404**

```json
{"error": {"code": "not_found", "message": "Scan 999 was not found.", "details": []}}
```

---

## 8. `GET /api/v1/scans`

Scan history, newest first.

**Query parameters**: `astronaut_id` (default `1`), `limit` (default `20`, max `100`), `offset` (default `0`).

**Response 200**

```json
{
  "items": [
    {
      "id": 43,
      "as_of": "2026-11-13T07:30:00Z",
      "mission_day": 87,
      "submitted_at": "2026-11-13T07:30:00Z",
      "processing_status": "completed",
      "overall_status": "attention",
      "alert_count": 4
    },
    {
      "id": 42,
      "as_of": "2026-11-12T07:30:00Z",
      "mission_day": 86,
      "submitted_at": "2026-11-12T07:31:10Z",
      "processing_status": "completed",
      "overall_status": "not_evaluated",
      "alert_count": 0
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}
```

---

## 9. `GET /api/v1/alerts`

Monitoring alerts, newest first.

**Query parameters**

| Name | Default | Notes |
|---|---|---|
| `astronaut_id` | `1` | |
| `scan_id` | none | Alerts from one scan only. |
| `category` | all | `cardiovascular`, `bone_muscle`, `immune`, `behavioral`. |
| `severity` | all | `info`, `attention`. |
| `limit` / `offset` | `50` / `0` | |

**Response 200**

```json
{
  "items": [
    {
      "id": 901,
      "scan_id": 43,
      "category": "cardiovascular",
      "severity": "attention",
      "rule_id": "CV-HR-01",
      "title": "Heart rate above personal baseline",
      "explanation": "Heart rate is 96 bpm in the latest fresh reading, 18.5% above this astronaut's median of 81 bpm over the prior 14 days (13 observations). This describes a change from personal history, not a diagnosis.",
      "evidence": {"measurement_ids": [412], "baseline_id": 301, "values": {"latest": 96.0, "reference": 81.0, "change_pct": 18.5, "threshold_pct": 15}},
      "created_at": "2026-11-13T07:30:00Z"
    }
  ],
  "total": 4,
  "limit": 50,
  "offset": 0
}
```

Full alert list for Day 087 (ids 901–904) is in section 6.

---

## 10. Rule catalogue (for reference)

Rule IDs appear in `alerts.rule_id`. Thresholds are prototype defaults in `app/core/monitoring_config.py`. They are not clinical criteria.

| rule_id | Compares | Fires when | Severity |
|---|---|---|---|
| `CV-HR-01` | Latest fresh heart rate vs personal baseline | Change ≥ +15% | attention |
| `CV-SBP-01` | Latest fresh systolic BP vs personal baseline | Change ≥ +10% | attention |
| `CV-DBP-01` | Latest fresh diastolic BP vs personal baseline | Change ≥ +10% | attention |
| `BM-EX-01` | Last 7 days exercise vs median of prior 4 weekly totals | Change ≤ −30% | attention |
| `IM-LYM-01` | Latest imported lymphocyte count vs previous imported examination | Change ≤ −20% | attention |
| `BH-SLP-01` | Scan sleep vs wellbeing baseline | Change ≤ −1.5 h | info |
| `BH-MOOD-01` | Scan mood vs wellbeing baseline | Change ≤ −2 points | attention |
| `BH-STRESS-01` | Scan stress vs wellbeing baseline | Change ≥ +2.5 points | attention |

---

## 11. Demo workflow for the frontend

1. `GET /api/v1/dashboard?as_of=2026-11-13T07:30:00Z`, which returns Mission Day 087 with the demo state described above.
2. Show `scan_requirements`: systolic BP (missing) and diastolic BP (outdated).
3. `POST /api/v1/measurements` with a manual systolic and diastolic reading. Use `as_of` `2026-11-13T07:30:00Z` on the next dashboard call.
4. `POST /api/v1/scans` with `as_of` `2026-11-13T07:30:00Z` and the wellbeing values from section 6.
5. Show the returned summary, alerts, and next steps.
6. `GET /api/v1/scans/43` to reopen the saved scan offline.

Note: the demo values in step 4 are fixed so the results are reproducible. Submitting the same scan twice creates a second scan record. Scans are not deduplicated in v1.
