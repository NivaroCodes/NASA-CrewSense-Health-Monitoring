// Mission Elapsed Time. The mission start is supplied by the backend; the client never invents it.
// Returns null when no start time is known, so the UI can show a missing state instead of 0.

export function formatMet(startIso: string | null, nowMs: number): string | null {
  if (!startIso) return null;
  const startMs = Date.parse(startIso);
  if (Number.isNaN(startMs)) return null;
  const elapsed = Math.max(0, Math.floor((nowMs - startMs) / 1000));
  const day = Math.floor(elapsed / 86400) + 1;
  const hh = String(Math.floor((elapsed % 86400) / 3600)).padStart(2, '0');
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return `MET Day ${day} ${hh}:${mm}:${ss}`;
}

export function formatRelative(iso: string, nowMs: number): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 'time unknown';
  const sec = Math.max(0, Math.floor((nowMs - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}
