import { describe, expect, it } from 'vitest';
import type { TrendSeries } from '../../types/history';
import { toTrendRows, trendDomain } from './trendRows';

const base: TrendSeries = {
  id: 'heartRate',
  name: 'Heart rate',
  unit: 'bpm',
  provenance: 'SYNTHETIC',
  baseline: { low: 60, high: 84 },
  points: [
    { t: '2026-11-01T08:00:00.000Z', value: 70 },
    { t: '2026-11-02T08:00:00.000Z', value: null },
    { t: '2026-11-03T08:00:00.000Z', value: 90 },
  ],
};

describe('toTrendRows', () => {
  it('keeps a missing day as null so the line breaks instead of dropping to zero', () => {
    const rows = toTrendRows(base);
    expect(rows.map((r) => r.value)).toEqual([70, null, 90]);
  });

  it('computes the stacked band from the baseline on every row', () => {
    const rows = toTrendRows(base);
    expect(rows.every((r) => r.bandBase === 60 && r.bandSize === 24)).toBe(true);
  });

  it('uses zero band values when no baseline is supplied', () => {
    const rows = toTrendRows({ ...base, baseline: null });
    expect(rows.every((r) => r.bandBase === 0 && r.bandSize === 0)).toBe(true);
  });
});

describe('trendDomain', () => {
  it('covers readings and the baseline band, with padding', () => {
    const [low, high] = trendDomain(base) ?? [NaN, NaN];
    expect(low).toBeLessThanOrEqual(60);
    expect(high).toBeGreaterThanOrEqual(90);
  });

  it('returns null when no day has a reading, so nothing is plotted', () => {
    const empty: TrendSeries = {
      ...base,
      points: base.points.map((p) => ({ ...p, value: null })),
    };
    expect(trendDomain(empty)).toBeNull();
  });
});
