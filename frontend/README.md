# CrewSense frontend

React, TypeScript and Vite. Connects to the FastAPI backend in the `backend` branch.

> Prototype decision-support tool. Not a medical device. Alerts describe changes from the astronaut's own history.

## Run the backend first

The backend lives on the `backend` branch. From a checkout of that branch, in its `backend/` folder:

```bash
python -m venv .venv
. .venv/bin/activate          # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:create_app --factory --reload
```

- API base: `http://127.0.0.1:8000/api/v1`
- Swagger UI: `http://127.0.0.1:8000/docs`

The backend seeds the synthetic Mission Day 087 demo on first start. Every seeded value is labelled `is_synthetic`.

## Run the frontend

```bash
cd frontend
cp .env.example .env.local    # Windows: copy .env.example .env.local
npm install
npm run dev                   # http://localhost:5173
```

On Windows PowerShell, if `npm` is blocked by execution policy, use `npm.cmd` instead.

The backend allows CORS from `http://localhost:5173` and `http://127.0.0.1:5173` only. Use one of those addresses.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000/api/v1` | Backend base URL. Read only in `src/config.ts`. |
| `VITE_AS_OF` | empty (server time) | Reference time for the dashboard. Keep it empty for real use: a fixed value (the demo's `2026-11-13T07:30:00Z`) keeps the dashboard on that day, so a scan submitted today does not change what it shows. |

## Checks

```bash
npm run typecheck
npm test
npm run build
```

## How the app talks to the backend

- `src/services/api/client.ts` is the only HTTP code. It parses the backend's error envelope into `ApiError` with field details. A request with no answer is status `0` and is treated as a network failure.
- `src/services/api/endpoints.ts` has one typed function per contract endpoint. `src/types/api.ts` mirrors the Pydantic schemas.
- Indicators, units, plausibility bounds and descriptions come from `GET /metrics` and `GET /dashboard`. None are hard-coded.
- The dashboard and metric catalogue are cached in IndexedDB. When the server cannot be reached, the cached copy is shown and labelled as cached.
- A Daily Health Scan is one `POST /scans` containing wellbeing and the requested manual measurements. The server stores all of it or nothing.
- If a submission gets no answer from the server, the exact request body is queued on the device and sent later with backoff (2 s, doubling, capped at 60 s). Server rejections (4xx) are not retried and are shown as rejected.
- Drafts are saved on every change, so a reload resumes the same scan.

## Known limitations

- A scan that timed out or lost its response is retried with the same `client_scan_id`, so the server returns the stored scan instead of storing a second one (contract section 6).
- Trends use stored measurements only. The backend exposes no baseline band, so the chart shows a single personal baseline line.
- Blood pressure, activity and lymphocyte count are the only backend indicators in the MVP. Glucose, temperature, sleep and mood are not backend metrics; sleep and mood are self-reported on the scan.
- The header reads the backend health check every 15 seconds.
