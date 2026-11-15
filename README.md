# CrewSense

**Offline-first health monitoring and decision support for crewed missions.**
Built for the NASA Space Apps Challenge 2026.

CrewSense compares each astronaut's measurements with that astronaut's *own* history, instead of a population average. It then tells the flight surgeon, in plain words, who is doing well, who needs a closer look and why.

> **Non-clinical prototype.** The monitoring rules are deterministic heuristics, not validated clinical criteria. CrewSense does not diagnose, prescribe, or measure immune status, bone density or muscle mass directly. All demo data is synthetic and is labelled `is_synthetic` throughout the API and the interface.

## Why CrewSense

On a long mission, ground support is delayed or unavailable, and a "normal" value for one person can be a warning sign for another. CrewSense is designed around three ideas:

- **Compared with their own normal.** Every reading is judged against that astronaut's personal baseline.
- **Plain words first.** Screens answer "is everyone okay?" in a few seconds. Technical detail stays one click away.
- **Honest about data.** Every value shows where it came from (device, typed in, self-reported, lab test) and how fresh it is. Missing and outdated data is never shown as normal.

## Features

- Unified dashboard with four problem areas: cardiovascular, bone and muscle, immune (examination), and behavioural health.
- Deterministic, explainable monitoring rules with a published rule catalogue.
- Daily Health Scan: wellbeing plus manual measurements, stored atomically in one request.
- Idempotent submissions (`client_scan_id`), so retries never create duplicates.
- Offline support: the dashboard is cached in IndexedDB, and scans made without a connection are queued and retried with backoff.
- Data provenance and freshness on every indicator.
- Alerts, scan history and a sync status page for queued or rejected scans.

## Architecture

```
┌────────────────────┐   HTTPS / JSON    ┌──────────────────────────┐
│  Frontend (Vite)   │ ────────────────► │  Backend (FastAPI)       │
│  React + TypeScript│ ◄──────────────── │  domain rules, services  │
│  IndexedDB cache   │   /api/v1/...     │  SQLAlchemy + Alembic    │
└────────────────────┘                   └────────────┬─────────────┘
                                                      │
                                          SQLite (local) / PostgreSQL (production)
```

| Folder | Contents |
|---|---|
| [`backend/`](backend/README.md) | FastAPI service, pure-Python monitoring domain, persistence, migrations. |
| [`backend/docs/API_CONTRACT.md`](backend/docs/API_CONTRACT.md) | Endpoints, request and response examples, error envelope. |
| [`backend/docs/ARCHITECTURE.md`](backend/docs/ARCHITECTURE.md) | Layout, data model, monitoring logic, decisions, limitations. |
| [`frontend/`](frontend/README.md) | React, TypeScript and Vite single-page app. |

## Getting started

### Prerequisites

- Python 3.11 or newer
- Node.js 18 or newer and npm

### 1. Start the backend

```bash
cd backend
python -m venv .venv
. .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:create_app --factory --reload
```

- API base: `http://127.0.0.1:8000/api/v1`
- Interactive docs: `http://127.0.0.1:8000/docs`

On first start the backend creates a local SQLite database and seeds the synthetic Mission Day 087 demo astronaut.

### 2. Start the frontend

```bash
cd frontend
cp .env.example .env.local    # Windows: copy .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:5173`. The backend allows CORS from `localhost:5173` and `127.0.0.1:5173` only.

### 3. Try the demo

```bash
curl "http://127.0.0.1:8000/api/v1/dashboard?as_of=2026-11-13T07:30:00Z"
```

## API overview

All endpoints live under `/api/v1`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Backend and database health check. |
| `GET` | `/metrics` | Metric catalogue: units, plausibility bounds, descriptions. |
| `GET` | `/dashboard` | Consolidated dashboard: indicators, problem areas, alerts, next steps. |
| `POST` | `/measurements` | Submit a single measurement. |
| `GET` | `/measurements` | Measurement history. |
| `POST` | `/scans` | Submit a Daily Health Scan (idempotent via `client_scan_id`). |
| `GET` | `/scans` | Scan history, newest first. |
| `GET` | `/scans/{scan_id}` | A stored scan result. |
| `GET` | `/alerts` | Saved alerts, newest first. |

See the [API contract](backend/docs/API_CONTRACT.md) for full request and response schemas.

## Testing

```bash
# Backend
cd backend && pytest

# Frontend
cd frontend && npm run typecheck && npm test && npm run build
```

## Deployment

The backend is configured for Fly.io (`backend/fly.toml`, `backend/Dockerfile`) and Railway (`backend/railway.json`), with PostgreSQL managed by Alembic migrations. The frontend is configured for Vercel (`frontend/vercel.json`). Environment variables and step-by-step instructions are in the [backend](backend/README.md#production-deployment-railway--postgresql) and [frontend](frontend/README.md#deployment-vercel) READMEs.

## Known limitations

- Thresholds are prototype heuristics, not validated clinical criteria.
- One demo astronaut. There is no authentication, so `astronaut_id` is trusted.
- Sleep, activity and mood are self-reported or device-reported and are not verified.
- Laboratory results are entered through the API; there is no file import yet.
- Some areas (for example behavioural health) stay "Not evaluated" until enough scans exist to form a baseline.
- Older readings eventually become "Old data" even if nothing has changed, because freshness is measured against the reference time.

## License

Released under the terms in [LICENSE](LICENSE).
