import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import type { Dashboard } from '../../types/api';
import { CATEGORY_LABEL } from '../../utils/labels';

// Hero summary: answers "is everything okay?" in plain words. Counts come from the backend; nothing is scored here.
export function MonitoringBanner({ dashboard }: { dashboard: Dashboard }) {
  const areas = dashboard.problem_areas;
  const attention = areas.filter((a) => a.status === 'attention');
  const notCurrent = dashboard.indicators.filter((i) => i.freshness !== 'current').length;
  const calm = attention.length === 0;

  return (
    <Card className="p-7">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent-teal">Today</p>
      <h2 className="mt-2 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight">
        {calm
          ? 'No area currently needs attention.'
          : `${attention.length} of ${areas.length} areas need a closer look today.`}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
        {calm ? 'Readings match this astronaut’s own usual range. ' : 'This is a flag for review, not a diagnosis. '}
        {notCurrent > 0 ? `${notCurrent} reading${notCurrent === 1 ? ' is' : 's are'} missing or old. ` : ''}
        {dashboard.data_notices.length > 0 ? `${dashboard.data_notices.length} data notice${dashboard.data_notices.length === 1 ? '' : 's'}.` : ''}
      </p>
      <ul aria-label="Problem areas" className="mt-5 flex flex-wrap gap-x-5 gap-y-3">
        {areas.map((area) => (
          <li key={area.area} className="flex items-center gap-2 text-sm font-medium">
            <span>{area.label || CATEGORY_LABEL[area.area] || area.area}</span>
            <StatusChip value={area.status} />
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs text-text-secondary">{dashboard.disclaimer}</p>
    </Card>
  );
}
