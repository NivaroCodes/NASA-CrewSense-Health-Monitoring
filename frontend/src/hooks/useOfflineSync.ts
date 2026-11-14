import { useEffect, useState } from 'react';
import { useConnectivity } from './useConnectivity';
import { flushQueue, queueCounts } from '../services/offline/syncManager';

// Sends queued scans whenever the device is online, and reports how many are still waiting or rejected.
// Polls because the queue lives in IndexedDB, not in React state.
export function useOfflineSync(): { pending: number; rejected: number } {
  const { online } = useConnectivity();
  const [counts, setCounts] = useState({ pending: 0, rejected: 0 });

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (online) await flushQueue();
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
