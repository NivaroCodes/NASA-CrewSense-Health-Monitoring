import type { SourceTypeInput, Symptom } from './api';

export type ScanStep = 1 | 2 | 3 | 4;

// One manual value. Kept as text while typing; validated before it can leave the device.
export interface ManualEntry {
  value: string;
  // Local datetime text from <input type="datetime-local">, converted to UTC only when submitted.
  observedAt: string;
  sourceType: SourceTypeInput;
}

export interface WellbeingDraft {
  moodScore: string;
  stressScore: string;
  sleepHours: string;
  symptoms: Symptom[];
  notes: string;
}

export interface ScanDraft {
  step: ScanStep;
  // Keyed by metric_key, only for values the backend asked for.
  entries: Record<string, ManualEntry>;
  wellbeing: WellbeingDraft;
}

export const EMPTY_WELLBEING: WellbeingDraft = {
  moodScore: '',
  stressScore: '',
  sleepHours: '',
  symptoms: [],
  notes: '',
};
