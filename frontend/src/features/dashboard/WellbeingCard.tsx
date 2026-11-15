import { Card } from '../../components/ui/Card';
import { ProvenanceBadge } from '../../components/ui/ProvenanceBadge';
import type { WellbeingStatus } from '../../types/api';
import { formatDateTime } from '../../utils/datetime';
import { SYMPTOM_LABEL } from '../../utils/labels';

// Wellbeing is self-reported on the scan. It is not a sensor measurement and is labelled that way.
export function WellbeingCard({ wellbeing }: { wellbeing: WellbeingStatus }) {
  const none = wellbeing.as_of === null;
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Wellbeing</h2>
        <ProvenanceBadge sourceType={wellbeing.source_type} />
      </div>
      {none ? (
        <p className="mt-3 text-sm text-text-secondary">No wellbeing assessment recorded yet.</p>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-text-secondary">Mood (1–5)</dt>
          <dd className="font-mono">{wellbeing.mood_score ?? 'not recorded'}</dd>
          <dt className="text-text-secondary">Stress (0–10)</dt>
          <dd className="font-mono">{wellbeing.stress_score ?? 'not recorded'}</dd>
          <dt className="text-text-secondary">Sleep</dt>
          <dd className="font-mono">{wellbeing.sleep_hours !== null ? `${wellbeing.sleep_hours} h` : 'not recorded'}</dd>
          <dt className="text-text-secondary">Symptoms</dt>
          <dd>{wellbeing.symptoms.length ? wellbeing.symptoms.map((s) => SYMPTOM_LABEL[s] ?? s).join(', ') : 'none reported'}</dd>
        </dl>
      )}
      {!none ? <p className="mt-3 text-xs text-text-secondary">Assessed {formatDateTime(wellbeing.as_of)}</p> : null}
      <p className="mt-2 text-xs">
        {wellbeing.required_today ? (
          <span className="text-accent-orange">Today's wellbeing assessment is required.</span>
        ) : (
          <span className="text-text-secondary">Recorded for the current mission day.</span>
        )}
      </p>
    </Card>
  );
}
