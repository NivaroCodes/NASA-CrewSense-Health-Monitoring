import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useConnectivity } from './useConnectivity';
import { flushQueue, queueCounts } from '../services/offline/syncManager';

// Sends queued scans whenever the device is online, and reports how many are still waiting or rejected.
// Polls because the queue lives in IndexedDB, not in React state.
// After at least one scan is accepted, the screens that show scan-derived data are refetched.
export function useOfflineSync(): { pending: number; rejected: number } {
  const { online } = useConnectivity();
  const queryClient = useQueryClient();
  const [counts, setCounts] = useState({ pending: 0, rejected: 0 });

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (online) {
        const sent = await flushQueue();
        if (sent > 0) {
          void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          void queryClient.invalidateQueries({ queryKey: ['scans'] });
          void queryClient.invalidateQueries({ queryKey: ['scan'] });
          void queryClient.invalidateQueries({ queryKey: ['alerts'] });
          void queryClient.invalidateQueries({ queryKey: ['measurements'] });
        }
      }
      const next = await queueCounts();
      if (alive) setCounts(next);
    };
    void tick();
    const id = window.setInterval(() => void tick(), 3000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [online]);

  return counts;
}
