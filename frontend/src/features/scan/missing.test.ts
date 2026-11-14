import { describe, expect, it } from 'vitest';
import type { Reading } from '../../types/telemetry';
import { computeMissing } from './missing';

const reading = (id: Reading['id'], value: string | null): Reading => ({
  id,
  name: id,
  value,
  unit: '',
  measuredAt: null,
  provenance: value === null ? undefined : 'SYNTHETIC',
  status: undefined,
});

describe('computeMissing', () => {
  it('asks for nothing when every source returned a value', () => {
    const readings: Reading[] = [
      reading('heartRate', '72'),
      reading('bloodPressure', '118/78'),
      reading('bloodGlucose', '95'),
      reading('bodyTemperature', '36.8'),
      reading('sleepDuration', '7.2'),
      reading('mood', '4'),
    ];
    expect(computeMissing(readings)).toEqual([]);
  });

  it('treats a null value as missing, never as zero', () => {
    expect(computeMissing([reading('heartRate', null)])).toContain('heartRate');
  });

  it('maps a missing blood pressure reading to both systolic and diastolic', () => {
    const missing = computeMissing([reading('bloodPressure', null)]);
    expect(missing).toEqual(expect.arrayContaining(['systolic', 'diastolic']));
  });

  it('asks for a source that did not answer at all', () => {
    expect(computeMissing([])).toEqual(expect.arrayContaining(['heartRate', 'glucose', 'temperature', 'sleep']));
  });
});

describe('demo overview', () => {
  it('has one deliberate gap, so the manual-entry step runs in the demonstration', async () => {
    const { DEMO_OVERVIEW } = await import('../../services/api/fixtures');
    expect(computeMissing(DEMO_OVERVIEW.readings)).toEqual(['systolic', 'diastolic']);
    expect(DEMO_OVERVIEW.monitoring.missing).toBe(1);
  });
});
