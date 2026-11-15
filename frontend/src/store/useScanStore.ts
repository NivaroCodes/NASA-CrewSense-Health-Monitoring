import { create } from 'zustand';
import type { SourceTypeInput, Symptom } from '../types/api';
import { EMPTY_WELLBEING, type ManualEntry, type ScanDraft, type ScanStep, type WellbeingDraft } from '../types/scanDraft';

// The scan in progress. Every change is written to IndexedDB by ScanWizard, so a reload resumes the same scan.
interface ScanStore extends ScanDraft {
  scanId: string | null;
  begin: () => void;
  restore: (scanId: string, draft: ScanDraft) => void;
  setStep: (step: ScanStep) => void;
  ensureEntries: (defaults: Record<string, ManualEntry>) => void;
  setEntry: (metricKey: string, patch: Partial<ManualEntry>) => void;
  setWellbeing: (patch: Partial<WellbeingDraft>) => void;
  toggleSymptom: (symptom: Symptom) => void;
}

const emptyDraft = (): ScanDraft => ({
  step: 1,
  entries: {},
  wellbeing: { ...EMPTY_WELLBEING },
  startedAt: new Date().toISOString(),
});

export const useScanStore = create<ScanStore>((set) => ({
  scanId: null,
  ...emptyDraft(),
  begin: () => set({ scanId: crypto.randomUUID(), ...emptyDraft() }),
  // Drafts saved by earlier builds have no startedAt; they get one now, and it is saved with the next change.
  restore: (scanId, draft) => set({ scanId, ...draft, startedAt: draft.startedAt || new Date().toISOString() }),
  setStep: (step) => set({ step }),
  // Fills defaults for keys not yet touched, without overwriting what the astronaut has typed.
  ensureEntries: (defaults) => set((s) => ({ entries: { ...defaults, ...s.entries } })),
  setEntry: (metricKey, patch) =>
    set((s) => {
      const current = s.entries[metricKey];
      const base: ManualEntry = { value: '', observedAt: '', sourceType: 'manual_input' as SourceTypeInput };
      return { entries: { ...s.entries, [metricKey]: { ...base, ...current, ...patch } } };
    }),
  setWellbeing: (patch) => set((s) => ({ wellbeing: { ...s.wellbeing, ...patch } })),
  toggleSymptom: (symptom) =>
    set((s) => ({
      wellbeing: {
        ...s.wellbeing,
        symptoms: s.wellbeing.symptoms.includes(symptom)
          ? s.wellbeing.symptoms.filter((x) => x !== symptom)
          : [...s.wellbeing.symptoms, symptom],
      },
    })),
}));
