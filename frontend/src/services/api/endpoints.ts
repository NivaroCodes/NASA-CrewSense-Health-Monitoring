import { db, type ScanDraftPayload } from '../offline/db';
import type { HealthOverview, Reading } from '../../types/telemetry';
import { DEMO_OVERVIEW } from './fixtures';

// Single entry point for backend calls. Currently served by demonstration stand-ins.
// Replace bodies when the contracts are agreed (T-021). Paths are TO BE AGREED WITH BACKEND OWNER.
export const IS_DEMO_DATA = true;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Reads the overview. Online: demonstration data, then cached. Offline: cached data only.
export async function getHealthOverview(): Promise<HealthOverview> {
  if (!navigator.onLine) {
    const cached = await readCachedOverview();
    if (cached) return cached;
    throw new Error('No connection and no cached data yet.');
  }
  await delay(150);
  const overview = structuredClone(DEMO_OVERVIEW);
  await cacheOverview(overview);
  return overview;
}

async function cacheOverview(overview: HealthOverview): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction('rw', db.telemetry_cache, db.alerts, async () => {
    await db.telemetry_cache.bulkPut(
      overview.readings.map((reading) => ({ id: reading.id, reading, cachedAt: now })),
    );
    await db.alerts.clear();
    await db.alerts.bulkPut(overview.alerts.map((alert) => ({ id: alert.id, alert, cachedAt: now })));
  });
}

// Rebuilds the overview from cache. Counts are derived from cached readings; no value is invented.
async function readCachedOverview(): Promise<HealthOverview | null> {
  const rows = await db.telemetry_cache.toArray();
  if (rows.length === 0) return null;
  const readings: Reading[] = rows.map((r) => r.reading);
  const alerts = (await db.alerts.toArray()).map((a) => a.alert);
  return {
    monitoring: {
      activeSources: readings.filter((r) => r.value !== null).length,
      totalSources: readings.length,
      needingAttention: readings.filter((r) => r.status === 'Attention' || r.status === 'Urgent').length,
      missing: readings.filter((r) => r.value === null).length,
    },
    readings,
    alerts,
    lastScanAt: null,
  };
}

// Submits one finished scan. DEMONSTRATION STAND-IN: accepts the payload locally and reports analysis as pending.
// It does not compute any health result. Replace with POST /api/v1/scan/submit when agreed (T-021).
export async function submitScan(scanId: string, payload: ScanDraftPayload): Promise<{ status: 'received'; scanId: string }> {
  if (!navigator.onLine) throw new Error('Offline');
  await delay(400);
  void payload;
  return { status: 'received', scanId };
}
