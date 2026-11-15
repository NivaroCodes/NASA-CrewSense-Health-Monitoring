// Retry rules for the offline queue. Pure functions, so they are tested without IndexedDB.

export const BASE_RETRY_MS = 2_000;
export const MAX_RETRY_MS = 60_000;

// Automatic attempts before a record is paused. A paused record is kept and waits for a manual retry.
export const MAX_AUTO_ATTEMPTS = 8;

// Delay before the next automatic attempt: 2 s, 4 s, 8 s, ... capped at 60 s.
export function backoffMs(attempts: number): number {
  return Math.min(BASE_RETRY_MS * 2 ** Math.max(0, attempts - 1), MAX_RETRY_MS);
}

// A 4xx answer means the server understood the request and refused it. Sending the same body again would fail again.
// 408 (request timeout) and 429 (too many requests) are temporary, so they are retried.
export function isPermanentStatus(status: number): boolean {
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

export function shouldPauseAutoRetry(attempts: number): boolean {
  return attempts >= MAX_AUTO_ATTEMPTS;
}
