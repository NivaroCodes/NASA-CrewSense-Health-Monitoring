import type { ValidationResult } from './validation';

// Checks a typed number against bounds taken from the backend metric catalogue (GET /metrics).
// These are plausibility limits from the contract, not clinical ranges.
export function validateInBounds(raw: string, min: number, max: number, unit: string): ValidationResult {
  const trimmed = raw.trim();
  const n = trimmed === '' ? Number.NaN : Number(trimmed);
  if (!Number.isFinite(n)) return { ok: false, message: `Enter a number from ${min} to ${max} ${unit}.` };
  if (n < min || n > max) return { ok: false, message: `Accepted range is ${min} to ${max} ${unit}.` };
  return { ok: true };
}
