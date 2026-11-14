// Technical input validation only (Spec, Section 6, Step 4).
// These ranges are plausibility guards that reject typos and impossible values.
// They are NOT clinical or normal ranges and must not be presented as such.
// Clinical interpretation is REQUIRES SCIENTIFIC VALIDATION and belongs to the backend.

export type ValidationResult = { ok: true } | { ok: false; message: string };

const OK: ValidationResult = { ok: true };

function parseNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function validateInteger(raw: string, min: number, max: number, unit: string): ValidationResult {
  const n = parseNumber(raw);
  if (n === null) return { ok: false, message: `Enter a whole number from ${min} to ${max} ${unit}.` };
  if (!Number.isInteger(n)) return { ok: false, message: `Use a whole number, ${min} to ${max} ${unit}.` };
  if (n < min || n > max) return { ok: false, message: `Accepted range is ${min} to ${max} ${unit}.` };
  return OK;
}

export function validateDecimal(
  raw: string,
  min: number,
  max: number,
  unit: string,
  decimals: number,
): ValidationResult {
  const n = parseNumber(raw);
  if (n === null) return { ok: false, message: `Enter a number from ${min} to ${max} ${unit}.` };
  const places = (raw.trim().split('.')[1] ?? '').length;
  if (places > decimals) return { ok: false, message: `Use at most ${decimals} decimal place(s).` };
  if (n < min || n > max) return { ok: false, message: `Accepted range is ${min} to ${max} ${unit}.` };
  return OK;
}

export const HEART_RATE_RANGE = { min: 30, max: 220, unit: 'bpm' } as const;
export const BP_SYSTOLIC_RANGE = { min: 60, max: 220, unit: 'mmHg' } as const;
export const BP_DIASTOLIC_RANGE = { min: 40, max: 140, unit: 'mmHg' } as const;
export const TEMPERATURE_RANGE = { min: 30.0, max: 43.0, unit: '°C' } as const;
export const GLUCOSE_RANGE = { min: 40, max: 400, unit: 'mg/dL' } as const;
export const SLEEP_RANGE = { min: 0.0, max: 24.0, unit: 'hours' } as const;

export function validateHeartRate(raw: string): ValidationResult {
  return validateInteger(raw, HEART_RATE_RANGE.min, HEART_RATE_RANGE.max, HEART_RATE_RANGE.unit);
}

export function validateBloodPressure(systolicRaw: string, diastolicRaw: string): {
  systolic: ValidationResult;
  diastolic: ValidationResult;
  pair: ValidationResult;
} {
  const systolic = validateInteger(systolicRaw, BP_SYSTOLIC_RANGE.min, BP_SYSTOLIC_RANGE.max, BP_SYSTOLIC_RANGE.unit);
  const diastolic = validateInteger(diastolicRaw, BP_DIASTOLIC_RANGE.min, BP_DIASTOLIC_RANGE.max, BP_DIASTOLIC_RANGE.unit);
  let pair: ValidationResult = OK;
  const s = parseNumber(systolicRaw);
  const d = parseNumber(diastolicRaw);
  if (s !== null && d !== null && s <= d) {
    pair = { ok: false, message: 'Systolic must be higher than diastolic.' };
  }
  return { systolic, diastolic, pair };
}

export function validateTemperature(raw: string): ValidationResult {
  return validateDecimal(raw, TEMPERATURE_RANGE.min, TEMPERATURE_RANGE.max, TEMPERATURE_RANGE.unit, 1);
}

export function validateGlucose(raw: string): ValidationResult {
  return validateInteger(raw, GLUCOSE_RANGE.min, GLUCOSE_RANGE.max, GLUCOSE_RANGE.unit);
}

export function validateSleep(raw: string): ValidationResult {
  return validateDecimal(raw, SLEEP_RANGE.min, SLEEP_RANGE.max, SLEEP_RANGE.unit, 1);
}
