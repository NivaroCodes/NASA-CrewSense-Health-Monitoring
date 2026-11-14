// Turns stored measurements into chart rows. Nothing is interpolated: a stretch with no stored value
// longer than the gap threshold becomes a break in the line.
export interface ChartPoint {
  observedAt: string;
  value: number;
}

export interface ChartRow {
  x: number;
  value: number | null;
}

const HOUR_MS = 3_600_000;

// Gap threshold: twice the metric's freshness window, from the backend catalogue.
export function gapThresholdMs(freshnessHours: number): number {
  return 2 * freshnessHours * HOUR_MS;
}

export function toChartRows(points: ChartPoint[], gapMs: number): ChartRow[] {
  const sorted = points
    .map((p) => ({ t: Date.parse(p.observedAt), value: p.value }))
    .filter((p) => Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t);

  const rows: ChartRow[] = [];
  let prev: number | null = null;
  for (const p of sorted) {
    if (prev !== null && p.t - prev > gapMs) {
      rows.push({ x: prev + (p.t - prev) / 2, value: null });
    }
    rows.push({ x: p.t, value: p.value });
    prev = p.t;
  }
  return rows;
}
