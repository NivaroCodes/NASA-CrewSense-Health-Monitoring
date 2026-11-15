import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { ProvenanceBadge } from '../../components/ui/ProvenanceBadge';
import { StatusChip } from '../../components/ui/StatusChip';
import type { DashboardIndicator } from '../../types/api';
import { formatDateTime } from '../../utils/datetime';
import { formatAgeHours, formatSignedPercent, formatValue } from '../../utils/format';

interface Props {
  indicator: DashboardIndicator;
  description?: string;
  showLink?: boolean;
}

// One backend indicator. A missing value is shown as missing, never as zero or as normal.
export function IndicatorCard({ indicator: ind, description, showLink = true }: Props) {
  const latest = ind.latest;
  const comparedDiffers = latest !== null && ind.compared_value !== null && ind.compared_value !== latest.value;

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold">{ind.display_name}</h3>
        <StatusChip value={ind.status} />
      </div>

      {latest ? (
        <p className="font-mono text-2xl font-medium text-text-primary">
          {formatValue(latest.value)} <span className="text-sm text-text-secondary">{latest.unit}</span>
        </p>
      ) : (
        <p className="text-sm text-text-secondary">No value stored</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <ProvenanceBadge sourceType={latest?.source_type} isSynthetic={latest?.is_synthetic} />
        <StatusChip value={ind.freshness} />
      </div>

      {latest ? (
        <p className="text-xs text-text-secondary">
          Observed <span className="font-mono">{formatDateTime(latest.observed_at)}</span>
          {ind.age_hours !== null ? ` · ${formatAgeHours(ind.age_hours)} before reference time` : ''}
        </p>
      ) : null}

      {ind.baseline ? (
        <p className="text-xs text-text-secondary">
          Personal baseline <span className="font-mono text-accent-teal">{formatValue(ind.baseline.reference_value)} {ind.baseline.unit}</span> ({ind.baseline.observation_count} observations)
          {ind.change_pct !== null ? <>, change <span className="font-mono">{formatSignedPercent(ind.change_pct)}</span></> : ''}
        </p>
      ) : null}

      {comparedDiffers && latest ? (
        <p className="text-xs text-text-secondary">
          Compared value {formatValue(ind.compared_value ?? 0)} {latest.unit} (see note)
        </p>
      ) : null}

      {ind.note ? <p className="text-xs text-text-secondary">{ind.note}</p> : null}
      {description ? <p className="text-xs text-text-secondary">{description}</p> : null}

      {showLink ? (
        <Link to={`/indicators/${ind.metric_key}`} className="text-sm text-accent-teal underline">
          Details and history
        </Link>
      ) : null}
    </Card>
  );
}
