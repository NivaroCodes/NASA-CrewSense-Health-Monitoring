// Number and age formatting. Values are shown as the backend sent them, rounded only for display.

export function formatValue(n: number): string {
  return String(Math.round(n * 100) / 100);
}

export function formatAgeHours(hours: number): string {
  if (hours < 48) return `${Math.round(hours * 10) / 10} h`;
  return `${Math.round(hours / 24)} d`;
}

export function formatSignedPercent(pct: number): string {
  return `${pct > 0 ? '+' : ''}${Math.round(pct * 10) / 10}%`;
}

export function pad3(n: number): string {
  return String(n).padStart(3, '0');
}
