import { useQuery } from '@tanstack/react-query';
import { AS_OF } from '../config';
import { getDashboard } from '../services/api/endpoints';
import { withCache } from '../services/offline/readThrough';

// GET /dashboard, cached for offline display. The query key is shared by every screen that needs the dashboard.
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => withCache('dashboard', () => getDashboard({ asOf: AS_OF })),
    staleTime: 30_000,
  });
}
