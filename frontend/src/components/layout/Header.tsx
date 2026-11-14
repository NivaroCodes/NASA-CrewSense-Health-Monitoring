import { useState } from 'react';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useMet } from '../../hooks/useMet';
import { useMissionStore } from '../../store/useMissionStore';
import { Button } from '../ui/Button';

// Fixed mission header (Spec, Section 4 and Section 5, Component A).
// The clock lives in its own component so its once-per-second updates re-render only itself.
function MetClock({ start }: { start: string | null }) {
  const met = useMet(start);
  if (met === null) {
    return <span className="font-mono text-xs text-text-secondary">MET unavailable</span>;
  }
  return <span className="font-mono text-xs text-text-primary">{met}</span>;
}

function ConnectionChip({ online }: { online: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`rounded-chip border px-2 py-0.5 font-mono text-xs ${
          online ? 'border-accent-cyan text-accent-cyan' : 'border-accent-amber text-accent-amber'
        }`}
      >
        {online ? 'DSN LINK ONLINE' : 'DSN DISCONNECTED'}
      </button>
      {open ? (
        <span
          role="note"
          className="absolute right-0 top-full z-10 mt-2 w-64 rounded-card border border-border-subtle bg-bg-surface p-3 text-xs text-text-secondary"
        >
          {online
            ? 'The device reports a network connection. Data is synced when the link is confirmed.'
            : 'No network connection. Values shown are cached, and new scans are queued until the link returns.'}
        </span>
      ) : null}
    </span>
  );
}

export function Header() {
  const { online } = useConnectivity();
  const missionStart = useMissionStore((s) => s.missionStart);
  const missionTag = useMissionStore((s) => s.missionTag);

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle bg-bg-surface px-4 py-3">
      <div className="flex items-baseline gap-3">
        <span className="font-sans text-lg font-semibold">CrewSense</span>
        <span className="text-xs text-text-secondary">{missionTag ?? 'Mission data unavailable'}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <MetClock start={missionStart} />
        <ConnectionChip online={online} />
        {!online ? (
          <span className="rounded-chip bg-accent-amber/10 px-2 py-0.5 font-mono text-xs text-accent-amber">
            AUTONOMOUS MODE ENABLED
          </span>
        ) : null}
        <Button variant="ghost" disabled disabledReason="Sync actions arrive with T-020">
          Sync
        </Button>
      </div>
    </header>
  );
}
