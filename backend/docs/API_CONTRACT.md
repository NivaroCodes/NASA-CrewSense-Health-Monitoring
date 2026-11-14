# CrewSense Backend — API Contract (v1)

Base path: `/api/v1`. Format: JSON. Interactive docs: `/docs` (Swagger UI) and `/openapi.json`, generated from the same Pydantic schemas as this document.

> **Stability rule.** Field names, types, and enum values in this document are the contract. Additive changes (new optional fields, new endpoints, new rule IDs) are allowed. Renames, removals, or changed meanings require a version bump and prior agreement with the Frontend Owner.

> **Non-clinical.** Every response that carries alerts or recommendations includes a `disclaimer`. Alerts describe changes from the astronaut's own history. They are not diagnoses.

> **Example ids.** Example `id` values assume a fresh database seeded with Mission Day 087 and then one Day 087 scan. Real ids depend on insertion order. Clients must treat ids as opaque.

## 0. Conventions

### Identity and time

- `astronaut_id` (integer) selects the astronaut. The MVP ships one demo astronaut with `id = 1`. Endpoints default to `1` when the parameter is omitted, so the frontend can integrate before a selector exists.
- All timestamps are ISO 8601 with an offset on input and UTC with a `Z` suffix on output, for example `2026-11-13T07:12:00Z`. Input timestamps without an offset are rejected.
- `as_of` (optional, on dashboard and scan submission) is the reference time for freshness and baselines. Default: server time. The demo uses a fixed `as_of` so results are reproducible.

### Provenance vocabulary

| Field | Values | Meaning |
|---|---|---|
| `source_type` (measurements) | `sensor_reading`, `manual_input`, `imported_examination` | Where a measurement came from. The API never creates demo values. |
| `source_type` (wellbeing) | `self_reported` | Wellbeing is captured on the scan, not as a measurement. |
| `is_synthetic` | `true` / `false` | `true` only for seeded demo data. API-submitted data is always `false`. |
| `validation_status` | `valid` | Values outside plausibility bounds are rejected (422) and never stored. `plausibility_warning` is reserved and not produced in v1. |
| `freshness` | `current`, `outdated`, `missing` | Relative to `as_of` and the metric's freshness window. |

### Error envelope

Every error (4xx and 5xx) uses the same shape. `details` is empty when the error is not about specific fields.

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

Nested fields use dot and bracket notation, for example `new_measurements[1].value` or `wellbeing.mood_score`.

| HTTP | `code` | When |
|---|---|---|
| 404 | `not_found` | Unknown `astronaut_id`, `scan_id`, or `metric_key`, or an unknown route. |
| 405 | `method_not_allowed` | Method not supported on the route. |
| 409 | `duplicate_measurement` | Same astronaut, metric, `observed_at`, and value already stored, or repeated in one request. |
| 422 | `validation_error` | Body, query, or value fails validation. `details` lists each field. |
| 500 | `internal_error` | Unexpected failure. No internal detail is leaked. |

### Pagination

List endpoints return:

```json
{"items": [ ... ], "total": 42, "limit": 50, "offset": 0}
```

### Enumerations

| Name | Values |
|---|---|
| `category` / `problem_area` | `cardiovascular`, `bone_muscle`, `immune`, `behavioral` (plus `nutrition`, `environmental` in the catalogue for later phases) |
| `severity` | `info`, `attention`. Describes "worth a look", not clinical urgency. |
| `freshness` | `current`, `outdated`, `missing` |
| `indicator.status` | `rule_fired`, `no_rule_fired`, `not_evaluated`, `missing`, `outdated` |
| `problem_area.status` | `attention` (at least one `attention` alert), `info` (only `info` alerts), `no_alerts` (evaluated, nothing fired), `not_evaluated` (no comparison possible) |
| `scan.overall_status` | Same values as `problem_area.status` |
| `scan.processing_status` | `completed` |
| `symptom` | `headache`, `dizziness`, `nausea`, `fatigue`, `muscle_soreness`, `joint_pain`, `sleep_disturbance`, `other` |
| `data_notice.id` | `DQ-MISSING-01`, `DQ-OUTDATED-01`, `DQ-BASELINE-01`, `DQ-PLAUSIBILITY-01` (reserved) |
| `change_unit` | `percent`, `absolute` |

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

`status` is `degraded` and `database` is `unavailable` when the database cannot be reached.

---

## 2. `GET /api/v1/metrics`

Metric catalogue. Use it to build measurement forms: canonical unit, plausibility bounds, and allowed source types. The frontend should not hard-code these values.

**Response 200** (abbreviated to two items; the list contains five)

```json
{
  "items": [
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

The five metrics are `heart_rate` (bpm), `systolic_bp` (mmHg), `diastolic_bp` (mmHg), `exercise_duration` (min), and `lymphocyte_count` (10^9/L).

---

## 3. `GET /api/v1/dashboard`

Consolidated dashboard. One call returns everything the unified screen needs.

The dashboard is **read-only**. It evaluates the monitoring rules at `as_of` and persists nothing. Alerts that appear here have no ids. Alerts are persisted only by `POST /scans`.

**Query parameters**

| Name | Type | Default | Notes |
|---|---|---|---|
| `astronaut_id` | int | `1` | |
| `as_of` | datetime | server time | Reference time for freshness and baselines. Observations after `as_of` are ignored. |

**Response 200** (Mission Day 087 before today's scan, with `as_of=2026-11-13T07:30:00Z`)

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
    "id": 6,
    "as_of": "2026-11-12T07:30:00Z",
    "mission_day": 86,
    "submitted_at": "2026-11-12T07:30:00Z"
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
        "measurement_id": 18,
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
      "compared_value": 96.0,
      "baseline": {
        "baseline_id": null,
        "method": "median_prior_observations_14d_v1",
        "reference_value": 81.0,
        "unit": "bpm",
        "observation_count": 13,
        "window_start": "2026-10-30T07:30:00Z",
        "window_end": "2026-11-13T07:30:00Z"
      },
      "change_pct": 18.5,
      "status": "rule_fired",
      "rule_ids": ["CV-HR-01"],
      "note": null
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
      "compared_value": null,
      "baseline": null,
      "change_pct": null,
      "status": "missing",
      "rule_ids": [],
      "note": null
    },
    {
      "metric_key": "diastolic_bp",
      "display_name": "Diastolic blood pressure",
      "category": "cardiovascular",
      "problem_area": "cardiovascular",
      "latest": {
        "measurement_id": 19,
        "value": 74.0,
        "unit": "mmHg",
        "observed_at": "2026-11-07T06:50:00Z",
        "source_type": "manual_input",
        "source_detail": "Manual cuff entry (synthetic)",
        "validation_status": "valid",
        "is_synthetic": true
      },
      "freshness": "outdated",
      "age_hours": 144.7,
      "freshness_window_hours": 72,
      "compared_value": null,
      "baseline": null,
      "change_pct": null,
      "status": "outdated",
      "rule_ids": [],
      "note": null
    },
    {
      "metric_key": "exercise_duration",
      "display_name": "Exercise duration",
      "category": "bone_muscle",
      "problem_area": "bone_muscle",
      "latest": {
        "measurement_id": 36,
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
      "compared_value": 120.0,
      "baseline": {
        "baseline_id": null,
        "method": "median_prior_weekly_totals_4w_v1",
        "reference_value": 210.0,
        "unit": "min",
        "observation_count": 4,
        "window_start": "2026-10-09T07:30:00Z",
        "window_end": "2026-11-06T07:30:00Z"
      },
      "change_pct": -42.9,
      "status": "rule_fired",
      "rule_ids": ["BM-EX-01"],
      "note": null
    },
    {
      "metric_key": "lymphocyte_count",
      "display_name": "Lymphocyte count",
      "category": "immune",
      "problem_area": "immune",
      "latest": {
        "measurement_id": 38,
        "value": 1.9,
        "unit": "10^9/L",
        "observed_at": "2026-05-20T08:00:00Z",
        "source_type": "imported_examination",
        "source_detail": "Demo examination report EX-2026-05 (synthetic)",
        "validation_status": "valid",
        "is_synthetic": true
      },
      "freshness": "current",
      "age_hours": 4247.5,
      "freshness_window_hours": 4320,
      "compared_value": 1.9,
      "baseline": null,
      "change_pct": -20.8,
      "status": "rule_fired",
      "rule_ids": ["IM-LYM-01"],
      "note": null
    }
  ],
  "alerts": [
    {"rule_id": "CV-HR-01", "category": "cardiovascular", "severity": "attention", "title": "Heart rate above personal baseline", "metric_key": "heart_rate"},
    {"rule_id": "BM-EX-01", "category": "bone_muscle", "severity": "attention", "title": "Lower activity than personal recent weeks", "metric_key": "exercise_duration"},
    {"rule_id": "IM-LYM-01", "category": "immune", "severity": "attention", "title": "Lymphocyte count lower than previous examination", "metric_key": "lymphocyte_count"}
  ],
  "scan_requirements": [
    {"metric_key": "systolic_bp", "display_name": "Systolic blood pressure", "unit": "mmHg", "reason": "missing", "allowed_source_types": ["manual_input", "sensor_reading"]},
    {"metric_key": "diastolic_bp", "display_name": "Diastolic blood pressure", "unit": "mmHg", "reason": "outdated", "allowed_source_types": ["manual_input", "sensor_reading"]}
  ],
  "data_notices": [
    {"id": "DQ-MISSING-01", "metric_key": "systolic_bp", "message": "No systolic blood pressure value is stored. The comparison was not evaluated."},
    {"id": "DQ-OUTDATED-01", "metric_key": "diastolic_bp", "message": "The latest diastolic blood pressure value is older than its 72-hour window and was excluded from comparison."}
  ],
  "disclaimer": "Prototype monitoring guidance. Alerts describe changes from this astronaut's own history. They are not medical diagnoses and require review by qualified medical personnel."
}
```

Notes for the frontend:

- `indicators` are ordered as in the metric catalogue: heart rate, systolic BP, diastolic BP, exercise, lymphocyte count.
- `latest` is `null` when no value exists. Never show a `null` as "normal".
- `compared_value` is the value a rule compared. For exercise it is the trailing 7-day total (120 min), not the latest entry (35 min). For other metrics it equals the latest value.
- `change_pct` is relative to `baseline.reference_value`. For lymphocyte count it is relative to the previous imported examination, and `baseline` is `null`.
- `baseline` is `null` when the reference is missing or the comparison is not possible. `note` then explains why.
- `status: "not_evaluated"` means data exists but no comparison could be made. Show it as not evaluated.
- `wellbeing.required_today` is `true` when the latest scan is not on the current mission day.
- The behavioral problem area is `not_evaluated` until a scan is submitted, because wellbeing rules need a scan.
- `scan_requirements` lists only daily metrics that are missing or outdated. Lymphocyte count is an examination and is not requested at every scan.

---

## 4. `POST /api/v1/measurements`

Store one manual measurement or one imported examination result. A sensor feed uses `source_type: "sensor_reading"` with `source_detail` naming the device.

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
| `astronaut_id` | no (default `1`) | Must exist, otherwise 404. |
| `metric_key` | yes | Must exist in the catalogue, otherwise 404. |
| `value` | yes | Finite number within `plausible_min`…`plausible_max` (inclusive). Otherwise 422. |
| `unit` | yes | Must equal `canonical_unit` exactly. Otherwise 422. No automatic conversion. |
| `observed_at` | yes | ISO datetime with an offset. Must not be more than 5 minutes in the future. |
| `source_type` | yes | Must be one of `sensor_reading`, `manual_input`, `imported_examination`, and allowed for the metric. Otherwise 422. |
| `source_detail` | no | Max 200 characters. |

**Response 201**

```json
{
  "id": 39,
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
    "details": [{"field": "observed_at", "message": "Existing measurement id 39."}]
  }
}
```

---

## 5. `GET /api/v1/measurements`

Measurement history, newest first.

**Query parameters**

| Name | Type | Default | Notes |
|---|---|---|---|
| `astronaut_id` | int | `1` | |
| `metric_key` | string | all | Optional filter. Unknown key → 404. |
| `source_type` | string | all | Optional filter. |
| `from` / `to` | datetime | none | Filter on `observed_at`. Offset required. |
| `limit` | int | `50` | 1–500. |
| `offset` | int | `0` | |

**Response 200** (one item shown)

```json
{
  "items": [
    {
      "id": 18,
      "astronaut_id": 1,
      "metric_key": "heart_rate",
      "display_name": "Heart rate",
      "category": "cardiovascular",
      "value": 96.0,
      "unit": "bpm",
      "observed_at": "2026-11-13T07:12:00Z",
      "recorded_at": "2026-11-13T07:12:00Z",
      "source_type": "sensor_reading",
      "source_detail": "Demo wearable (synthetic)",
      "validation_status": "valid",
      "validation_notes": null,
      "is_synthetic": true
    }
  ],
  "total": 38,
  "limit": 50,
  "offset": 0
}
```

---

## 6. `POST /api/v1/scans`

Submit a Daily Health Scan. The backend stores the wellbeing assessment, optionally stores new measurements in the same request, runs the full pipeline, persists the scan, and returns the consolidated result.

If any entry in `new_measurements` fails validation, the whole request is rejected with 422 and nothing is stored.

**Request body** (Mission Day 087)

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
| `wellbeing.sleep_hours` | yes | Number 0–24. |
| `wellbeing.symptoms` | no | Array of `symptom` values. Unique. Default `[]`. |
| `wellbeing.notes` | no | Max 500 characters. |
| `new_measurements` | no | Array of measurements with the fields of section 4 except `astronaut_id`. Max 20. Each is validated by the same rules as `POST /measurements`. |

**Response 201**

```json
{
  "id": 7,
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
    {"measurement_id": 18, "metric_key": "heart_rate", "value": 96.0, "unit": "bpm", "observed_at": "2026-11-13T07:12:00Z", "source_type": "sensor_reading", "is_synthetic": true},
    {"measurement_id": 36, "metric_key": "exercise_duration", "value": 35.0, "unit": "min", "observed_at": "2026-11-13T06:00:00Z", "source_type": "sensor_reading", "is_synthetic": true},
    {"measurement_id": 38, "metric_key": "lymphocyte_count", "value": 1.9, "unit": "10^9/L", "observed_at": "2026-05-20T08:00:00Z", "source_type": "imported_examination", "is_synthetic": true}
  ],
  "baselines": [
    {"baseline_id": 1, "metric_key": "heart_rate", "method": "median_prior_observations_14d_v1", "reference_value": 81.0, "unit": "bpm", "observation_count": 13, "window_start": "2026-10-30T07:30:00Z", "window_end": "2026-11-13T07:30:00Z"},
    {"baseline_id": 2, "metric_key": "exercise_duration", "method": "median_prior_weekly_totals_4w_v1", "reference_value": 210.0, "unit": "min", "observation_count": 4, "window_start": "2026-10-09T07:30:00Z", "window_end": "2026-11-06T07:30:00Z"},
    {"baseline_id": 3, "metric_key": "mood_score", "method": "median_prior_scans_14d_v1", "reference_value": 4.0, "unit": "points", "observation_count": 6, "window_start": "2026-10-30T07:30:00Z", "window_end": "2026-11-13T07:30:00Z"},
    {"baseline_id": 4, "metric_key": "stress_score", "method": "median_prior_scans_14d_v1", "reference_value": 4.5, "unit": "points", "observation_count": 6, "window_start": "2026-10-30T07:30:00Z", "window_end": "2026-11-13T07:30:00Z"},
    {"baseline_id": 5, "metric_key": "sleep_hours", "method": "median_prior_scans_14d_v1", "reference_value": 6.8, "unit": "h", "observation_count": 6, "window_start": "2026-10-30T07:30:00Z", "window_end": "2026-11-13T07:30:00Z"}
  ],
  "alerts": [
    {
      "id": 1,
      "scan_id": 7,
      "category": "cardiovascular",
      "severity": "attention",
      "rule_id": "CV-HR-01",
      "title": "Heart rate above personal baseline",
      "explanation": "Heart rate is 96 bpm in the latest fresh reading, 18.5% above this astronaut's median of 81 bpm over the prior 14 days (13 observations). This describes a change from personal history, not a diagnosis.",
      "evidence": {
        "measurement_ids": [18],
        "baseline_id": 1,
        "values": {"latest": 96.0, "reference": 81.0, "change": 18.5, "change_unit": "percent", "threshold": 15.0}
      },
      "created_at": "2026-11-13T07:30:00Z"
    },
    {
      "id": 2,
      "scan_id": 7,
      "category": "bone_muscle",
      "severity": "attention",
      "rule_id": "BM-EX-01",
      "title": "Lower activity than personal recent weeks",
      "explanation": "Recorded exercise over the last 7 days totals 120 min. This is 42.9% below the median weekly total of 210 min over the prior 4 weeks with data. Activity is not a measure of bone density or muscle mass.",
      "evidence": {
        "measurement_ids": [34, 35, 36],
        "baseline_id": 2,
        "values": {"latest": 120.0, "reference": 210.0, "change": -42.9, "change_unit": "percent", "threshold": -30.0}
      },
      "created_at": "2026-11-13T07:30:00Z"
    },
    {
      "id": 3,
      "scan_id": 7,
      "category": "immune",
      "severity": "attention",
      "rule_id": "IM-LYM-01",
      "title": "Lymphocyte count lower than previous examination",
      "explanation": "The imported examination of 2026-05-20 reports 1.9 x 10^9/L, 20.8% below the previous imported examination of 2.4 x 10^9/L. This compares two examinations; it does not measure immune status.",
      "evidence": {
        "measurement_ids": [38, 37],
        "baseline_id": null,
        "values": {"latest": 1.9, "reference": 2.4, "change": -20.8, "change_unit": "percent", "threshold": -20.0}
      },
      "created_at": "2026-11-13T07:30:00Z"
    },
    {
      "id": 4,
      "scan_id": 7,
      "category": "behavioral",
      "severity": "info",
      "rule_id": "BH-SLP-01",
      "title": "Self-reported sleep below personal baseline",
      "explanation": "Self-reported sleep is 5.2 h, 1.6 h below this astronaut's median of 6.8 h over the prior 14 days (6 scans). Sleep is self-reported and not verified by a sensor.",
      "evidence": {
        "measurement_ids": [],
        "baseline_id": 5,
        "values": {"latest": 5.2, "reference": 6.8, "change": -1.6, "change_unit": "absolute", "threshold": -1.5}
      },
      "created_at": "2026-11-13T07:30:00Z"
    }
  ],
  "data_notices": [
    {"id": "DQ-MISSING-01", "metric_key": "systolic_bp", "message": "No systolic blood pressure value is stored. The comparison was not evaluated."},
    {"id": "DQ-OUTDATED-01", "metric_key": "diastolic_bp", "message": "The latest diastolic blood pressure value is older than its 72-hour window and was excluded from comparison."}
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
    {"priority": 1, "text": "Recheck heart rate at the next scan. Share this summary with the crew medical officer for review.", "related_rule_ids": ["CV-HR-01"], "related_notice_ids": []},
    {"priority": 2, "text": "Review recorded activity at the next scan. Share this summary with the crew medical officer for review.", "related_rule_ids": ["BM-EX-01"], "related_notice_ids": []},
    {"priority": 3, "text": "Review the lymphocyte trend with the next scheduled examination. Share this summary with the crew medical officer for review.", "related_rule_ids": ["IM-LYM-01"], "related_notice_ids": []},
    {"priority": 4, "text": "Enter the missing systolic blood pressure value at the next scan.", "related_rule_ids": [], "related_notice_ids": ["DQ-MISSING-01"]},
    {"priority": 5, "text": "Enter a current diastolic blood pressure value at the next scan.", "related_rule_ids": [], "related_notice_ids": ["DQ-OUTDATED-01"]},
    {"priority": 6, "text": "Keep monitoring sleep (self-reported) at the next scan.", "related_rule_ids": ["BH-SLP-01"], "related_notice_ids": []}
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
      {"field": "wellbeing.mood_score", "message": "Input should be less than or equal to 5"}
    ]
  }
}
```

---

## 7. `GET /api/v1/scans/{scan_id}`

Full stored scan result, in the same shape as the `POST /scans` response. The result is read from storage, so a scan retrieved later is identical to the response on submission. Use this for offline caching.

**Response 200**: identical to the section 6 response.

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
      "id": 7,
      "as_of": "2026-11-13T07:30:00Z",
      "mission_day": 87,
      "submitted_at": "2026-11-13T07:30:00Z",
      "processing_status": "completed",
      "overall_status": "attention",
      "alert_count": 4
    },
    {
      "id": 6,
      "as_of": "2026-11-12T07:30:00Z",
      "mission_day": 86,
      "submitted_at": "2026-11-12T07:30:00Z",
      "processing_status": "completed",
      "overall_status": "not_evaluated",
      "alert_count": 0
    }
  ],
  "total": 7,
  "limit": 20,
  "offset": 0
}
```

Scans seeded as wellbeing history are stored with `overall_status: "not_evaluated"` and no alerts. Their analysis is not replayed.

---

## 9. `GET /api/v1/alerts`

Monitoring alerts persisted by scans, newest first. Dashboard alerts are not included.

**Query parameters**

| Name | Default | Notes |
|---|---|---|
| `astronaut_id` | `1` | |
| `scan_id` | none | Alerts from one scan only. Unknown scan → 404. |
| `category` | all | `cardiovascular`, `bone_muscle`, `immune`, `behavioral`. |
| `severity` | all | `info`, `attention`. |
| `limit` / `offset` | `50` / `0` | |

**Response 200** (one item shown)

```json
{
  "items": [
    {
      "id": 1,
      "scan_id": 7,
      "category": "cardiovascular",
      "severity": "attention",
      "rule_id": "CV-HR-01",
      "title": "Heart rate above personal baseline",
      "explanation": "Heart rate is 96 bpm in the latest fresh reading, 18.5% above this astronaut's median of 81 bpm over the prior 14 days (13 observations). This describes a change from personal history, not a diagnosis.",
      "evidence": {
        "measurement_ids": [18],
        "baseline_id": 1,
        "values": {"latest": 96.0, "reference": 81.0, "change": 18.5, "change_unit": "percent", "threshold": 15.0}
      },
      "created_at": "2026-11-13T07:30:00Z"
    }
  ],
  "total": 4,
  "limit": 50,
  "offset": 0
}
```

---

## 10. Rule catalogue (for reference)

Rule IDs appear in `alerts.rule_id` and `indicator.rule_ids`. Thresholds are prototype defaults in `app/core/monitoring_config.py`. They are not clinical criteria. The `threshold` in evidence carries its sign: a rule that fires on a rise has a positive threshold, and a rule that fires on a fall has a negative one.

| rule_id | Compares | Fires when | Severity |
|---|---|---|---|
| `CV-HR-01` | Latest fresh heart rate vs personal baseline | Percent change ≥ +15 | attention |
| `CV-SBP-01` | Latest fresh systolic BP vs personal baseline | Percent change ≥ +10 | attention |
| `CV-DBP-01` | Latest fresh diastolic BP vs personal baseline | Percent change ≥ +10 | attention |
| `BM-EX-01` | Trailing 7-day exercise total vs median of prior 4 weekly totals | Percent change ≤ −30 | attention |
| `IM-LYM-01` | Latest imported lymphocyte count vs previous imported examination | Percent change ≤ −20 | attention |
| `BH-SLP-01` | Scan sleep vs prior-scan median | Absolute change ≤ −1.5 h | info |
| `BH-MOOD-01` | Scan mood vs prior-scan median | Absolute change ≤ −2 points | attention |
| `BH-STRESS-01` | Scan stress vs prior-scan median | Absolute change ≥ +2.5 points | attention |

---

## 11. Demo workflow for the frontend

1. `GET /api/v1/dashboard?as_of=2026-11-13T07:30:00Z`. This returns Mission Day 087 in the state described in section 3.
2. Show `scan_requirements`: systolic BP (missing) and diastolic BP (outdated).
3. `POST /api/v1/measurements` with a manual systolic and diastolic reading. Use the same `as_of` on the next dashboard call.
4. `POST /api/v1/scans` with `as_of` `2026-11-13T07:30:00Z` and the wellbeing values from section 6.
5. Show the returned summary, alerts, and next steps.
6. `GET /api/v1/scans/7` to reopen the saved scan offline.

Scans are not deduplicated in v1. Submitting the same scan twice stores two scan records.
