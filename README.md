# CrewSense

CrewSense is an offline-first astronaut health monitoring and decision-support prototype built for the NASA Space Apps Challenge 2026. It compares each astronaut's measurements with that astronaut's own history and shows what changed, what needs attention and what to do next.

> **Non-clinical prototype.** The monitoring rules are deterministic heuristics, not validated clinical criteria. CrewSense does not diagnose or prescribe. All demo data is synthetic and labelled `is_synthetic`.

## Repository layout

| Folder | What it is |
|---|---|
| [`backend/`](backend/README.md) | FastAPI service: monitoring rules, scans, alerts, SQLite locally and PostgreSQL in production. API contract in `backend/docs/API_CONTRACT.md`. |
| [`frontend/`](frontend/README.md) | React, TypeScript and Vite dashboard. Talks to the backend, caches data in IndexedDB and queues scans while offline. |

## Quick start

Run the backend (Python 3.11+):

```bash
cd backend
python -m venv .venv
. .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:create_app --factory --reload
```

The API is at `http://127.0.0.1:8000/api/v1` and Swagger UI at `http://127.0.0.1:8000/docs`. On first start it seeds the synthetic Mission Day 087 demo astronaut.

Run the frontend in a second terminal:

```bash
cd frontend
cp .env.example .env.local    # Windows: copy .env.example .env.local
npm install
npm run dev                   # http://localhost:5173
```

## Tests

```bash
cd backend && pytest
cd frontend && npm run typecheck && npm test && npm run build
```

## How it works

- Each metric is judged against the astronaut's own baseline. A baseline needs a minimum number of past values before it is used.
- A Daily Health Scan (wellbeing plus manual measurements) is sent as one request. The server stores all of it or none of it, and repeating the same `client_scan_id` returns the stored scan instead of a duplicate.
- Indicators, units and plausibility bounds come from the backend, not from the frontend.

See the backend and frontend READMEs for configuration, deployment and known limitations.

## License

See [LICENSE](LICENSE).
