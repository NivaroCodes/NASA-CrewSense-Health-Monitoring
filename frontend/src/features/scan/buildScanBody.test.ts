import { describe, expect, it } from 'vitest';
import type { MetricOut, ScanRequirement } from '../../types/api';
import type { ScanDraft } from '../../types/scanDraft';
import { EMPTY_WELLBEING } from '../../types/scanDraft';
import { toLocalInputValue } from '../../utils/datetime';
import { buildScanBody } from './buildScanBody';

const CLIENT_ID = '3f2c1a9e-6b1d-4f0e-9a33-2d7c5e8b1a10';

const metricsByKey = new Map<string, MetricOut>([
  [
    'diastolic_bp',
    {
      metric_key: 'diastolic_bp',
      display_name: 'Diastolic blood pressure',
      category: 'cardiovascular',
      canonical_unit: 'mmHg',
      description: '',
      plausible_min: 30,
      plausible_max: 180,
      freshness_hours: 72,
      allowed_source_types: ['manual_input', 'sensor_reading'],
    },
  ],
]);

const requirements: ScanRequirement[] = [
  { metric_key: 'diastolic_bp', display_name: 'Diastolic', unit: 'mmHg', reason: 'outdated', allowed_source_types: ['manual_input'] },
];

const draft: ScanDraft = {
  step: 4,
  entries: {
    diastolic_bp: { value: ' 76 ', observedAt: toLocalInputValue('2026-11-13T07:05:00Z'), sourceType: 'manual_input' },
  },
  wellbeing: { ...EMPTY_WELLBEING, moodScore: '3', stressScore: '6', sleepHours: '5.2', symptoms: ['fatigue'], notes: '  Short night.  ' },
};

describe('buildScanBody', () => {
  it('builds the contract body: astronaut, reference time, wellbeing and measurements in requirement order', () => {
    const body = buildScanBody({
      astronautId: 1,
      asOf: '2026-11-13T07:30:00Z',
      clientScanId: CLIENT_ID,
      draft,
      requirements,
      metricsByKey,
    });

    expect(body.astronaut_id).toBe(1);
    expect(body.as_of).toBe('2026-11-13T07:30:00Z');
    expect(body.wellbeing).toEqual({ mood_score: 3, stress_score: 6, sleep_hours: 5.2, symptoms: ['fatigue'], notes: 'Short night.' });
    expect(body.new_measurements).toEqual([
      {
        metric_key: 'diastolic_bp',
        value: 76,
        unit: 'mmHg',
        observed_at: '2026-11-13T07:05:00Z',
        source_type: 'manual_input',
        source_detail: 'Entered in CrewSense Daily Scan',
      },
    ]);
  });

  it('carries the client_scan_id unchanged so retries can be recognised', () => {
    const body = buildScanBody({
      astronautId: 1,
      asOf: '2026-11-13T07:30:00Z',
      clientScanId: CLIENT_ID,
      draft,
      requirements,
      metricsByKey,
    });
    expect(body.client_scan_id).toBe(CLIENT_ID);
  });

  it('omits notes when they are blank and does not invent a measurement when none is required', () => {
    const body = buildScanBody({
      astronautId: 1,
      asOf: '2026-11-13T07:30:00Z',
      clientScanId: CLIENT_ID,
      draft: { ...draft, wellbeing: { ...draft.wellbeing, notes: '   ' } },
      requirements: [],
      metricsByKey,
    });
    expect(body.wellbeing).not.toHaveProperty('notes');
    expect(body.new_measurements).toEqual([]);
  });

  it('refuses to build when a requested value is missing, rather than sending a placeholder', () => {
    expect(() =>
      buildScanBody({
        astronautId: 1,
        asOf: '2026-11-13T07:30:00Z',
        clientScanId: CLIENT_ID,
        draft: { ...draft, entries: {} },
        requirements,
        metricsByKey,
      }),
    ).toThrow(/Diastolic/);
  });
});
