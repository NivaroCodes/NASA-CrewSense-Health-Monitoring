import { Card } from '../../components/ui/Card';
import { useScan } from '../../hooks/useLists';
import { formatDateTime } from '../../utils/datetime';

// Recommended actions from the last saved scan (contract section 6, next_steps). Read-only; no new endpoint.
export function NextStepsCard({ lastScanId }: { lastScanId: number | undefined }) {
  const scan = useScan(lastScanId);

  return (
    <Card>
      <h2 className="text-sm font-semibold">Recommended next steps</h2>
      {lastScanId === undefined ? (
        <p className="mt-2 text-sm text-text-secondary">Submit a Daily Health Scan to get recommended next steps.</p>
      ) : scan.isPending ? (
        <p className="mt-2 text-sm text-text-secondary">Loading the last scan…</p>
      ) : scan.isError ? (
        <p className="mt-2 text-sm text-accent-amber">Could not load the last scan's next steps.</p>
      ) : scan.data.summary.overall_status === 'not_evaluated' ? (
        <p className="mt-2 text-sm text-text-secondary">The last scan was not analysed, so it has no next steps. Submit today's scan to get them.</p>
      ) : scan.data.next_steps.length === 0 ? (
        <p className="mt-2 text-sm text-text-secondary">No next steps were given in the last scan.</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-text-secondary">From scan #{scan.data.id}, submitted {formatDateTime(scan.data.submitted_at)}</p>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">
            {[...scan.data.next_steps]
              .sort((a, b) => a.priority - b.priority)
              .map((s) => (
                <li key={s.priority}>{s.text}</li>
              ))}
          </ol>
        </>
      )}
    </Card>
  );
}
