import type { ErrorDetail, MetricOut, ScanRequirement } from '../../types/api';
import type { ScanDraft, ScanStep, WellbeingDraft } from '../../types/scanDraft';
import { validateInBounds } from '../../utils/bounds';
import { fromLocalInputValue } from '../../utils/datetime';
import { validateDecimal, validateInteger } from '../../utils/validation';

// Client-side checks mirror the contract so most mistakes are caught before a request is made.
// The server remains the authority; its errors are mapped back onto the same fields.
export const MAX_FUTURE_SKEW_MS = 5 * 60_000; // contract: observed_at must not be more than 5 minutes ahead
export const NOTES_MAX = 500;

// Keys: `<metric_key>` for the value, `<metric_key>:observedAt`, `<metric_key>:sourceType`; wellbeing fields by name.
export type FieldErrors = Record<string, string>;

export interface ScanInputs {
  requirements: ScanRequirement[];
  metricsByKey: Map<string, MetricOut>;
  draft: ScanDraft;
  nowMs?: number;
}

export function measurementErrors(inputs: ScanInputs): FieldErrors {
  const errors: FieldErrors = {};
  const now = inputs.nowMs ?? Date.now();
  for (const req of inputs.requirements) {
    const entry = inputs.draft.entries[req.metric_key];
    const metric = inputs.metricsByKey.get(req.metric_key);
    if (!metric) {
      errors[req.metric_key] = 'The metric definition is unavailable. Connect to the server to continue.';
      continue;
    }
    const value = validateInBounds(entry?.value ?? '', metric.plausible_min, metric.plausible_max, metric.canonical_unit);
    if (!value.ok) errors[req.metric_key] = value.message;

    const observed = entry ? fromLocalInputValue(entry.observedAt) : null;
    if (!observed) {
      errors[`${req.metric_key}:observedAt`] = 'Enter the observation date and time.';
    } else if (Date.parse(observed) > now + MAX_FUTURE_SKEW_MS) {
      errors[`${req.metric_key}:observedAt`] = 'The observation time cannot be more than 5 minutes in the future.';
    }

    if (entry && !req.allowed_source_types.includes(entry.sourceType)) {
      errors[`${req.metric_key}:sourceType`] = 'Choose a source type allowed for this value.';
    }
  }
  return errors;
}

export function wellbeingErrors(w: WellbeingDraft): FieldErrors {
  const errors: FieldErrors = {};
  const mood = validateInteger(w.moodScore, 1, 5, 'points');
  if (!mood.ok) errors.moodScore = mood.message;
  const stress = validateInteger(w.stressScore, 0, 10, 'points');
  if (!stress.ok) errors.stressScore = stress.message;
  const sleep = validateDecimal(w.sleepHours, 0, 24, 'h', 2);
  if (!sleep.ok) errors.sleepHours = sleep.message;
  if (w.notes.length > NOTES_MAX) errors.notes = `Use at most ${NOTES_MAX} characters.`;
  return errors;
}

// Errors for the step the astronaut is on. Steps without input have none.
export function stepErrors(step: ScanStep, inputs: ScanInputs): FieldErrors {
  if (step === 2) return measurementErrors(inputs);
  if (step === 3) return wellbeingErrors(inputs.draft.wellbeing);
  return {};
}

const WELLBEING_FIELDS: Record<string, string> = {
  'wellbeing.mood_score': 'moodScore',
  'wellbeing.stress_score': 'stressScore',
  'wellbeing.sleep_hours': 'sleepHours',
  'wellbeing.symptoms': 'symptoms',
  'wellbeing.notes': 'notes',
};

// Maps server errors (for example "new_measurements[1].value") onto the fields that produced them.
// Index i refers to the requirement at position i, which is how buildScanBody orders the array.
export function mapServerErrors(details: ErrorDetail[], requirements: ScanRequirement[]): { fields: FieldErrors; general: string[] } {
  const fields: FieldErrors = {};
  const general: string[] = [];
  for (const detail of details) {
    const match = /^new_measurements\[(\d+)\]\.(\w+)/.exec(detail.field);
    if (match) {
      const requirement = requirements[Number(match[1])];
      if (requirement) {
        const field = match[2];
        const suffix = field === 'observed_at' ? ':observedAt' : field === 'source_type' ? ':sourceType' : '';
        fields[`${requirement.metric_key}${suffix}`] = detail.message;
        continue;
      }
    }
    const wellbeingField = WELLBEING_FIELDS[detail.field];
    if (wellbeingField) {
      fields[wellbeingField] = detail.message;
      continue;
    }
    general.push(`${detail.field}: ${detail.message}`);
  }
  return { fields, general };
}
