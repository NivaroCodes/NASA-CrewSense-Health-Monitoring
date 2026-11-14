import type { ManualKey } from '../../store/useScanStore';
import type { Reading } from '../../types/telemetry';

// Step 3: derive which manual fields are needed from what the sources actually returned (Spec, Section 6).
// A reading with no value means the metric is missing. Nothing is inferred for a source that did not answer.
export function computeMissing(readings: Reading[]): ManualKey[] {
  const has = (id: Reading['id']) => readings.find((r) => r.id === id)?.value != null;
  const missing: ManualKey[] = [];
  if (!has('heartRate')) missing.push('heartRate');
  if (!has('bloodPressure')) missing.push('systolic', 'diastolic');
  if (!has('bloodGlucose')) missing.push('glucose');
  if (!has('bodyTemperature')) missing.push('temperature');
  if (!has('sleepDuration')) missing.push('sleep');
  return missing;
}
