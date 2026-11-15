import { describe, expect, it } from 'vitest';
import { MAX_AUTO_ATTEMPTS, backoffMs, isPermanentStatus, shouldPauseAutoRetry } from './retryPolicy';

describe('backoffMs', () => {
  it('doubles from 2 s and stops at 60 s', () => {
    expect([1, 2, 3, 4, 5].map(backoffMs)).toEqual([2_000, 4_000, 8_000, 16_000, 32_000]);
    expect(backoffMs(6)).toBe(60_000);
    expect(backoffMs(20)).toBe(60_000);
  });

  it('treats a first failure as the base delay', () => {
    expect(backoffMs(0)).toBe(2_000);
  });
});

describe('isPermanentStatus', () => {
  it('treats validation, conflict and other client errors as permanent', () => {
    expect(isPermanentStatus(400)).toBe(true);
    expect(isPermanentStatus(404)).toBe(true);
    expect(isPermanentStatus(409)).toBe(true);
    expect(isPermanentStatus(422)).toBe(true);
  });

  it('treats network failures, timeouts, server errors, 408 and 429 as temporary', () => {
    expect(isPermanentStatus(0)).toBe(false);
    expect(isPermanentStatus(408)).toBe(false);
    expect(isPermanentStatus(429)).toBe(false);
    expect(isPermanentStatus(500)).toBe(false);
    expect(isPermanentStatus(503)).toBe(false);
  });
});

describe('shouldPauseAutoRetry', () => {
  it('pauses automatic retries once the limit is reached, not before', () => {
    expect(shouldPauseAutoRetry(MAX_AUTO_ATTEMPTS - 1)).toBe(false);
    expect(shouldPauseAutoRetry(MAX_AUTO_ATTEMPTS)).toBe(true);
  });
});
