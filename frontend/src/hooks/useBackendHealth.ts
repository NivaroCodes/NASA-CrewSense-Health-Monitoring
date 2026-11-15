import { useQuery } from '@tanstack/react-query';
import { getHealth } from '../services/api/endpoints';

// GET /health, polled. It tells the header whether the server actually answers, which the browser's online flag cannot.
export function useBackendHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 15_000,
    retry: false,
  });
}
