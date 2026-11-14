import { Link, useParams } from 'react-router-dom';
import { MeasurementChart } from '../../components/charts/MeasurementChart';
import { Card } from '../../components/ui/Card';
import { ErrorPanel } from '../../components/ui/ErrorPanel';
import { PageSkeleton } from '../../components/ui/Loading';
import { PlaceholderPanel } from '../../components/ui/EmptyState';
import { ProvenanceBadge } from '../../components/ui/ProvenanceBadge';
import { useDashboard } from '../../hooks/useDashboard';
import { useMeasurements } from '../../hooks/useLists';
import { useMetrics } from '../../hooks/useMetrics';
import { IndicatorCard } from '../dashboard/IndicatorCard';
import { formatDateTime } from '../../utils/datetime';
import { formatValue } from '../../utils/format';

// Indicator detail: the backend's current evaluation, its catalogue description, and every stored value for it.
export function IndicatorDetailPage() {
  const { id } = useParams();
  const metrics = useMetrics();
  const dash = useDashboard();
  const history = useMeasurements({ metricKey: id, limit: 500 });

  if (metrics.isPending || dash.isPending) return <PageSkeleton />;
  if (metrics.isError) return <ErrorPanel title="Could not load indicator definitions." error={metrics.error} onRetry={() => void metrics.refetch()} />;

  const metric = metrics.data?.data.items.find((m) => m.metric_key === id);
  if (!metric) {
    return <PlaceholderPanel title="Indicator not found" note="This indicator is not in the metric catalogue." />;
  }

  const indicator = dash.data?.data.indicators.find((i) => i.metric_key === metric.metric_key);
  const points = (history.data?.items ?? []).map((m) => ({ observedAt: m.observed_at, value: m.value }));

  return (
    <div className="space-y-6">
      <Link to="/dashboard" className="text-sm text-accent-cyan underline">
        Back to dashboard
      </Link>

      <div>
        <h1 className="text-xl font-sans font-semibold">{metric.display_name}</h1>
        <p className="mt-1 text-sm text-text-secondary">{metric.description}</p>
        <p className="mt-1 text-xs text-text-secondary">
          Canonical unit {metric.canonical_unit} · freshness window {metric.freshness_hours} h · plausibility bounds{' '}
          {metric.plausible_min} to {metric.plausible_max}
        </p>
      </div>

      {indicator ? (
        <IndicatorCard indicator={indicator} showLink={false} />
      ) : (
        <Card>
          <p className="text-sm text-text-secondary">The dashboard has no evaluation for this indicator.</p>
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-semibold">Stored values</h2>
        {history.isPending ? (
          <p className="mt-2 text-sm text-text-secondary">Loading values…</p>
        ) : history.isError ? (
          <p role="alert" className="mt-2 text-sm">Could not load stored values.</p>
        ) : (
          <div className="mt-3 space-y-4">
            <MeasurementChart
              points={points}
              unit={metric.canonical_unit}
              freshnessHours={metric.freshness_hours}
              referenceValue={indicator?.baseline?.reference_value ?? null}
            />
            <p className="text-xs text-text-secondary">
              The dashed reference line is the personal baseline from the dashboard, when one exists. Breaks in the line mark gaps longer than twice the freshness window. Nothing is interpolated.
            </p>
            <ul className="divide-y divide-border-subtle text-sm">
              {history.data.items.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="font-mono">
                    {formatValue(m.value)} {m.unit}
                  </span>
                  <span className="text-xs text-text-secondary">{formatDateTime(m.observed_at)}</span>
                  <ProvenanceBadge sourceType={m.source_type} isSynthetic={m.is_synthetic} />
                </li>
              ))}
            </ul>
            {history.data.items.length === 0 ? <p className="text-sm text-text-secondary">No stored values yet.</p> : null}
          </div>
        )}
      </Card>
    </div>
  );
}
