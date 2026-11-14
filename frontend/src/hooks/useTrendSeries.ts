import { useQuery } from '@tanstack/react-query';
import type { IndicatorId } from '../types/telemetry';
import { getTrendSeries } from '../services/api/endpoints';

export function useTrendSeries(id: IndicatorId) {
  return useQuery({
    queryKey: ['health', 'trends', id],
    queryFn: () => getTrendSeries(id),
    staleTime: 60_000,
  });
}
