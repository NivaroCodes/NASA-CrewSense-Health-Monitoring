import { useState } from 'react';
import { ErrorPanel } from '../../components/ui/ErrorPanel';
import { PageSkeleton } from '../../components/ui/Loading';
import { AlertList } from '../dashboard/AlertList';
import { useAlerts } from '../../hooks/useLists';
import { CATEGORY_LABEL } from '../../utils/labels';

// Saved alerts from GET /alerts, filtered by the backend's own enumerations.
export function AlertsPage() {
  const [severity, setSeverity] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const query = useAlerts({
    severity: severity || undefined,
    category: category || undefined,
    limit: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-sans font-semibold">Alerts</h1>
        <p className="text-sm text-text-secondary">
          Saved from Daily Health Scans. Dashboard live checks are not stored and do not appear here.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-text-secondary">Severity</span>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="rounded-chip border border-border-subtle bg-bg-surface px-2 py-1">
            <option value="">All</option>
            <option value="attention">Attention</option>
            <option value="info">Info</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-text-secondary">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-chip border border-border-subtle bg-bg-surface px-2 py-1">
            <option value="">All</option>
            {Object.entries(CATEGORY_LABEL)
              .filter(([key]) => ['cardiovascular', 'bone_muscle', 'immune', 'behavioral'].includes(key))
              .map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
          </select>
        </label>
      </div>

      {query.isPending ? (
        <PageSkeleton />
      ) : query.isError ? (
        <ErrorPanel title="Could not load alerts." error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          <p className="text-xs text-text-secondary">
            Showing {query.data.items.length} of {query.data.total} saved alerts.
          </p>
          <AlertList alerts={query.data.items} emptyText="No saved alerts match these filters." />
        </>
      )}
    </div>
  );
}
