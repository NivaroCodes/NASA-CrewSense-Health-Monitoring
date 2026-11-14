import { useQuery } from '@tanstack/react-query';
import { getMetrics } from '../services/api/endpoints';
import { withCache } from '../services/offline/readThrough';

// The metric catalogue drives forms and validation bounds. Nothing about the metrics is hard-coded in the UI.
export function useMetrics() {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: () => withCache('metrics', () => getMetrics()),
    staleTime: 10 * 60_000,
  });
}
