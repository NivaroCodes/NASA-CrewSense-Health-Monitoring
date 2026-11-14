import { create } from 'zustand';

// Scan session state (Spec, Section 6). Lives across the nine steps so the container never remounts
// with lost data. Draft persistence to IndexedDB arrives with T-019.
export type ScanStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type ManualKey = 'heartRate' | 'systolic' | 'diastolic' | 'temperature' | 'glucose' | 'sleep';

export interface ScanState {
  scanId: string | null;
  step: ScanStep;
  // Entered as text so a half-typed value is kept, not coerced.
  manual: Partial<Record<ManualKey, string>>;
  mood: number | null;
  stress: number | null;
  symptoms: string[];
  begin: () => void;
  setStep: (step: ScanStep) => void;
  setManual: (key: ManualKey, value: string) => void;
  setMood: (value: number) => void;
  setStress: (value: number) => void;
  toggleSymptom: (symptom: string) => void;
  reset: () => void;
}

const initial = {
  scanId: null,
  step: 1 as ScanStep,
  manual: {},
  mood: null,
  stress: null,
  symptoms: [] as string[],
};

export const useScanStore = create<ScanState>((set) => ({
  ...initial,
  begin: () => set({ ...initial, scanId: crypto.randomUUID(), step: 1 }),
  setStep: (step) => set({ step }),
  setManual: (key, value) => set((s) => ({ manual: { ...s.manual, [key]: value } })),
  setMood: (value) => set({ mood: value }),
  setStress: (value) => set({ stress: value }),
  toggleSymptom: (symptom) =>
    set((s) => ({
      symptoms: s.symptoms.includes(symptom) ? s.symptoms.filter((x) => x !== symptom) : [...s.symptoms, symptom],
    })),
  reset: () => set({ ...initial }),
}));
