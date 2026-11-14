import type { HealthOverview } from '../../types/telemetry';

// SYNTHETIC DEMONSTRATION DATA. Every value here is invented for the demo and is
// labelled SYNTHETIC wherever it renders. It must be replaced by live API data in T-021.
// Values follow the dashboard example in the specification (Section 5, Component D).

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export const DEMO_OVERVIEW: HealthOverview = {
  monitoring: {
    activeSources: 5,
    totalSources: 6,
    needingAttention: 1,
    missing: 0,
  },
  readings: [
    { id: 'heartRate', name: 'Heart rate', value: '72', unit: 'bpm', measuredAt: minutesAgo(2), provenance: 'SYNTHETIC', status: 'Normal', change: '+1 vs last scan' },
    { id: 'bloodPressure', name: 'Blood pressure', value: '118/78', unit: 'mmHg', measuredAt: minutesAgo(180), provenance: 'SYNTHETIC', status: 'Normal' },
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
