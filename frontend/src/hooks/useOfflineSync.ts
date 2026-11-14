import { useEffect, useState } from 'react';
import { useConnectivity } from './useConnectivity';
import { flushQueue, pendingCount } from '../services/offline/syncManager';

// Flushes the queue when online and reports how many scans are still waiting (Spec, Section 10).
// Polls every 3 seconds because the queue lives in IndexedDB, not in React state.
export function useOfflineSync(): { pending: number } {
  const { online } = useConnectivity();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (online) await flushQueue();
      const n = await pendingCount();
      if (alive) setPending(n);
    };
    void tick();
    const id = window.setInterval(() => void tick(), 3000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [online]);

  return { pending };
}
