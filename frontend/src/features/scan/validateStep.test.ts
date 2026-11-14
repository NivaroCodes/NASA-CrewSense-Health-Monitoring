import { describe, expect, it } from 'vitest';
import { useScanStore, type ManualKey, type ScanState } from '../../store/useScanStore';
import { canAdvance } from './validateStep';

// Builds a scan state from the store defaults with the given overrides, so the test uses the real shape.
function stateWith(overrides: Partial<Pick<ScanState, 'manual' | 'mood' | 'stress'>>): ScanState {
  return { ...useScanStore.getState(), ...overrides };
}

const ALL_MISSING: ManualKey[] = ['heartRate', 'systolic', 'diastolic', 'glucose', 'temperature', 'sleep'];

describe('canAdvance step 4 (manual entry)', () => {
  it('blocks Next when a missing heart rate is empty', () => {
    const result = canAdvance(4, stateWith({ manual: { heartRate: '' } }), ['heartRate']);
    expect(result.ok).toBe(false);
  });

  it('allows Next when every missing value is valid', () => {
    const state = stateWith({
      manual: { heartRate: '70', systolic: '118', diastolic: '78', glucose: '95', temperature: '36.8', sleep: '7.2' },
    });
    expect(canAdvance(4, state, ALL_MISSING).ok).toBe(true);
  });

  it('blocks a blood pressure pair that exceeds the plausibility range (250/160)', () => {
    const state = stateWith({ manual: { systolic: '250', diastolic: '160' } });
    expect(canAdvance(4, state, ['systolic', 'diastolic']).ok).toBe(false);
  });

  it('blocks a blood pressure pair where systolic is not above diastolic', () => {
    const state = stateWith({ manual: { systolic: '80', diastolic: '90' } });
    expect(canAdvance(4, state, ['systolic', 'diastolic']).ok).toBe(false);
  });

  it('allows Next when nothing is missing, so the step is skipped by design', () => {
    expect(canAdvance(4, stateWith({}), []).ok).toBe(true);
  });
});

describe('canAdvance step 5 (wellbeing)', () => {
  it('requires both mood and stress', () => {
    expect(canAdvance(5, stateWith({ mood: 4, stress: null }), []).ok).toBe(false);
    expect(canAdvance(5, stateWith({ mood: null, stress: 2 }), []).ok).toBe(false);
  });

  it('allows Next once both scores are chosen', () => {
    expect(canAdvance(5, stateWith({ mood: 4, stress: 2 }), []).ok).toBe(true);
  });
});

describe('canAdvance other steps', () => {
  it('does not gate steps without a rule', () => {
    expect(canAdvance(1, stateWith({}), []).ok).toBe(true);
    expect(canAdvance(3, stateWith({}), []).ok).toBe(true);
  });
});
