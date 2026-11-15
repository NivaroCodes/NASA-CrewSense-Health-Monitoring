import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import type { Dashboard } from '../../types/api';
import { CATEGORY_LABEL } from '../../utils/labels';

// Summary of the four problem areas from the dashboard. Counts come from the backend; nothing is scored here.
export function MonitoringBanner({ dashboard }: { dashboard: Dashboard }) {
  const areas = dashboard.problem_areas;
  const attention = areas.filter((a) => a.status === 'attention').length;
  const notCurrent = dashboard.indicators.filter((i) => i.freshness !== 'current').length;

  return (
    <Card>
      <p className="text-lg">
        {attention > 0
          ? `${attention} of ${areas.length} problem areas need attention`
          : 'No problem area currently needs attention'}
      </p>
      <p className="mt-1 text-sm text-text-secondary">
        {notCurrent > 0 ? `${notCurrent} indicator(s) missing or outdated. ` : ''}
        {dashboard.data_notices.length > 0 ? `${dashboard.data_notices.length} data notice(s).` : ''}
      </p>
      <ul aria-label="Problem areas" className="mt-3 flex flex-wrap gap-3">
        {areas.map((area) => (
          <li key={area.area} className="flex items-center gap-2 text-sm">
            <span>{area.label || CATEGORY_LABEL[area.area] || area.area}</span>
            <StatusChip value={area.status} />
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-text-secondary">{dashboard.disclaimer}</p>
    </Card>
  );
}
