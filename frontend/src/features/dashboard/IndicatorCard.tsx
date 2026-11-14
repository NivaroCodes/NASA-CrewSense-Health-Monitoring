import { Link } from 'react-router-dom';
import { ProvenanceBadge } from '../../components/ui/ProvenanceBadge';
import { SeverityChip } from '../../components/ui/SeverityChip';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Reading } from '../../types/telemetry';
import { formatRelative } from '../../utils/time';

// Indicator tile (Spec, Section 5, Component D). States: reading, no reading, stale, sensor error.
// A value is never shown without its timestamp and provenance; a missing value is never shown as 0.
export function IndicatorCard({ reading, nowMs }: { reading: Reading; nowMs: number }) {
  const hasValue = reading.value !== null;
  const stale = hasValue && reading.measuredAt !== null && nowMs - Date.parse(reading.measuredAt) > 24 * 3600_000;

  return (
    <Link
      to={`/indicators/${reading.id}`}
      className="block rounded-card border border-border-subtle bg-bg-surface p-4 hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-accent-cyan"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-text-secondary">{reading.name}</span>
        {reading.status ? <SeverityChip status={reading.status} /> : null}
      </div>

      {reading.sensorError ? (
        <p className="mt-3 font-mono text-sm text-accent-amber">Sensor unavailable</p>
      ) : !hasValue ? (
        <div className="mt-3">
          <p className="font-mono text-2xl text-text-secondary">No reading</p>
          <p className="mt-1 text-xs text-accent-cyan">Enter manually</p>
        </div>
      ) : (
        <p className={`mt-3 font-mono text-3xl ${stale ? 'text-text-secondary' : 'text-text-primary'}`}>
          {reading.value}
          <span className="ml-1 text-base text-text-secondary">{reading.unit}</span>
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
        {reading.measuredAt ? (
          <span className="font-mono">{formatRelative(reading.measuredAt, nowMs)}</span>
        ) : (
          <Skeleton className="h-3 w-16" />
        )}
        <ProvenanceBadge source={reading.provenance} />
        {stale ? <span className="rounded-chip border border-status-slate px-1.5 font-mono text-status-slate">Stale</span> : null}
        {reading.change ? <span className="font-mono">{reading.change}</span> : null}
      </div>
    </Link>
  );
}
