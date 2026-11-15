import { describe, expect, it } from 'vitest';
import { buildScanBody } from '../../features/scan/buildScanBody';
import type { MetricOut, ScanRequirement } from '../../types/api';
import type { ScanDraft } from '../../types/scanDraft';
import { EMPTY_WELLBEING } from '../../types/scanDraft';
import { toLocalInputValue } from '../../utils/datetime';
import { draftFromBody } from './draftFromBody';

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
  startedAt: '2026-11-13T07:30:00Z',
  entries: {
    diastolic_bp: { value: ' 76 ', observedAt: toLocalInputValue('2026-11-13T07:05:00Z'), sourceType: 'manual_input' },
  },
  wellbeing: { ...EMPTY_WELLBEING, moodScore: '3', stressScore: '6', sleepHours: '5.2', symptoms: ['fatigue'], notes: 'Short night.' },
};

const original = () =>
  buildScanBody({ astronautId: 1, asOf: draft.startedAt, clientScanId: 'original-id-0001', draft, requirements, metricsByKey });

describe('draftFromBody', () => {
  it('restores values, observation times, wellbeing and the creation time from a stored body', () => {
    const restored = draftFromBody(original(), '2030-01-01T00:00:00Z');

    expect(restored.startedAt).toBe('2026-11-13T07:30:00Z');
    expect(restored.entries.diastolic_bp.value).toBe('76');
    expect(restored.entries.diastolic_bp.observedAt).toBe(toLocalInputValue('2026-11-13T07:05:00Z'));
    expect(restored.entries.diastolic_bp.sourceType).toBe('manual_input');
    expect(restored.wellbeing).toMatchObject({ moodScore: '3', stressScore: '6', sleepHours: '5.2', symptoms: ['fatigue'], notes: 'Short night.' });
  });

  it('rebuilds the same scan body from the restored draft, apart from the new scan ID', () => {
    const restored = draftFromBody(original(), '2030-01-01T00:00:00Z');
    const rebuilt = buildScanBody({
      astronautId: 1,
      asOf: restored.startedAt,
      clientScanId: 'new-id-0002',
      draft: restored,
      requirements,
      metricsByKey,
    });
    expect({ ...rebuilt, client_scan_id: undefined }).toEqual({ ...original(), client_scan_id: undefined });
  });

  it('uses the fallback creation time when the stored body has no as_of', () => {
    const body = { ...original(), as_of: undefined };
    expect(draftFromBody(body, '2026-11-14T10:00:00Z').startedAt).toBe('2026-11-14T10:00:00Z');
  });

  it('leaves notes empty when the stored body has none', () => {
    const body = { ...original(), wellbeing: { ...original().wellbeing, notes: undefined } };
    expect(draftFromBody(body, '2026-11-14T10:00:00Z').wellbeing.notes).toBe('');
  });
});
