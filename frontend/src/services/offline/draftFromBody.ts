import type { ScanCreate } from '../../types/api';
import { EMPTY_WELLBEING, type ManualEntry, type ScanDraft } from '../../types/scanDraft';
import { toLocalInputValue } from '../../utils/datetime';

// Turns a stored scan body back into an editable draft, so a scan rejected for invalid values can be corrected.
// The creation time (as_of) is kept, so the corrected scan still reports when it was started.
export function draftFromBody(body: ScanCreate, fallbackStart: string): ScanDraft {
  const entries: Record<string, ManualEntry> = {};
  for (const m of body.new_measurements) {
    entries[m.metric_key] = {
      value: String(m.value),
      observedAt: toLocalInputValue(m.observed_at),
      sourceType: m.source_type,
    };
  }
  const w = body.wellbeing;
  return {
    step: 1,
    startedAt: body.as_of ?? fallbackStart,
    entries,
    wellbeing: {
      ...EMPTY_WELLBEING,
      moodScore: String(w.mood_score),
      stressScore: String(w.stress_score),
      sleepHours: String(w.sleep_hours),
      symptoms: [...w.symptoms],
      notes: w.notes ?? '',
    },
  };
}
