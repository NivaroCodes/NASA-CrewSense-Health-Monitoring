import type { HealthOverview } from '../../types/telemetry';
import { DEMO_OVERVIEW } from './fixtures';

// Single entry point for dashboard data. Currently served from DEMO_OVERVIEW (synthetic).
// Replace the body with a real request when GET /api/v1/health/overview is agreed (T-021).
// Contract paths are TO BE AGREED WITH BACKEND OWNER; none are final.
export async function getHealthOverview(): Promise<HealthOverview> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  return structuredClone(DEMO_OVERVIEW);
}

export const IS_DEMO_DATA = true;
