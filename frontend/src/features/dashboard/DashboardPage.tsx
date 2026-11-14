import { Card } from '../../components/ui/Card';
import { PlaceholderPanel } from '../../components/ui/EmptyState';
import { ProvenanceBadge } from '../../components/ui/ProvenanceBadge';

// Shell for the unified dashboard (Spec, Section 5). Blocks are added per task T-011 to T-014.
// The indicator tile below is a static example of the required rendering, not live data.
export function DashboardPage() {
  return (
    <div className="space-y-6">
      <PlaceholderPanel
        title="Dashboard"
        note="Monitoring status, scan entry, indicators, alerts, trends and activity land here."
      />
      <Card>
        <p className="text-sm text-text-secondary">Example tile layout (no data loaded)</p>
        <p className="mt-2 font-mono text-2xl">No reading</p>
        <div className="mt-2">
          <ProvenanceBadge source={undefined} />
        </div>
      </Card>
    </div>
  );
}
