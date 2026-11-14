import { Link, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { PlaceholderPanel } from '../../components/ui/EmptyState';
import { ProvenanceBadge } from '../../components/ui/ProvenanceBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { useHealthOverview } from '../../hooks/useHealthOverview';
import { TrendPanel } from '../history/TrendPanel';
import type { IndicatorId } from '../../types/telemetry';

const KNOWN: IndicatorId[] = ['heartRate', 'bloodPressure', 'bloodGlucose', 'bodyTemperature', 'sleepDuration', 'mood'];

// Indicator detail (Spec, Section 7): current reading with provenance, then its 30-day trend.
export function IndicatorDetailPage() {
  const { id } = useParams();
  const { data, isPending, isError } = useHealthOverview();

  if (!id || !KNOWN.includes(id as IndicatorId)) {
    return <PlaceholderPanel title="Indicator not found" note="This indicator is not part of the monitored set." />;
  }
  const indicator = id as IndicatorId;

  if (isPending) return <Skeleton className="h-48 w-full" />;
  if (isError) {
    return <PlaceholderPanel title="Indicator unavailable" note="Could not load the current reading. Try again from the dashboard." />;
  }

  const reading = data.readings.find((r) => r.id === indicator);

  return (
    <div className="space-y-6">
      <Link to="/dashboard" className="text-sm text-accent-cyan underline">
        Back to dashboard
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-sans font-semibold">{reading?.name ?? indicator}</h1>
            {reading?.value != null ? (
              <p className="mt-2 font-mono text-3xl">
                {reading.value} <span className="text-base text-text-secondary">{reading.unit}</span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-text-secondary">No reading. Enter it manually from the Daily Health Scan.</p>
            )}
          </div>
          <div className="space-y-2 text-right">
            <ProvenanceBadge source={reading?.provenance} />
            <p className="text-xs text-text-secondary">
              Status: {reading?.status ?? 'Not reported by backend'}
            </p>
            {reading?.measuredAt ? (
              <p className="text-xs text-text-secondary">Measured {new Date(reading.measuredAt).toLocaleString()}</p>
            ) : null}
          </div>
        </div>
      </Card>

      <TrendPanel id={indicator} title="30-day trend" />
    </div>
  );
}
