import { describe, expect, it } from 'vitest';
import { fromLocalInputValue, toLocalInputValue } from './datetime';

describe('datetime conversions', () => {
  it('round-trips a whole-minute UTC timestamp through local input text', () => {
    const iso = '2026-11-13T07:30:00Z';
    expect(fromLocalInputValue(toLocalInputValue(iso))).toBe(iso);
  });

  it('returns null for empty or invalid input', () => {
    expect(fromLocalInputValue('')).toBeNull();
    expect(fromLocalInputValue('not a date')).toBeNull();
  });
});
