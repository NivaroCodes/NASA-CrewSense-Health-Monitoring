import type { MeasurementInput, MetricOut, ScanCreate, ScanRequirement } from '../../types/api';
import type { ScanDraft } from '../../types/scanDraft';
import { fromLocalInputValue } from '../../utils/datetime';

// Builds the exact POST /scans body. Measurements follow the requirement order, so server error indexes map back.
export function buildScanBody(args: {
  astronautId: number;
  asOf: string;
  clientScanId: string;
  draft: ScanDraft;
  requirements: ScanRequirement[];
  metricsByKey: Map<string, MetricOut>;
}): ScanCreate {
  const newMeasurements: MeasurementInput[] = args.requirements.map((req) => {
    const entry = args.draft.entries[req.metric_key];
    const metric = args.metricsByKey.get(req.metric_key);
    if (!entry || !metric) throw new Error(`Missing value or definition for ${req.display_name}.`);
    const observed = fromLocalInputValue(entry.observedAt);
    if (!observed) throw new Error(`Invalid observation time for ${req.display_name}.`);
    const item: MeasurementInput = {
      metric_key: req.metric_key,
      value: Number(entry.value.trim()),
      unit: metric.canonical_unit,
      observed_at: observed,
      source_type: entry.sourceType,
    };
    if (entry.sourceType === 'manual_input') item.source_detail = 'Entered in CrewSense Daily Scan';
    return item;
  });

  const w = args.draft.wellbeing;
  const notes = w.notes.trim();
  return {
    astronaut_id: args.astronautId,
    client_scan_id: args.clientScanId,
    as_of: args.asOf,
    wellbeing: {
      mood_score: Number(w.moodScore),
      stress_score: Number(w.stressScore),
      sleep_hours: Number(w.sleepHours),
      symptoms: w.symptoms,
      ...(notes ? { notes } : {}),
    },
    new_measurements: newMeasurements,
  };
}
