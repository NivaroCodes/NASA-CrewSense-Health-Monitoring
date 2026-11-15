import { Link, useParams } from 'react-router-dom';
import { ErrorPanel } from '../../components/ui/ErrorPanel';
import { PageSkeleton } from '../../components/ui/Loading';
import { PlaceholderPanel } from '../../components/ui/EmptyState';
import { ApiError } from '../../services/api/client';
import { useScan } from '../../hooks/useLists';
import { ScanResultView } from '../scan/ScanResultView';

// Reopens a stored scan with GET /scans/{id}. The content is identical to the result shown when it was submitted.
export function ScanDetailPage() {
  const { scanId } = useParams();
  const numericId = Number(scanId);
  const validId = Number.isInteger(numericId) && numericId >= 1;
  const query = useScan(numericId);

  let body;
  if (!validId) {
    body = <PlaceholderPanel title="Scan not found" note="The scan identifier is not valid." />;
  } else if (query.isPending) {
    body = <PageSkeleton />;
  } else if (query.isError) {
    body =
      query.error instanceof ApiError && query.error.status === 404 ? (
        <PlaceholderPanel title="Scan not found" note={`No scan with id ${numericId} is stored.`} />
      ) : (
        <ErrorPanel title="Could not load this scan." error={query.error} onRetry={() => void query.refetch()} />
      );
  } else {
    body = <ScanResultView scan={query.data} />;
  }

  return (
    <div className="space-y-4">
      <Link to="/history" className="text-sm text-accent-teal underline">
        Back to history
      </Link>
      {body}
    </div>
  );
}
