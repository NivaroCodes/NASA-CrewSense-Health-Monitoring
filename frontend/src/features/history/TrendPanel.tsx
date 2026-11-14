import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { TrendChart } from '../../components/charts/TrendChart';
import { useTrendSeries } from '../../hooks/useTrendSeries';
import type { IndicatorId } from '../../types/telemetry';

// Loads and shows one indicator's trend. Loading, error and unavailable states use distinct wording.
export function TrendPanel({ id, title }: { id: IndicatorId; title: string }) {
  const { data, isPending, isError, refetch } = useTrendSeries(id);

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {isPending ? (
        <Skeleton className="h-56 w-full" />
      ) : isError ? (
        <div className="space-y-2">
          <p className="text-sm">Could not load this trend.</p>
          <button type="button" className="text-sm text-accent-cyan underline" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      ) : data === null ? (
        <p className="text-sm text-text-secondary">History is not available for this indicator yet.</p>
      ) : (
        <TrendChart series={data} />
      )}
    </Card>
  );
}
