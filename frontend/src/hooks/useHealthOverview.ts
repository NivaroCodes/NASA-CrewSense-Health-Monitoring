import { useQuery } from '@tanstack/react-query';
import { getHealthOverview } from '../services/api/endpoints';

export function useHealthOverview() {
  return useQuery({
    queryKey: ['health', 'overview'],
    queryFn: getHealthOverview,
    staleTime: 30_000,
  });
}
