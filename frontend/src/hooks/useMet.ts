import { useEffect, useState } from 'react';
import { formatMet } from '../utils/time';

// Ticks once per second. Used only inside MetClock so the rest of the header never re-renders (Spec, Phase 5.2).
export function useMet(startIso: string | null): string | null {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!startIso) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startIso]);

  return formatMet(startIso, now);
}
