import { Card } from '../../components/ui/Card';
import { NumericInput } from '../../components/ui/NumericInput';
import { StatusChip } from '../../components/ui/StatusChip';
import type { Dashboard, MetricOut, ScanRequirement, Symptom } from '../../types/api';
import type { ManualEntry, ScanDraft, WellbeingDraft } from '../../types/scanDraft';
import { formatValue } from '../../utils/format';
import { SOURCE_LABEL, SYMPTOM_OPTIONS } from '../../utils/labels';
import { NOTES_MAX, type FieldErrors } from './validateStep';

// Step 1: what the backend needs today. Nothing is entered here.
export function StepOverview({ dashboard, requirements }: { dashboard: Dashboard; requirements: ScanRequirement[] }) {
  return (
    <Card className="space-y-3">
      <h2 className="text-sm font-semibold">Today's scan</h2>
      {requirements.length === 0 ? (
        <p className="text-sm">No measurements are needed today. Only the wellbeing assessment is required.</p>
      ) : (
        <>
          <p className="text-sm text-text-secondary">These values are missing or outdated. Enter them in the next step.</p>
          <ul className="space-y-1 text-sm">
            {requirements.map((r) => (
              <li key={r.metric_key} className="flex items-center gap-2">
                <span>{r.display_name}</span>
                <StatusChip value={r.reason} />
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-xs text-text-secondary">
        {dashboard.wellbeing.required_today
          ? 'The wellbeing assessment is required for this mission day.'
          : 'A wellbeing assessment has already been recorded for this mission day. You can still submit a new one.'}
      </p>
    </Card>
  );
}

// Step 2: manual values the backend asked for. Each one carries its own observation time and source type.
export function StepMeasurements({
  requirements,
  metricsByKey,
  entries,
  errors,
  onEntry,
  defaultObservedAt,
}: {
  requirements: ScanRequirement[];
  metricsByKey: Map<string, MetricOut>;
  entries: Record<string, ManualEntry>;
  errors: FieldErrors;
  onEntry: (metricKey: string, patch: Partial<ManualEntry>) => void;
  defaultObservedAt: string;
}) {
  return (
    <section aria-label="Measurements" className="space-y-4">
      <p className="text-sm text-text-secondary">
        Each value is stored with its observation time and source. Ranges are plausibility limits from the metric catalogue, not clinical ranges.
      </p>
      {requirements.map((req) => {
        const metric = metricsByKey.get(req.metric_key);
        const entry = entries[req.metric_key];
        const observedId = `observed-${req.metric_key}`;
        const sourceId = `source-${req.metric_key}`;
        return (
          <Card key={req.metric_key} className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{req.display_name}</h3>
              <StatusChip value={req.reason} />
            </div>
            {metric ? <p className="text-xs text-text-secondary">{metric.description}</p> : null}
            <NumericInput
              label="Value"
              unit={metric?.canonical_unit ?? req.unit}
              value={entry?.value ?? ''}
              onChange={(value) => onEntry(req.metric_key, { value })}
              rangeHint={metric ? `${metric.plausible_min} to ${metric.plausible_max} ${metric.canonical_unit}` : 'unavailable offline'}
              error={errors[req.metric_key]}
              inputMode="decimal"
            />
            <div className="flex flex-wrap gap-4">
              <label htmlFor={observedId} className="space-y-1 text-sm">
                <span className="block text-text-secondary">Observed at</span>
                <input
                  id={observedId}
                  type="datetime-local"
                  value={entry?.observedAt || defaultObservedAt}
                  onChange={(e) => onEntry(req.metric_key, { observedAt: e.target.value })}
                  className="rounded-chip border border-border-subtle bg-bg-surface px-2 py-1 font-mono text-sm"
                />
                {errors[`${req.metric_key}:observedAt`] ? (
                  <span role="alert" className="block text-xs text-accent-crimson">
                    {errors[`${req.metric_key}:observedAt`]}
                  </span>
                ) : null}
              </label>
              <label htmlFor={sourceId} className="space-y-1 text-sm">
                <span className="block text-text-secondary">Source</span>
                <select
                  id={sourceId}
                  value={entry?.sourceType ?? req.allowed_source_types[0]}
                  onChange={(e) => onEntry(req.metric_key, { sourceType: e.target.value as ManualEntry['sourceType'] })}
                  className="rounded-chip border border-border-subtle bg-bg-surface px-2 py-1 text-sm"
                >
                  {req.allowed_source_types.map((s) => (
                    <option key={s} value={s}>
                      {SOURCE_LABEL[s] ?? s}
                    </option>
                  ))}
                </select>
                {errors[`${req.metric_key}:sourceType`] ? (
                  <span role="alert" className="block text-xs text-accent-crimson">
                    {errors[`${req.metric_key}:sourceType`]}
                  </span>
                ) : null}
              </label>
            </div>
          </Card>
        );
      })}
    </section>
  );
}

// Step 3: wellbeing is self-reported, so it is labelled as such on the form and on the result.
export function StepWellbeing({
  wellbeing,
  errors,
  onChange,
  onToggleSymptom,
}: {
  wellbeing: WellbeingDraft;
  errors: FieldErrors;
  onChange: (patch: Partial<WellbeingDraft>) => void;
  onToggleSymptom: (symptom: Symptom) => void;
}) {
  return (
    <section aria-label="Wellbeing" className="space-y-5">
      <p className="text-sm text-text-secondary">Self-reported. Answer as you feel today; these answers are not sensor measurements.</p>

      <fieldset className="space-y-2">
        <legend className="text-sm text-text-secondary">Mood (1 = low, 5 = high)</legend>
        <div className="flex gap-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                name="mood"
                value={n}
                checked={wellbeing.moodScore === String(n)}
                onChange={() => onChange({ moodScore: String(n) })}
              />
              {n}
            </label>
          ))}
        </div>
        {errors.moodScore ? <p role="alert" className="text-xs text-accent-crimson">{errors.moodScore}</p> : null}
      </fieldset>

      <NumericInput
        label="Stress"
        unit="points"
        value={wellbeing.stressScore}
        onChange={(v) => onChange({ stressScore: v })}
        rangeHint="0 to 10 points"
        error={errors.stressScore}
      />

      <NumericInput
        label="Sleep last night"
        unit="h"
        value={wellbeing.sleepHours}
        onChange={(v) => onChange({ sleepHours: v })}
        rangeHint="0 to 24 hours"
        error={errors.sleepHours}
        inputMode="decimal"
      />

      <fieldset className="space-y-2">
        <legend className="text-sm text-text-secondary">Symptoms today</legend>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {SYMPTOM_OPTIONS.map((s) => (
            <label key={s.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={wellbeing.symptoms.includes(s.value as Symptom)}
                onChange={() => onToggleSymptom(s.value as Symptom)}
              />
              {s.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block space-y-1 text-sm">
        <span className="block text-text-secondary">Notes (optional)</span>
        <textarea
          value={wellbeing.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={3}
          className="w-full rounded-chip border border-border-subtle bg-bg-surface p-2 text-sm"
        />
        <span className={`block text-xs ${wellbeing.notes.length > NOTES_MAX ? 'text-accent-crimson' : 'text-text-secondary'}`}>
          {wellbeing.notes.length} / {NOTES_MAX}
        </span>
        {errors.notes ? <span role="alert" className="block text-xs text-accent-crimson">{errors.notes}</span> : null}
      </label>
    </section>
  );
}

// Step 4: everything that will be sent, with its source, before anything leaves the device.
export function StepReview({
  requirements,
  metricsByKey,
  draft,
}: {
  requirements: ScanRequirement[];
  metricsByKey: Map<string, MetricOut>;
  draft: ScanDraft;
}) {
  const w = draft.wellbeing;
  return (
    <section aria-label="Review" className="space-y-4">
      <Card>
        <h2 className="text-sm font-semibold">Measurements to store</h2>
        {requirements.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">None today.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {requirements.map((req) => {
              const entry = draft.entries[req.metric_key];
              const metric = metricsByKey.get(req.metric_key);
              return (
                <li key={req.metric_key} className="flex flex-wrap items-center gap-3">
                  <span>{req.display_name}</span>
                  <span className="font-mono">
                    {entry?.value ? formatValue(Number(entry.value)) : '—'} {metric?.canonical_unit ?? req.unit}
                  </span>
                  <span className="text-xs text-text-secondary">{SOURCE_LABEL[entry?.sourceType ?? ''] ?? 'No source'}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Card>
        <h2 className="text-sm font-semibold">Wellbeing (self-reported)</h2>
        <p className="mt-2 text-sm">
          Mood {w.moodScore || '—'} · Stress {w.stressScore || '—'} · Sleep {w.sleepHours || '—'} h · Symptoms{' '}
          {w.symptoms.length ? w.symptoms.join(', ') : 'none'}
        </p>
        {w.notes.trim() ? <p className="mt-1 text-xs text-text-secondary">Notes: {w.notes.trim()}</p> : null}
      </Card>
      <p className="text-xs text-text-secondary">
        Submitting stores this scan on the server, then runs the monitoring rules. Results are guidance from personal history, not a diagnosis.
      </p>
    </section>
  );
}
