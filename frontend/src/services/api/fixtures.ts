import type { HealthOverview, IndicatorId } from '../../types/telemetry';
import type { TrendSeries } from '../../types/history';

// SYNTHETIC DEMONSTRATION DATA. Every value here is invented for the demo and is
// labelled SYNTHETIC wherever it renders. It must be replaced by live API data in T-021.
// Values follow the dashboard example in the specification (Section 5, Component D).

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export const DEMO_OVERVIEW: HealthOverview = {
  monitoring: {
    activeSources: 5,
    totalSources: 6,
    needingAttention: 1,
    missing: 1,
  },
  readings: [
    { id: 'heartRate', name: 'Heart rate', value: '72', unit: 'bpm', measuredAt: minutesAgo(2), provenance: 'SYNTHETIC', status: 'Normal', change: '+1 vs last scan' },
    // Deliberate gap: the demo cuff reading is missing, so the Daily Scan asks for it manually (Spec, Section 6, step 4).
    { id: 'bloodPressure', name: 'Blood pressure', value: null, unit: 'mmHg', measuredAt: null, provenance: undefined, status: undefined },
    { id: 'bloodGlucose', name: 'Blood glucose', value: '95', unit: 'mg/dL', measuredAt: minutesAgo(540), provenance: 'SYNTHETIC', status: 'Normal' },
    { id: 'bodyTemperature', name: 'Body temperature', value: '36.8', unit: '°C', measuredAt: minutesAgo(45), provenance: 'SYNTHETIC', status: 'Normal' },
    { id: 'sleepDuration', name: 'Sleep duration', value: '7.2', unit: 'hrs', measuredAt: minutesAgo(420), provenance: 'SYNTHETIC', status: 'Normal' },
    { id: 'mood', name: 'Mood', value: '4', unit: '/ 5', measuredAt: minutesAgo(900), provenance: 'SYNTHETIC', status: 'Normal' },
  ],
  alerts: [
    {
      id: 'demo-alert-1',
      status: 'Attention',
      indicator: 'Ambient CO2',
      timestamp: minutesAgo(30),
      reason: 'Elevated ambient CO2 retention in habitat zone (synthetic)',
      recommendedAction: 'Increase ventilation in the sleep quarters.',
      dataSource: 'SYNTHETIC',
    },
  ],
  lastScanAt: minutesAgo(7 * 60),
};

// 30-day trend windows, oldest first. Gaps are explicit indices where value is null (no reading that day).
// Values are deterministic so the demo looks the same on every load. All labelled SYNTHETIC.
const DAY_MS = 86_400_000;
const WINDOW_DAYS = 30;

const roundTo = (x: number, decimals: number) => Number(x.toFixed(decimals));

function demoSeries(
  id: TrendSeries['id'],
  name: string,
  unit: string,
  base: number,
  amplitude: number,
  decimals: number,
  gapIndices: number[],
  baseline: TrendSeries['baseline'],
): TrendSeries {
  const points = Array.from({ length: WINDOW_DAYS }, (_, i) => {
    const t = new Date(Date.now() - (WINDOW_DAYS - 1 - i) * DAY_MS).toISOString();
    const value = gapIndices.includes(i) ? null : roundTo(base + amplitude * Math.sin(i * 0.7), decimals);
    return { t, value };
  });
  return { id, name, unit, provenance: 'SYNTHETIC', points, baseline };
}

// Blood pressure has no trend in the demonstration set: the endpoint reports it as unavailable.
export const DEMO_TRENDS: Partial<Record<IndicatorId, TrendSeries>> = {
  heartRate: demoSeries('heartRate', 'Heart rate', 'bpm', 72, 5, 0, [4, 5, 6, 17], { low: 60, high: 84 }),
  bloodGlucose: demoSeries('bloodGlucose', 'Blood glucose', 'mg/dL', 96, 6, 0, [9, 10], { low: 80, high: 110 }),
  bodyTemperature: demoSeries('bodyTemperature', 'Body temperature', '°C', 36.8, 0.3, 1, [12], { low: 36.1, high: 37.2 }),
  sleepDuration: demoSeries('sleepDuration', 'Sleep duration', 'hrs', 7.2, 0.8, 1, [3, 4, 20, 21, 22], { low: 6.5, high: 8 }),
  mood: demoSeries('mood', 'Mood', '/ 5', 4, 1, 0, [0, 1, 25], { low: 3, high: 5 }),
};
