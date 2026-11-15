# CrewSense Backend

Backend for CrewSense, an offline-first astronaut health monitoring and decision-support prototype for the NASA Space Apps Challenge 2026.

> **Non-clinical prototype.** The monitoring rules are deterministic heuristics that compare an astronaut's values with that astronaut's own history. They are not validated clinical criteria. The system does not diagnose, prescribe, or measure immune status, bone density, or muscle mass directly.

Design documents:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): layout, data model, monitoring logic, decisions, limitations.
- [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md): endpoints, request and response examples, error envelope. This is the document the Frontend Owner integrates against.

## Stack

Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.x, SQLite, pytest.

## Setup

From the `backend/` folder:

```bash
python -m venv .venv
. .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:create_app --factory --reload
```

- API base: `http://127.0.0.1:8000/api/v1`
- Swagger UI: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

On first start the backend creates `crewsense.db` in the `backend/` folder and seeds the Mission Day 087 demo astronaut. Seeding is idempotent.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `CREWSENSE_DATABASE_URL` | `sqlite:///<backend>/crewsense.db` | SQLAlchemy database URL. |
| `CREWSENSE_SEED_DEMO` | `true` locally, `false` in production | Seed the synthetic Mission Day 087 astronaut on startup. Accepts `true` or `false`; any other value stops the process. |
| `CREWSENSE_CORS_ORIGINS` | the local Vite dev server locally, none in production | Comma-separated browser origins allowed to call the API. `*` is rejected. |
| `CREWSENSE_ENV` | detected | `production` or `development`. When unset, Fly.io and Railway count as production and everything else as development. |

In production there is no SQLite fallback: if neither `DATABASE_URL` nor `CREWSENSE_DATABASE_URL` is set, or the URL points to SQLite, the process stops with a `ConfigurationError`.

Monitoring thresholds, freshness windows, and baseline minimums live in `app/core/monitoring_config.py`. Each is documented there as a prototype default.

## Demo

Open the dashboard for Mission Day 087 in the state described in the contract:

```bash
curl "http://127.0.0.1:8000/api/v1/dashboard?as_of=2026-11-13T07:30:00Z"
```

Then submit the Day 087 scan:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/scans \
  -H "Content-Type: application/json" \
  -d '{"as_of":"2026-11-13T07:30:00Z","wellbeing":{"mood_score":3,"stress_score":6,"sleep_hours":5.2,"symptoms":["fatigue"]}}'
```

The demo data is literal and deterministic. It is labelled `is_synthetic: true` everywhere it appears.

## Tests

```bash
pytest
```

Test layout:

- `tests/domain/`: validation, baselines, the analysis pipeline (including the Day 087 expectations), explanation wording, and next-step rules. Pure Python.
- `tests/schemas/`: Pydantic request validation and UTC output format.
- `tests/api/`: HTTP contract tests through FastAPI's test client.
- `tests/persistence/`: seeding and ORM behaviour.

`tests/api` and `tests/persistence` skip with an explicit reason when FastAPI, SQLAlchemy, or httpx is not installed.

### Testing status

| Suite | Status |
|---|---|
| `tests/domain`, `tests/schemas` | Executed as part of the 84-test suite (Python 3.13). |
| `tests/api`, `tests/persistence` | Executed: all 84 tests in the suite pass on Python 3.13 with the pinned requirements. |

## Known limitations

- Thresholds are prototype heuristics, not validated clinical criteria.
- One demo astronaut. There is no authentication, so `astronaut_id` is trusted.
- Sleep, activity, and mood are self-reported or device-reported and are not verified.
- Imported laboratory results are entered through the API. No file import exists yet.
- Hydration, nutrition, and environmental metrics (P1) are not seeded in this phase.
- SQLite is single-writer, which is adequate for one local instance.

## Production deployment (Railway + PostgreSQL)

The API runs on Railway with a PostgreSQL database. `railway.json` (in this folder) sets the start command:
`python -m alembic upgrade head && uvicorn app.main:create_app --factory --host 0.0.0.0 --port $PORT`.
The health check is `/api/v1/health`.

Environment variables (set in Railway, never committed):

| Variable | Required | Value |
|---|---|---|
| `DATABASE_URL` | yes | Provided by the Railway PostgreSQL service. `postgres://` URLs are rewritten to the psycopg driver automatically. |
| `CREWSENSE_CORS_ORIGINS` | yes | Comma-separated frontend origins, for example `https://<your-project>.vercel.app`. No trailing slash. When unset in production, no browser origin is allowed. |
| `CREWSENSE_SEED_DEMO` | for the demo | `true` seeds the synthetic Mission Day 087 astronaut. Unset or `false` leaves the database empty of astronauts. |
| `CREWSENSE_DATABASE_URL` | no | Takes precedence over `DATABASE_URL` when set. Useful for local overrides. |

Schema rules:

- PostgreSQL schemas are created and changed only by Alembic migrations in `migrations/`. The application refuses to start on PostgreSQL if the schema is missing.
- Local development and tests use SQLite and create the schema directly. SQLite is never used in production.
- To add a schema change: edit the models, run `CREWSENSE_DATABASE_URL=sqlite:////tmp/gen.db python -m alembic revision --autogenerate -m "<message>"`, review the file, then commit it.

Verification on PostgreSQL:

```bash
CREWSENSE_TEST_POSTGRES_URL=postgresql+psycopg://user:pass@host:5432/disposable_db pytest tests/persistence
```

This drops and recreates the `public` schema of the database named in the URL. Use a disposable database only.

### Fly.io

`fly.toml` and `Dockerfile` (in this folder) target the Fly.io app `nasa-crewsense-health-monitoring` in region `ams`. The image sets `CREWSENSE_ENV=production`. The release command `python -m alembic upgrade head` runs before each deploy, and the app listens on port 8080 with the health check `/api/v1/health`. The same variables as in the table above apply, set as Fly secrets.
