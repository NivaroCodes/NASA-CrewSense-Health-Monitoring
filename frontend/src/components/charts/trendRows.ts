import type { TrendSeries } from '../../types/history';

// One row per day for the chart. value stays null on days without a reading, so the line breaks there.
export interface TrendRow {
  t: string;
  label: string;
  value: number | null;
  // Stacked band: an invisible base at the low bound, then the band height up to the high bound.
  bandBase: number;
  bandSize: number;
}

export function toTrendRows(series: TrendSeries): TrendRow[] {
  const band = series.baseline;
  return series.points.map((point) => ({
    t: point.t,
    label: new Date(point.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    value: point.value,
    bandBase: band ? band.low : 0,
    bandSize: band ? band.high - band.low : 0,
  }));
}

// Y-axis domain covers every reading and the baseline band, with 10% padding. Null when there is nothing to plot.
export function trendDomain(series: TrendSeries): [number, number] | null {
  const values = series.points.flatMap((p) => (p.value === null ? [] : [p.value]));
  if (values.length === 0) return null;
  const all = series.baseline ? [...values, series.baseline.low, series.baseline.high] : values;
  const low = Math.min(...all);
  const high = Math.max(...all);
  const pad = (high - low) * 0.1 || 1;
  return [low - pad, high + pad];
}
