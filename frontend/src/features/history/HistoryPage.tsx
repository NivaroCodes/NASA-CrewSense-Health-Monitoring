import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { ErrorPanel } from '../../components/ui/ErrorPanel';
import { PageSkeleton } from '../../components/ui/Loading';
import { ProvenanceBadge } from '../../components/ui/ProvenanceBadge';
import { StatusChip } from '../../components/ui/StatusChip';
import { useMetrics } from '../../hooks/useMetrics';
import { useMeasurements, useScans } from '../../hooks/useLists';
import { formatDateTime } from '../../utils/datetime';
import { formatValue, pad3 } from '../../utils/format';

// Scan history (GET /scans) and stored measurements (GET /measurements). Both come straight from the server.
export function HistoryPage() {
  const scans = useScans({ limit: 20 });
  const [metricKey, setMetricKey] = useState('');
  const metrics = useMetrics();
  const measurements = useMeasurements({ metricKey: metricKey || undefined, limit: 50 });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-sans font-semibold">History</h1>
        <p className="text-sm text-text-secondary">Stored scans and measurements, newest first.</p>
      </div>

      <section aria-label="Scan history" className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-text-secondary">Scans</h2>
        {scans.isPending ? (
          <PageSkeleton />
        ) : scans.isError ? (
          <ErrorPanel title="Could not load scan history." error={scans.error} onRetry={() => void scans.refetch()} />
        ) : scans.data.items.length === 0 ? (
          <p className="text-sm text-text-secondary">No scans stored yet.</p>
        ) : (
          <ul className="space-y-2">
            {scans.data.items.map((s) => (
              <li key={s.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    <Link to={`/scans/${s.id}`} className="text-accent-teal underline">
                      Scan #{s.id}
                    </Link>{' '}
                    <span className="text-text-secondary">· Mission Day {pad3(s.mission_day)}</span>
                    <div className="text-xs text-text-secondary">
                      Evaluated at {formatDateTime(s.as_of)} · Submitted {formatDateTime(s.submitted_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusChip value={s.overall_status} />
                    <span className="font-mono text-xs text-text-secondary">{s.alert_count} alert(s)</span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Measurements" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm uppercase tracking-wide text-text-secondary">Measurements</h2>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-text-secondary">Indicator</span>
            <select value={metricKey} onChange={(e) => setMetricKey(e.target.value)} className="rounded-chip border border-border-subtle bg-bg-surface px-2 py-1">
              <option value="">All</option>
              {(metrics.data?.data.items ?? []).map((m) => (
                <option key={m.metric_key} value={m.metric_key}>
                  {m.display_name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {measurements.isPending ? (
          <PageSkeleton />
        ) : measurements.isError ? (
          <ErrorPanel title="Could not load measurements." error={measurements.error} onRetry={() => void measurements.refetch()} />
        ) : measurements.data.items.length === 0 ? (
          <p className="text-sm text-text-secondary">No measurements stored for this selection.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-text-secondary">
                <tr>
                  <th className="py-2 pr-4 font-normal">Indicator</th>
                  <th className="py-2 pr-4 font-normal">Value</th>
                  <th className="py-2 pr-4 font-normal">Observed</th>
                  <th className="py-2 pr-4 font-normal">Source</th>
                </tr>
              </thead>
              <tbody>
                {measurements.data.items.map((m) => (
                  <tr key={m.id} className="border-t border-border-subtle">
                    <td className="py-2 pr-4">{m.display_name}</td>
                    <td className="py-2 pr-4 font-mono">
                      {formatValue(m.value)} {m.unit}
                    </td>
                    <td className="py-2 pr-4 text-xs text-text-secondary">{formatDateTime(m.observed_at)}</td>
                    <td className="py-2 pr-4">
                      <ProvenanceBadge sourceType={m.source_type} isSynthetic={m.is_synthetic} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-text-secondary">
              Showing {measurements.data.items.length} of {measurements.data.total} stored measurements.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
