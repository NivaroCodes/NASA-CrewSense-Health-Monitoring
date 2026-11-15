import type { ScanCreate } from '../../types/api';

const FIELD_LABELS: Record<string, string> = {
  value: 'value',
  observed_at: 'observation time',
  source_type: 'source type',
  source_detail: 'source note',
  mood_score: 'mood',
  stress_score: 'stress',
  sleep_hours: 'sleep hours',
  symptoms: 'symptoms',
  notes: 'notes',
  client_scan_id: 'scan ID',
  as_of: 'scan time',
};

// Turns a server field path into words the user can act on: "new_measurements[0].value" with a body that
// measures systolic_bp becomes "systolic_bp, value". Falls back to the field name, never to internal detail.
export function readableField(field: string, body?: ScanCreate): string {
  const measurement = /^new_measurements\[(\d+)\]\.(\w+)$/.exec(field);
  if (measurement) {
    const index = Number(measurement[1]);
    const label = FIELD_LABELS[measurement[2]] ?? measurement[2];
    const metric = body?.new_measurements[index]?.metric_key;
    return metric ? `${metric}, ${label}` : `measurement ${index + 1}, ${label}`;
  }
  const wellbeing = /^wellbeing\.(\w+)$/.exec(field);
  if (wellbeing) return `wellbeing, ${FIELD_LABELS[wellbeing[1]] ?? wellbeing[1]}`;
  return FIELD_LABELS[field] ?? field.replace(/_/g, ' ');
}
