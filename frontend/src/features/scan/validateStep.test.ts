import { describe, expect, it } from 'vitest';
import type { MetricOut, ScanRequirement } from '../../types/api';
import type { ScanDraft } from '../../types/scanDraft';
import { EMPTY_WELLBEING } from '../../types/scanDraft';
import { toLocalInputValue } from '../../utils/datetime';
import { mapServerErrors, measurementErrors, stepErrors, wellbeingErrors } from './validateStep';

const NOW = Date.parse('2026-11-13T07:30:00Z');

const metric = (key: string, min: number, max: number, unit: string): MetricOut => ({
  metric_key: key,
  display_name: key,
  category: 'cardiovascular',
  canonical_unit: unit,
  description: '',
  plausible_min: min,
  plausible_max: max,
  freshness_hours: 72,
  allowed_source_types: ['manual_input', 'sensor_reading'],
});

const metricsByKey = new Map<string, MetricOut>([
  ['systolic_bp', metric('systolic_bp', 60, 220, 'mmHg')],
  ['diastolic_bp', metric('diastolic_bp', 30, 180, 'mmHg')],
]);

const requirements: ScanRequirement[] = [
  { metric_key: 'systolic_bp', display_name: 'Systolic', unit: 'mmHg', reason: 'missing', allowed_source_types: ['manual_input', 'sensor_reading'] },
  { metric_key: 'diastolic_bp', display_name: 'Diastolic', unit: 'mmHg', reason: 'outdated', allowed_source_types: ['manual_input'] },
];

const local = (iso: string) => toLocalInputValue(iso);

function draftWith(entries: ScanDraft['entries'], wellbeing = { ...EMPTY_WELLBEING, moodScore: '4', stressScore: '3', sleepHours: '7' }): ScanDraft {
  return { step: 2, entries, wellbeing, startedAt: '2026-11-13T07:30:00Z' };
}

describe('measurementErrors', () => {
  it('flags an empty value, a value outside the catalogue bounds, and a source the requirement does not allow', () => {
    const errors = measurementErrors({
      requirements,
      metricsByKey,
      nowMs: NOW,
      draft: draftWith({
        systolic_bp: { value: '', observedAt: local('2026-11-13T07:00:00Z'), sourceType: 'manual_input' },
        diastolic_bp: { value: '320', observedAt: local('2026-11-13T07:00:00Z'), sourceType: 'sensor_reading' },
      }),
    });
    expect(errors.systolic_bp).toBeTruthy();
    expect(errors.diastolic_bp).toMatch(/30 to 180/);
    expect(errors['diastolic_bp:sourceType']).toBeTruthy();
  });

  it('accepts a valid value observed before the reference time', () => {
    const errors = measurementErrors({
      requirements: [requirements[0]],
      metricsByKey,
      nowMs: NOW,
      draft: draftWith({ systolic_bp: { value: '118', observedAt: local('2026-11-13T07:00:00Z'), sourceType: 'manual_input' } }),
    });
    expect(errors).toEqual({});
  });

  it('rejects an observation more than five minutes in the future, as the contract does', () => {
    const errors = measurementErrors({
      requirements: [requirements[0]],
      metricsByKey,
      nowMs: NOW,
      draft: draftWith({ systolic_bp: { value: '118', observedAt: local('2026-11-13T07:40:00Z'), sourceType: 'manual_input' } }),
    });
    expect(errors['systolic_bp:observedAt']).toMatch(/future/);
  });

  it('reports a missing metric definition instead of guessing its bounds', () => {
    const errors = measurementErrors({
      requirements: [requirements[0]],
      metricsByKey: new Map(),
      nowMs: NOW,
      draft: draftWith({}),
    });
    expect(errors.systolic_bp).toMatch(/unavailable/);
  });
});

describe('wellbeingErrors', () => {
  it('accepts values inside the contract ranges', () => {
    expect(wellbeingErrors({ ...EMPTY_WELLBEING, moodScore: '3', stressScore: '6', sleepHours: '5.2' })).toEqual({});
  });

  it('rejects mood above 5, empty stress, sleep above 24 and notes above 500 characters', () => {
    const errors = wellbeingErrors({ ...EMPTY_WELLBEING, moodScore: '6', stressScore: '', sleepHours: '25', notes: 'x'.repeat(501) });
    expect(errors.moodScore).toBeTruthy();
    expect(errors.stressScore).toBeTruthy();
    expect(errors.sleepHours).toBeTruthy();
    expect(errors.notes).toBeTruthy();
  });
});

describe('stepErrors', () => {
  it('has no input errors on the overview and review steps', () => {
    const inputs = { requirements, metricsByKey, draft: draftWith({}) };
    expect(stepErrors(1, inputs)).toEqual({});
    expect(stepErrors(4, inputs)).toEqual({});
  });
});

describe('mapServerErrors', () => {
  it('maps a measurement error back to the requirement at that index', () => {
    const mapped = mapServerErrors([{ field: 'new_measurements[1].value', message: 'Accepted range is 30 to 180 mmHg.' }], requirements);
    expect(mapped.fields.diastolic_bp).toMatch(/30 to 180/);
    expect(mapped.general).toEqual([]);
  });

  it('maps wellbeing fields by name and keeps unknown fields as general messages', () => {
    const mapped = mapServerErrors(
      [
        { field: 'wellbeing.mood_score', message: 'Input should be less than or equal to 5' },
        { field: 'something.else', message: 'Unexpected.' },
      ],
      requirements,
    );
    expect(mapped.fields.moodScore).toMatch(/less than or equal/);
    expect(mapped.general).toEqual(['something.else: Unexpected.']);
  });
});
