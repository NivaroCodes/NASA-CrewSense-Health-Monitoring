# CrewSense Backend — Architecture

Status: Phase 1 design. Owner: Backend. Frontend contract: see `API_CONTRACT.md`.

> **Non-clinical prototype.** CrewSense is a monitoring and decision-support prototype. It does not diagnose, does not prescribe treatment, and does not measure immune status, bone density, or muscle mass directly. Every rule in this document is an explicit, configurable, deterministic heuristic that compares a value against the astronaut's own history. No universal clinical thresholds are used.

## 1. Goals

- One backend that serves one unified dashboard and one Daily Health Scan workflow.
- Every stored value carries its provenance (source type, unit, timestamp, validation status, synthetic flag).
- Every alert is traceable to the measurements, the baseline, and the rule that produced it.
- Deterministic behaviour: the same stored data and the same `as_of` time always produce the same output. This is what makes the Mission Day 087 demo reproducible.

## 2. Stack

| Concern | Choice | Reason |
|---|---|---|
| Language | Python 3.11+ | Target floor. The local interpreters are 3.11, 3.12 and 3.13. The code avoids 3.12-only syntax. |
| API | FastAPI | OpenAPI/Swagger generated from Pydantic schemas. |
| Validation | Pydantic v2 | Request/response schemas and typed domain input. |
| Persistence | SQLAlchemy 2.x ORM on SQLite | Simple, offline-capable local file. No separate DB server. |
| Tests | pytest (+ httpx for FastAPI's TestClient) | Standard tooling. |

Not used: PostgreSQL, Redis, Celery, message brokers, ML models, microservices. None is justified for an MVP that must run from one command.

## 3. Modular monolith layout

```text
backend/
├── app/
│   ├── main.py                 # create_app(): wires routers, error handlers, DB init
│   ├── api/
│   │   ├── dependencies.py     # DB session provider, shared query parameters
│   │   └── routes/             # thin HTTP layer: parse, call service, map errors
│   ├── core/
│   │   ├── config.py           # Settings (env-driven: database URL, demo seeding)
│   │   ├── database.py         # engine, SessionLocal, Base, init_db()
│   │   └── monitoring_config.py# ALL rule thresholds, freshness windows, baseline policy
│   ├── domain/                 # pure Python: no FastAPI, no SQLAlchemy imports
│   │   ├── types.py            # frozen dataclasses: MeasurementInput, Observation, Baseline, RuleResult, ...
│   │   ├── units.py            # canonical units and unit conversions (if any)
│   │   └── metrics.py          # canonical MetricDefinition catalogue (seed source)
│   ├── models/                 # SQLAlchemy ORM tables
│   ├── schemas/                # Pydantic request/response models (the public contract)
│   ├── repositories/           # persistence queries; convert ORM rows <-> domain types
│   ├── services/
│   │   ├── validation_service.py   # value, unit, timestamp, source checks
│   │   ├── measurement_service.py  # create/retrieve measurements (uses validation)
│   │   ├── baseline_service.py     # personal baseline computation
│   │   ├── analysis_service.py     # compatible comparisons + configured rules
│   │   ├── alert_service.py        # alert objects with explanation and evidence
│   │   ├── recommendation_service.py # non-clinical next-step guidance
│   │   ├── scan_service.py         # orchestrates the full pipeline and persists the scan
│   │   └── dashboard_service.py    # aggregates latest state for the dashboard
│   └── demo/
│       └── mission_day_087.py  # deterministic synthetic dataset (data only, no logic)
├── tests/
├── docs/
├── requirements.txt
└── README.md
```

### Why a `domain/` layer

The assignment proposes `services/` as the home of the logic. The pure analytical code (validation, baseline, rules, alerts) is placed in `domain/` plus `services/` so that it has **no database or web dependency**. Benefits: the monitoring logic is unit-testable with plain pytest and runs without FastAPI or SQLAlchemy installed. Services that touch persistence (`measurement_service`, `scan_service`, `dashboard_service`) call into the pure functions. This split is the only deviation from the proposed structure and is justified by the offline/testing constraints above.

## 4. Processing pipeline

```text
POST /scans  (or POST /measurements for a single entry)
    │
    ▼
Measurement intake ──► Validation (value range, unit, timestamp, source, synthetic flag)
    │                       rejected input → HTTP 422, nothing persisted
    ▼
Freshness classification (current | outdated | missing) per metric, against as_of
    │
    ▼
Baseline (personal history, excluding the current scan's own values)
    │
    ▼
Analysis (only compatible metrics and units; insufficient data → no comparison)
    │
    ▼
Rules (configured, deterministic) ──► RuleResult(fired or not, evidence, numbers)
    │
    ▼
Alerts (fired rules only: category, severity, explanation, evidence, rule_id)
    │
    ▼
Recommendations (non-clinical next steps keyed by category and severity)
    │
    ▼
Scan summary persisted (HealthScan + linked measurements + alerts + baselines)
```

Rules that are not evaluated (missing data, too little history, outdated values) are reported as **data notices**, never silently treated as normal.

## 5. Data model

All timestamps are stored as UTC ISO 8601 with offset. Units are canonical per metric; the API rejects a unit that is not the canonical unit for that metric (no silent conversion in the MVP).

### 5.1 `astronauts`

| Column | Type | Notes |
|---|---|---|
| id | int PK | |
| display_id | str unique | Demo identity, e.g. `DEMO-CS-001`. Never a real person's identifier. |
| display_name | str | Demo name, e.g. `Demo Astronaut A`. |
| mission_name | str | e.g. `Demo Mission`. |
| mission_start_date | date | Used to derive Mission Day: `day = (scan_date − start) + 1`. |
| is_synthetic | bool | True for every seeded demo astronaut. |

### 5.2 `metric_definitions`

| Column | Type | Notes |
|---|---|---|
| metric_key | str PK | Stable identifier, e.g. `heart_rate`. |
| display_name | str | |
| canonical_unit | str | e.g. `bpm`. |
| category | str | `cardiovascular`, `bone_muscle`, `immune`, `behavioral`, `nutrition`, `environmental`. |
| description | str | Plain-language definition and limitation. |
| plausible_min / plausible_max | float | **Input plausibility bounds** (is this value physically possible for a recording?). Not clinical thresholds. |
| freshness_hours | float | Data-management window: older than this is "outdated". Configured in `monitoring_config.py`; seeded from there. |
| is_wellbeing | bool | Wellbeing items live on the scan, not in `measurements`. |

Seeded metrics (P0 + one P1 exam marker):

| metric_key | Unit | Category | Source types normally used |
|---|---|---|---|
| `heart_rate` | bpm | cardiovascular | sensor_reading, manual_input |
| `systolic_bp` | mmHg | cardiovascular | manual_input, sensor_reading |
| `diastolic_bp` | mmHg | cardiovascular | manual_input, sensor_reading |
| `exercise_duration` | min | bone_muscle | manual_input, sensor_reading |
| `lymphocyte_count` | 10^9/L | immune | imported_examination only |

Wellbeing (mood, stress, sleep, symptoms) is captured as self-report on the `health_scans` row, not as measurements. Hydration and nutrition are P1 and are not seeded in this phase.

### 5.3 `measurements`

| Column | Type | Notes |
|---|---|---|
| id | int PK | |
| astronaut_id | FK | |
| metric_key | FK | |
| value | float | |
| unit | str | Must equal the metric's canonical unit. |
| observed_at | datetime (UTC) | When the value was recorded or the exam was taken. |
| recorded_at | datetime (UTC) | When CrewSense stored it. |
| source_type | enum | `sensor_reading`, `manual_input`, `imported_examination`. (Wellbeing is `self_reported` on the scan.) |
| source_detail | str nullable | Free text provenance, e.g. device name, lab report reference. |
| is_synthetic | bool | True for demo data. |
| validation_status | enum | `valid` or `plausibility_warning`. Values outside plausibility bounds are rejected, never stored. |
| validation_notes | str nullable | Human-readable reason for a warning. |

Index: `(astronaut_id, metric_key, observed_at)`.

### 5.4 `health_scans`

| Column | Type | Notes |
|---|---|---|
| id | int PK | |
| astronaut_id | FK | |
| submitted_at | datetime (UTC) | Server time when accepted, or client-supplied `submitted_at` when provided and valid. |
| as_of | datetime (UTC) | Reference time for freshness and baselines. Defaults to `submitted_at`. Demo uses a fixed value. |
| mission_day | int | Derived from `mission_start_date` and `as_of`. |
| mood_score | int | Self-report, 1–5. |
| stress_score | int | Self-report, 0–10. |
| sleep_hours | float | Self-report, 0–24. |
| symptoms | JSON list | Keys from a fixed symptom vocabulary (see API contract). Self-reported. |
| notes | str nullable | Free text, max 500 chars. |
| processing_status | enum | `completed`. Scans are processed synchronously in the MVP; the column exists so asynchronous processing can be added without a schema change. |
| summary | JSON | Consolidated overview: counts, status per problem area, data notices. |

### 5.5 `scan_measurements`

Association table `(scan_id, measurement_id)`. Records which measurements the scan used, so a scan can be re-read later even if newer data arrives.

### 5.6 `baselines`

Snapshot of each baseline computed during a scan.

| Column | Type | Notes |
|---|---|---|
| id | int PK | |
| scan_id | FK | Baselines are per scan, so historical scans keep the reference they were judged against. |
| astronaut_id, metric_key | | |
| method | str | e.g. `median_prior_observations_14d_v1`. |
| reference_value | float nullable | Median; null when insufficient data. |
| observation_count | int | Number of prior observations used. |
| window_start, window_end | datetime | |
| calculated_at | datetime | |

### 5.7 `alerts`

| Column | Type | Notes |
|---|---|---|
| id | int PK | |
| scan_id | FK | |
| category | enum | `cardiovascular`, `bone_muscle`, `immune`, `behavioral`. |
| severity | enum | `info`, `attention`. Severity describes "worth a look", not clinical urgency. |
| rule_id | str | e.g. `CV-HR-01`. Points to the catalogue in `monitoring_config.py`. |
| title | str | |
| explanation | str | Plain-language, non-clinical, with the actual numbers. |
| evidence | JSON | `{"measurement_ids": [...], "baseline_id": ..., "values": {...}}`. |
| created_at | datetime | |

## 6. Monitoring logic

### 6.1 Principles

1. **Compare only compatible values.** A baseline is always for the same metric and unit.
2. **Missing is not normal.** A rule with no data produces a data notice, not an "OK" result.
3. **No silent staleness.** A value older than its `freshness_hours` is labelled outdated and is excluded from current comparisons. It is shown with its age.
4. **Personal baselines first.** Rules compare against the astronaut's own history. Metrics with too little history report "insufficient baseline" instead of inventing a reference.
5. **Explainable.** Each fired rule stores the numbers it used.
6. **Correlation is not causation.** Explanations say "changed compared with", never "caused by".

### 6.2 Baseline policy (`baseline_service`)

- Source observations: valid measurements of the metric for the same astronaut, observed in the 14 days before the scan's `as_of`, **excluding** values that belong to the current scan.
- Method `median_prior_observations_14d_v1`: reference = median of observations.
- Minimum observations: 5 (configurable). Below that, `reference_value = null` and rules needing it emit a data notice.
- For `exercise_duration`, the baseline is special: weekly totals over the 4 full weeks before the current week, with reference = median weekly total and minimum 2 weeks with data.
- For `lymphocyte_count`, no baseline is used. The comparison is with the previous imported examination.
- Self-reported wellbeing baselines (mood, stress, sleep) use prior scans in the same 14-day window, minimum 5 scans.

### 6.3 Rules catalogue (v1)

All rules, thresholds and windows live in `app/core/monitoring_config.py`. Each rule has an id, description, inputs, and the explanation template. The table below is the design; the code is the source of truth.

| rule_id | Category | Compares | Fires when (prototype heuristic) | Severity |
|---|---|---|---|---|
| `CV-HR-01` | cardiovascular | Latest fresh heart rate vs personal baseline | Change ≥ +15% | attention |
| `CV-SBP-01` | cardiovascular | Latest fresh systolic BP vs personal baseline | Change ≥ +10% | attention |
| `CV-DBP-01` | cardiovascular | Latest fresh diastolic BP vs personal baseline | Change ≥ +10% | attention |
| `BM-EX-01` | bone_muscle | Last 7 days exercise total vs median of prior 4 weekly totals | Change ≤ −30% | attention |
| `IM-LYM-01` | immune | Latest imported lymphocyte count vs previous imported examination | Change ≤ −20% | attention |
| `BH-SLP-01` | behavioral | Scan sleep_hours vs wellbeing baseline | Change ≤ −1.5 h | info |
| `BH-MOOD-01` | behavioral | Scan mood_score vs wellbeing baseline | Change ≤ −2 points | attention |
| `BH-STRESS-01` | behavioral | Scan stress_score vs wellbeing baseline | Change ≥ +2.5 points | attention |

Data notices (not alerts), reported in the scan summary and dashboard:

| notice_id | Meaning |
|---|---|
| `DQ-MISSING-01` | No value for a metric that normally needs one. |
| `DQ-OUTDATED-01` | Latest value is older than its freshness window; excluded from comparison. |
| `DQ-BASELINE-01` | Too few observations to form a personal baseline; comparison skipped. |
| `DQ-PLAUSIBILITY-01` | Stored value flagged `plausibility_warning`. |

Thresholds are prototype defaults chosen for demonstration and are **not validated clinical cut-offs**. They are visible in `monitoring_config.py` and in the API documentation so that the Backend Owner can revise them.

### 6.4 Alerts

An alert is created only when a rule fires. It contains the rule id, the category, the severity, the explanation (with the actual values and the baseline it was compared against), and evidence references. Explanation template example:

> Heart rate is 96 bpm in the latest fresh reading, 18% above this astronaut's median of 81 bpm over the prior 14 days (7 observations). This is a change from personal history, not a diagnosis. Rule CV-HR-01 (prototype heuristic, non-clinical).

### 6.5 Recommendations (`recommendation_service`)

Next steps are generic monitoring actions keyed by category and severity. They never prescribe treatment.

- `info`: "Keep monitoring at the next scheduled scan."
- `attention`: "Recheck this measurement at the next scan. Share this summary with the crew medical officer for review."
- Data notices add: "Enter the missing value at the next scan" or "Repeat the examination when scheduled."
- Every recommendation response includes: "Prototype monitoring guidance. Not a medical diagnosis. Requires review by qualified medical personnel."

## 7. Provenance and offline

- Every measurement exposes `source_type`, `source_detail`, `unit`, `observed_at`, `recorded_at`, `validation_status`, `is_synthetic`. The frontend can therefore label each value as sensor reading, manual entry, imported examination, self-reported (on the scan), or synthetic demo.
- The backend never fabricates a sensor reading. Demo data is always `is_synthetic: true`.
- Offline-first is the frontend's job (cache, sync queue). The backend supports it by: stable IDs, UTC timestamps, idempotent reads, `GET /dashboard` and `GET /scans/{id}` returning complete self-contained payloads that a client can cache.
- The backend does not claim that sensors keep running while disconnected.

## 8. Demo dataset — Mission Day 087

- Seeded deterministically from `app/demo/mission_day_087.py`, which holds literal values only. No random generator, no current clock.
- Synthetic astronaut: `DEMO-CS-001`, "Demo Astronaut A", mission start 2026-08-19, so Mission Day 087 is 2026-11-13.
- `as_of` for the demo scan is fixed at `2026-11-13T07:30:00Z`.
- Contents: about 14 days of heart rate and blood pressure history, exercise history for 5 weeks, 6 prior scans with wellbeing values, one imported lymphocyte examination older than its freshness window (so it shows as outdated), and a previous examination that allows the `IM-LYM-01` comparison.
- Day 087 demonstrates: a heart rate change that fires `CV-HR-01`, a lower exercise week that fires `BM-EX-01`, lower self-reported sleep that fires `BH-SLP-01` (info only), a missing manual BP reading that yields `DQ-MISSING-01`, and one outdated value that yields `DQ-OUTDATED-01`.
- The seeder is idempotent: it creates the demo astronaut only if absent.

## 9. Key decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Single `measurements` table with `source_type`, unit and validation columns. | One query path for the dashboard and history. Wellbeing is kept separate on the scan. |
| D2 | Wellbeing is self-report on `health_scans`, not measurements. | Avoids implying that the app measures mood or sleep. |
| D3 | Values outside plausibility bounds are rejected (HTTP 422), not stored as warnings. | Prevents bad input entering baselines. Soft-plausible values are stored with `plausibility_warning`. |
| D4 | No automatic unit conversion in the MVP. | Silent conversion is a validity risk. The API rejects non-canonical units with a clear message. |
| D5 | Baselines snapshotted per scan. | A past scan stays explainable after new data arrives. |
| D6 | Scan processing is synchronous; `processing_status` kept for later async use. | Simplest reliable path for the hackathon. |
| D7 | `as_of` is an explicit input to dashboard and scan processing. | Deterministic demo and reproducible tests. |
| D8 | Alert explanation text is generated from templates with the actual numbers. | Explainable, no free-form generated medical language. |
| D9 | Pure `domain/` layer for analysis. | Testable without web or DB dependencies. |
| D10 | Rule thresholds live in one config module. | Visible, reviewable and changeable without touching logic. |

## 10. Known limitations

- Thresholds are prototype heuristics, not validated clinical criteria.
- Single astronaut per demo; authentication is out of scope; the MVP trusts the `astronaut_id` it is given.
- Exercise and sleep are self-reported or device-reported, not verified.
- No real imports of laboratory files; `imported_examination` records are entered through the API.
- Hydration, nutrition, and environmental metrics (P1) are not seeded in this phase.
- SQLite is single-writer; adequate for one local instance.
