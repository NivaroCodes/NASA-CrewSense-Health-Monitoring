// Conversions between the browser's local time, used by <input type="datetime-local">, and the UTC ISO strings the API uses.

const pad = (n: number) => String(n).padStart(2, '0');

// ISO (UTC) to the local text a datetime-local input expects, for example 2026-11-13T13:30.
export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Local input text to a UTC ISO string with a Z suffix and no milliseconds. Null when the text is not a valid date.
export function fromLocalInputValue(local: string): string | null {
  const ms = Date.parse(local);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'unknown';
  return new Date(iso).toLocaleString();
}
