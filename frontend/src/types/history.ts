import type { IndicatorId } from './telemetry';
import type { Provenance } from './provenance';

// One day in a trend window. value null means no reading that day: drawn as a break, never as zero.
export interface TrendPoint {
  t: string;
  value: number | null;
}

// Baseline band supplied with the series (from the backend). It is a reference range, not a clinical threshold.
export interface BaselineBand {
  low: number;
  high: number;
}

export interface TrendSeries {
  id: IndicatorId;
  name: string;
  unit: string;
  provenance: Provenance;
  points: TrendPoint[];
  baseline: BaselineBand | null;
}
