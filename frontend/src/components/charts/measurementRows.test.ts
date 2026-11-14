import { describe, expect, it } from 'vitest';
import { gapThresholdMs, toChartRows } from './measurementRows';

const HOUR = 3_600_000;

describe('toChartRows', () => {
  it('sorts values by observation time and does not interpolate between them', () => {
    const rows = toChartRows(
      [
        { observedAt: '2026-11-02T08:00:00Z', value: 80 },
        { observedAt: '2026-11-01T08:00:00Z', value: 70 },
      ],
      gapThresholdMs(72),
    );
    expect(rows.map((r) => r.value)).toEqual([70, 80]);
  });

  it('inserts a break where the spacing exceeds the gap threshold', () => {
    const rows = toChartRows(
      [
        { observedAt: '2026-11-01T08:00:00Z', value: 70 },
        { observedAt: '2026-11-10T08:00:00Z', value: 75 },
      ],
      gapThresholdMs(72),
    );
    expect(rows).toHaveLength(3);
    expect(rows[1].value).toBeNull();
  });

  it('does not break a line when values are within the threshold', () => {
    const rows = toChartRows(
      [
        { observedAt: '2026-11-01T08:00:00Z', value: 70 },
        { observedAt: '2026-11-02T08:00:00Z', value: 71 },
      ],
      gapThresholdMs(72),
    );
    expect(rows.every((r) => r.value !== null)).toBe(true);
  });

  it('returns no rows for no data', () => {
    expect(toChartRows([], gapThresholdMs(72))).toEqual([]);
  });
});

describe('gapThresholdMs', () => {
  it('is twice the freshness window', () => {
    expect(gapThresholdMs(24)).toBe(48 * HOUR);
  });
});
