import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { SeverityChip, type AlertStatus } from '../../components/ui/SeverityChip';
import { PlaceholderPanel } from '../../components/ui/EmptyState';
import { useHealthOverview } from '../../hooks/useHealthOverview';
import { AlertsWidget } from '../dashboard/AlertsWidget';

const STATUSES: AlertStatus[] = ['Urgent', 'Attention', 'Insufficient Data', 'Normal'];

// Alert triage (Spec, Section 8). Severity and wording come from the backend; this page only groups and counts them.
export function AlertsPage() {
  const { data, isPending, isError, dataUpdatedAt } = useHealthOverview();

  if (isPending) return <Skeleton className="h-48 w-full" />;
  if (isError) {
    return <PlaceholderPanel title="Alerts unavailable" note="Could not load alerts. Try again from the dashboard." />;
  }

  const countFor = (status: AlertStatus) => data.alerts.filter((a) => a.status === status).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-sans font-semibold">Alerts</h1>
        <p className="text-sm text-text-secondary">
          Ordered by backend severity. Each alert shows the backend text as received.
        </p>
      </div>

      <Card>
        <ul className="flex flex-wrap gap-3" aria-label="Alert counts by status">
          {STATUSES.map((status) => (
            <li key={status} className="flex items-center gap-2 text-sm">
              <SeverityChip status={status} />
              <span className="font-mono">{countFor(status)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <AlertsWidget alerts={data.alerts} nowMs={dataUpdatedAt || Date.now()} />
    </div>
  );
}
