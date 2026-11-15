import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBackendHealth } from '../../hooks/useBackendHealth';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useDashboard } from '../../hooks/useDashboard';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { pad3 } from '../../utils/format';

// Fixed header. The API chip reflects the server actually answering (GET /health), not only the browser's online flag.
function ApiChip() {
  const health = useBackendHealth();
  const [open, setOpen] = useState(false);
  const up = health.data?.database === 'ok';
  const label = health.isPending ? 'API …' : up ? 'API ONLINE' : 'API UNREACHABLE';
  const tone = up ? 'border-accent-teal text-accent-teal' : 'border-accent-orange text-accent-orange';
  return (
    <span className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`rounded-chip border px-2 py-0.5 font-mono text-xs ${tone}`}
      >
        {label}
      </button>
      {open ? (
        <span role="note" className="absolute right-0 top-full z-10 mt-2 w-72 rounded-card border border-border-subtle bg-bg-surface p-3 text-xs text-text-secondary">
          {up
            ? `Backend reachable. Server time ${health.data?.server_time ?? ''}.`
            : 'The backend did not answer the health check. Values shown may be cached, and new scans are queued on this device.'}
        </span>
      ) : null}
    </span>
  );
}

export function Header() {
  const { online } = useConnectivity();
  const { pending, rejected } = useOfflineSync();
  const dashboard = useDashboard();
  const loaded = dashboard.data;
  const d = loaded?.data;

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle bg-bg-surface px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-sans text-lg font-semibold">CrewSense</span>
        <span className="text-xs text-text-secondary">
          {d
            ? `${d.astronaut.display_name} (${d.astronaut.display_id}) · Mission Day ${pad3(d.mission.mission_day)}${loaded?.fromCache ? ' · cached' : ''}`
            : 'Mission data unavailable'}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ApiChip />
        {pending > 0 ? (
          <Link to="/sync" className="rounded-chip border border-accent-orange px-2 py-0.5 font-mono text-xs text-accent-orange">
            {pending} queued
          </Link>
        ) : null}
        {rejected > 0 ? (
          <Link to="/sync" className="rounded-chip border border-accent-red px-2 py-0.5 font-mono text-xs text-accent-red">
            {rejected} rejected
          </Link>
        ) : null}
        {!online ? (
          <span className="rounded-chip bg-accent-orange/10 px-2 py-0.5 font-mono text-xs text-accent-orange">DEVICE OFFLINE</span>
        ) : null}
      </div>
    </header>
  );
}
