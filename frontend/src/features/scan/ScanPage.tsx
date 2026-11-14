import { ErrorPanel } from '../../components/ui/ErrorPanel';
import type { MetricOut } from '../../types/api';
import { PageSkeleton } from '../../components/ui/Loading';
import { useDashboard } from '../../hooks/useDashboard';
import { useMetrics } from '../../hooks/useMetrics';
import { ScanWizard } from './ScanWizard';

// Loads what the scan needs (dashboard requirements and the metric catalogue), then hands over to the wizard.
export function ScanPage() {
  const dash = useDashboard();
  const metrics = useMetrics();

  if (dash.isPending || metrics.isPending) return <PageSkeleton />;
  if (dash.isError) return <ErrorPanel title="The scan cannot start: the dashboard did not load." error={dash.error} onRetry={() => void dash.refetch()} />;
  if (metrics.isError) return <ErrorPanel title="The scan cannot start: metric definitions did not load." error={metrics.error} onRetry={() => void metrics.refetch()} />;

  const metricsByKey = new Map(metrics.data.data.items.map((m): [string, MetricOut] => [m.metric_key, m]));
  return <ScanWizard dashboard={dash.data.data} fromCache={dash.data.fromCache} metricsByKey={metricsByKey} />;
}
