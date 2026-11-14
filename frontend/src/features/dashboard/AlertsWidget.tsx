import { SeverityChip } from '../../components/ui/SeverityChip';
import type { AlertItem } from '../../types/telemetry';
import { formatRelative } from '../../utils/time';

// Presents backend-generated alerts verbatim (Spec, Section 8). Adds no text of its own.
// Missing fields are marked unavailable rather than filled in.
const ORDER: Record<string, number> = { Urgent: 0, Attention: 1, 'Insufficient Data': 2, Normal: 3 };

export function AlertsWidget({ alerts, nowMs }: { alerts: AlertItem[]; nowMs: number }) {
  if (alerts.length === 0) {
    return <p className="text-sm text-text-secondary">No active alerts.</p>;
  }
  const sorted = [...alerts].sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9));
  return (
    <ul className="space-y-3">
      {sorted.map((alert) => (
        <li key={alert.id} className="rounded-card border border-border-subtle bg-bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <SeverityChip status={alert.status} />
            <span className="font-mono text-xs text-text-secondary">
              {alert.timestamp ? formatRelative(alert.timestamp, nowMs) : 'time unknown'}
            </span>
          </div>
          <p className="mt-2 text-sm">
            <span className="text-text-secondary">Indicator: </span>
            {alert.indicator ?? 'unspecified'}
          </p>
          <p className="mt-1 text-sm">{alert.reason ?? 'Reason not provided.'}</p>
          <p className="mt-2 text-sm">
            <span className="text-text-secondary">Next step: </span>
            {alert.recommendedAction ?? 'No recommendation supplied.'}
          </p>
          <p className="mt-2 font-mono text-xs text-text-secondary">Source: {alert.dataSource ?? 'unknown'}</p>
        </li>
      ))}
    </ul>
  );
}
