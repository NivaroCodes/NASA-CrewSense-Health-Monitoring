import { describe, expect, it } from 'vitest';
import { formatMet, formatRelative } from './time';

describe('formatMet', () => {
  const start = '2026-11-01T00:00:00Z';

  it('returns null when no mission start is known', () => {
    expect(formatMet(null, Date.now())).toBeNull();
  });

  it('counts day and clock from the start', () => {
    const now = Date.parse(start) + (1 * 86400 + 8 * 3600 + 34 * 60 + 12) * 1000;
    expect(formatMet(start, now)).toBe('MET Day 2 08:34:12');
  });

  it('never goes negative before start', () => {
    expect(formatMet(start, Date.parse(start) - 5000)).toBe('MET Day 1 00:00:00');
  });
});

describe('formatRelative', () => {
  it('reports minutes and hours', () => {
    const t = Date.parse('2026-11-14T10:00:00Z');
    expect(formatRelative('2026-11-14T10:05:00Z', t + 0)).toBe('0s ago');
    expect(formatRelative('2026-11-14T09:00:00Z', t)).toBe('1h ago');
  });
});
