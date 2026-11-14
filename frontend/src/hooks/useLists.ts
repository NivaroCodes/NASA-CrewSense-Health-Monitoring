import { useQuery } from '@tanstack/react-query';
import { listAlerts, listMeasurements, listScans, getScan, type MeasurementQuery } from '../services/api/endpoints';

export function useMeasurements(q: MeasurementQuery) {
  return useQuery({ queryKey: ['measurements', q], queryFn: () => listMeasurements(q) });
}

export function useScans(q: { limit?: number; offset?: number } = {}) {
  return useQuery({ queryKey: ['scans', q], queryFn: () => listScans(q) });
}

export function useScan(scanId: number) {
  return useQuery({ queryKey: ['scan', scanId], queryFn: () => getScan(scanId), enabled: Number.isFinite(scanId) });
}

export function useAlerts(q: { category?: string; severity?: string; limit?: number }) {
  return useQuery({ queryKey: ['alerts', q], queryFn: () => listAlerts(q) });
}
