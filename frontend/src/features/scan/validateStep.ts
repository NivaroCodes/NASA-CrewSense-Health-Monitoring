import type { ManualKey, ScanState } from '../../store/useScanStore';
import {
  validateBloodPressure,
  validateGlucose,
  validateHeartRate,
  validateSleep,
  validateTemperature,
} from '../../utils/validation';

// Gating for the Next button. Each step reports whether the astronaut may advance (Spec, Section 6).
export function canAdvance(step: number, state: ScanState, missing: ManualKey[]): { ok: boolean; reason?: string } {
  if (step === 4) {
    const m = state.manual;
    const bad = missing.find((key) => {
      switch (key) {
        case 'heartRate':
          return !validateHeartRate(m.heartRate ?? '').ok;
        case 'systolic':
        case 'diastolic': {
          const r = validateBloodPressure(m.systolic ?? '', m.diastolic ?? '');
          return !(r.systolic.ok && r.diastolic.ok && r.pair.ok);
        }
        case 'glucose':
          return !validateGlucose(m.glucose ?? '').ok;
        case 'temperature':
          return !validateTemperature(m.temperature ?? '').ok;
        case 'sleep':
          return !validateSleep(m.sleep ?? '').ok;
      }
    });
    return bad ? { ok: false, reason: 'Correct the highlighted values to continue.' } : { ok: true };
  }
  if (step === 5) {
    return state.mood !== null && state.stress !== null
      ? { ok: true }
      : { ok: false, reason: 'Choose a mood and a stress score to continue.' };
  }
  return { ok: true };
}
