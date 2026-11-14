import type {
  Dashboard,
  HealthOut,
  MeasurementCreate,
  MeasurementOut,
  MetricOut,
  Page,
  ScanAlert,
  ScanCreate,
  ScanListItem,
  ScanOut,
} from '../../types/api';
import { apiRequest } from './client';

// Typed wrappers for the backend endpoints in the API contract. Paths are relative to API_BASE_URL.

export const getHealth = () => apiRequest<HealthOut>('/health');

export const getMetrics = () => apiRequest<Page<MetricOut>>('/metrics');

export const getDashboard = (params: { astronautId?: number; asOf?: string }) =>
  apiRequest<Dashboard>('/dashboard', {
    query: { astronaut_id: params.astronautId, as_of: params.asOf },
  });

export interface MeasurementQuery {
  astronautId?: number;
  metricKey?: string;
  sourceType?: string;
  limit?: number;
  offset?: number;
}

export const listMeasurements = (q: MeasurementQuery) =>
  apiRequest<Page<MeasurementOut>>('/measurements', {
    query: {
      astronaut_id: q.astronautId,
      metric_key: q.metricKey,
      source_type: q.sourceType,
      limit: q.limit,
      offset: q.offset,
    },
  });

export const createMeasurement = (body: MeasurementCreate) =>
  apiRequest<MeasurementOut>('/measurements', { method: 'POST', body });

export const submitScan = (body: ScanCreate) => apiRequest<ScanOut>('/scans', { method: 'POST', body });

export const getScan = (scanId: number) => apiRequest<ScanOut>(`/scans/${scanId}`);

export const listScans = (q: { astronautId?: number; limit?: number; offset?: number }) =>
  apiRequest<Page<ScanListItem>>('/scans', {
    query: { astronaut_id: q.astronautId, limit: q.limit, offset: q.offset },
  });

export const listAlerts = (q: { astronautId?: number; scanId?: number; category?: string; severity?: string; limit?: number }) =>
  apiRequest<Page<ScanAlert>>('/alerts', {
    query: {
      astronaut_id: q.astronautId,
      scan_id: q.scanId,
      category: q.category,
      severity: q.severity,
      limit: q.limit,
    },
  });
