import { useEffect, useState } from 'react';

// Single source of online state (Spec, Section 12, rule 1).
// The browser online event alone reports a link that may not reach the server,
// so request outcomes should also call markRequestFailed() once the API layer exists (T-021).
export function useConnectivity(): { online: boolean } {
  const [online, setOnline] = useState<boolean>(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  return { online };
}
