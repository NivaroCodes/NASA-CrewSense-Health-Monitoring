import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorPanel } from '../../components/ui/ErrorPanel';
import { PageSkeleton } from '../../components/ui/Loading';
import { useAlerts } from '../../hooks/useLists';
import { useDashboard } from '../../hooks/useDashboard';
import { useMetrics } from '../../hooks/useMetrics';
import { formatDateTime } from '../../utils/datetime';
import { pad3 } from '../../utils/format';
import { AlertList } from './AlertList';
import { NextStepsCard } from './NextStepsCard';
import { IndicatorCard } from './IndicatorCard';
import { MonitoringBanner } from './MonitoringBanner';
import { WellbeingCard } from './WellbeingCard';

// Unified dashboard (Spec, Section 5), fed by GET /dashboard. Every value shown comes from the response.
export function DashboardPage() {
  const navigate = useNavigate();
  const dash = useDashboard();
  const metrics = useMetrics();
  const saved = useAlerts({ limit: 5 });

  if (dash.isPending) return <PageSkeleton />;
  if (dash.isError) return <ErrorPanel title="Could not load the dashboard." error={dash.error} onRetry={() => void dash.refetch()} />;

  const { data: d, fromCache, cachedAt } = dash.data;
  const descriptions = new Map<string, string>((metrics.data?.data.items ?? []).map((m): [string, string] => [m.metric_key, m.description]));
  const needed = d.scan_requirements.map((r) => `${r.display_name} (${r.reason})`).join(', ');

  return (
    <div className="space-y-6">
      {fromCache ? (
        <Card>
          <p className="text-sm text-accent-orange">Offline: showing the last dashboard received at {formatDateTime(cachedAt)}. Values may be outdated.</p>
        </Card>
      ) : null}

      <div>
        <h1 className="text-2xl font-sans font-bold">
          {d.astronaut.display_name} · Mission Day {pad3(d.mission.mission_day)}
        </h1>
        <p className="text-sm text-text-secondary">
          Last scan submitted {d.last_scan ? formatDateTime(d.last_scan.submitted_at) : 'never'} · Evaluated at{' '}
          {formatDateTime(d.as_of)}
        </p>
      </div>

      <MonitoringBanner dashboard={d} />

      <section aria-label="Daily Health Scan" className="space-y-2">
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary" onClick={() => navigate('/scan')}>
            Start Daily Health Scan
          </Button>
          {needed ? <span className="text-sm text-text-secondary">Needed today: {needed}</span> : null}
        </div>
      </section>

      <section aria-label="Health indicators">
        <h2 className="mb-3 text-sm uppercase tracking-wide text-text-secondary">Indicators</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {d.indicators.map((indicator) => (
            <IndicatorCard key={indicator.metric_key} indicator={indicator} description={descriptions.get(indicator.metric_key)} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <WellbeingCard wellbeing={d.wellbeing} />
        <NextStepsCard lastScanId={d.last_scan?.id} />
        <Card>
          <h2 className="text-sm font-semibold">Data notices</h2>
          {d.data_notices.length === 0 ? (
            <p className="mt-2 text-sm text-text-secondary">No data notices.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {d.data_notices.map((n) => (
                <li key={`${n.id}-${n.metric_key}`}>
                  <span className="font-mono text-xs text-text-secondary">{n.id}</span> {n.message}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section aria-label="Live checks">
        <h2 className="mb-3 text-sm uppercase tracking-wide text-text-secondary">Live checks at reference time</h2>
        {d.alerts.length === 0 ? (
          <p className="text-sm text-text-secondary">No rule fires at the reference time.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {d.alerts.map((a) => (
              <li key={a.rule_id}>
                <span className="font-mono text-xs">{a.rule_id}</span> {a.title} <span className="text-text-secondary">({a.severity})</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-text-secondary">These live checks are not stored. Alerts are saved only when a scan is submitted.</p>
      </section>

      <section aria-label="Latest saved alerts">
        <h2 className="mb-3 text-sm uppercase tracking-wide text-text-secondary">Latest saved alerts</h2>
        {saved.isError ? (
          <ErrorPanel title="Could not load saved alerts." error={saved.error} onRetry={() => void saved.refetch()} />
        ) : (
          <AlertList alerts={saved.data?.items ?? []} emptyText="No saved alerts yet." />
        )}
      </section>

      <p className="text-xs text-text-secondary">{d.disclaimer}</p>
    </div>
  );
}
