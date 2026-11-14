import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { SyntheticNotice } from '../../components/ui/SyntheticNotice';
import { useHealthOverview } from '../../hooks/useHealthOverview';
import { IS_DEMO_DATA } from '../../services/api/endpoints';
import { AlertsWidget } from './AlertsWidget';
import { IndicatorCard } from './IndicatorCard';
import { MonitoringBanner } from './MonitoringBanner';

// Unified dashboard (Spec, Section 5). Blocks in vertical order:
// monitoring status, scan entry, indicator grid, alerts. Trends and activity follow in T-015 and later.
export function DashboardPage() {
  const { data, isPending, isError, refetch, dataUpdatedAt } = useHealthOverview();
  // Captured per data load so relative times stay stable between renders.
  const [nowMs] = useState(() => Date.now());
  const nowForRender = dataUpdatedAt || nowMs;

  return (
    <div className="space-y-6">
      {IS_DEMO_DATA ? <SyntheticNotice /> : null}

      {isPending ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-48" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <Card>
          <p className="text-sm">Could not load the health overview.</p>
          <p className="mt-1 text-xs text-text-secondary">Values on screen, if any, remain as they were.</p>
          <div className="mt-3">
            <Button variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <MonitoringBanner summary={data.monitoring} />

          <section aria-label="Daily Health Scan">
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary">Start Daily Health Scan</Button>
              <span className="text-sm text-text-secondary">
                Last scan: {data.lastScanAt ? new Date(data.lastScanAt).toLocaleString() : 'Never'}
              </span>
            </div>
          </section>

          <section aria-label="Health indicators">
            <h2 className="mb-3 text-sm uppercase tracking-wide text-text-secondary">Indicators</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.readings.map((reading) => (
                <IndicatorCard key={reading.id} reading={reading} nowMs={nowForRender} />
              ))}
            </div>
          </section>

          <section aria-label="Active alerts">
            <h2 className="mb-3 text-sm uppercase tracking-wide text-text-secondary">Alerts</h2>
            <AlertsWidget alerts={data.alerts} nowMs={nowForRender} />
          </section>
        </>
      )}
    </div>
  );
}
