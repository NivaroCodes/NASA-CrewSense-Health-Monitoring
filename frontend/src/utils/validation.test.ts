import { describe, expect, it } from 'vitest';
import {
  validateBloodPressure,
  validateGlucose,
  validateHeartRate,
  validateSleep,
  validateTemperature,
} from './validation';

describe('heart rate guard (30 to 220 bpm)', () => {
  it('accepts both boundaries', () => {
    expect(validateHeartRate('30').ok).toBe(true);
    expect(validateHeartRate('220').ok).toBe(true);
  });
  it('rejects just outside the boundaries and names the range', () => {
    const low = validateHeartRate('29');
    const high = validateHeartRate('221');
    expect(low.ok).toBe(false);
    expect(high.ok).toBe(false);
    if (!low.ok) expect(low.message).toContain('30 to 220');
  });
  it('rejects non-numeric and fractional input', () => {
    expect(validateHeartRate('').ok).toBe(false);
    expect(validateHeartRate('72.5').ok).toBe(false);
    expect(validateHeartRate('abc').ok).toBe(false);
  });
});

describe('blood pressure guards', () => {
  it('accepts a plausible pair', () => {
    const r = validateBloodPressure('118', '78');
    expect(r.systolic.ok && r.diastolic.ok && r.pair.ok).toBe(true);
  });
  it('blocks the demo example 250 over 160', () => {
    const r = validateBloodPressure('250', '160');
    expect(r.systolic.ok).toBe(false);
    expect(r.diastolic.ok).toBe(false);
  });
  it('rejects systolic not above diastolic', () => {
    const r = validateBloodPressure('80', '90');
    expect(r.pair.ok).toBe(false);
  });
});

describe('temperature, glucose and sleep', () => {
  it('temperature allows one decimal in 30.0 to 43.0', () => {
    expect(validateTemperature('36.8').ok).toBe(true);
    expect(validateTemperature('43.1').ok).toBe(false);
    expect(validateTemperature('36.85').ok).toBe(false);
  });
  it('glucose is an integer in 40 to 400', () => {
    expect(validateGlucose('95').ok).toBe(true);
    expect(validateGlucose('39').ok).toBe(false);
  });
  it('sleep allows 0.0 to 24.0 with one decimal', () => {
    expect(validateSleep('7.2').ok).toBe(true);
    expect(validateSleep('24.1').ok).toBe(false);
  });
});
