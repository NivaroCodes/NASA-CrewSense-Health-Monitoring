// Provenance is a required field on every measurement (Spec, Section 12, rule 2).
// Value set is provisional until agreed with the Backend Owner (Pit Stop 1).
export type Provenance = 'SENSOR' | 'MANUAL' | 'LAB' | 'SELF-REPORT' | 'SYNTHETIC';

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  SENSOR: 'Sensor',
  MANUAL: 'Manual',
  LAB: 'Lab',
  'SELF-REPORT': 'Self-report',
  SYNTHETIC: 'Synthetic demo',
};
