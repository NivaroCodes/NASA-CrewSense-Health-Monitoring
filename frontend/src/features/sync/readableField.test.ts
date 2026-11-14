import { describe, expect, it } from 'vitest';
import type { ScanCreate } from '../../types/api';
import { readableField } from './readableField';

const body: ScanCreate = {
  astronaut_id: 1,
  as_of: '2026-11-13T07:30:00Z',
  wellbeing: { mood_score: 3, stress_score: 6, sleep_hours: 5.2, symptoms: [] },
  new_measurements: [
    { metric_key: 'systolic_bp', value: 118, unit: 'mmHg', observed_at: '2026-11-13T07:20:00Z', source_type: 'manual_input' },
  ],
};

describe('readableField', () => {
  it('names the metric when the body is known', () => {
    expect(readableField('new_measurements[0].value', body)).toBe('systolic_bp, value');
    expect(readableField('new_measurements[0].observed_at', body)).toBe('systolic_bp, observation time');
  });

  it('falls back to the measurement position when the body is not known', () => {
    expect(readableField('new_measurements[1].value')).toBe('measurement 2, value');
  });

  it('describes wellbeing and scan fields in words', () => {
    expect(readableField('wellbeing.mood_score')).toBe('wellbeing, mood');
    expect(readableField('client_scan_id')).toBe('scan ID');
    expect(readableField('as_of')).toBe('scan time');
  });

  it('never returns the raw path for a known field, and makes unknown fields readable', () => {
    expect(readableField('some_unknown_field')).toBe('some unknown field');
  });
});
