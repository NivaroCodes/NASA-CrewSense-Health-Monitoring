import type { Provenance } from './provenance';
import type { AlertStatus } from '../components/ui/SeverityChip';

// Indicator identifiers from Spec, Section 7 (six MVP indicators).
export type IndicatorId = 'heartRate' | 'bloodPressure' | 'bloodGlucose' | 'bodyTemperature' | 'sleepDuration' | 'mood';

export interface Reading {
  id: IndicatorId;
  name: string;
  // Null when no value exists: rendered as "No reading", never as 0.
  value: string | null;
  unit: string;
  // ISO 8601 timestamp of the measurement, or null if unknown.
  measuredAt: string | null;
  provenance: Provenance | undefined;
  // Backend-decided status (Spec, Section 8). The frontend never derives it.
  status: AlertStatus | undefined;
  // Backend-supplied change against previous reading, if available.
  change?: string;
  // Sensor reported a fault for this source.
  sensorError?: boolean;
}

export interface MonitoringSummary {
  activeSources: number;
  totalSources: number;
  needingAttention: number;
  missing: number;
}

export interface AlertItem {
  id: string;
  // Backend severity mapped to interface status (Spec, Section 8).
  status: AlertStatus;
  indicator: string | null;
  timestamp: string | null;
  reason: string | null;
  recommendedAction: string | null;
  dataSource: string | null;
}

export interface HealthOverview {
  monitoring: MonitoringSummary;
  readings: Reading[];
  alerts: AlertItem[];
  lastScanAt: string | null;
}
