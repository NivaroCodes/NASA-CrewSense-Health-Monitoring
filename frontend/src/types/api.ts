// Types mirror the backend Pydantic schemas (backend/app/schemas, contract docs/API_CONTRACT.md).
// Field names are the contract. Do not rename them in the UI layer.

export type Category = 'cardiovascular' | 'bone_muscle' | 'immune' | 'behavioral' | 'nutrition' | 'environmental';

export type SourceTypeInput = 'sensor_reading' | 'manual_input' | 'imported_examination';
export type SourceType = SourceTypeInput | 'self_reported';

export type Freshness = 'current' | 'outdated' | 'missing';
export type IndicatorStatus = 'rule_fired' | 'no_rule_fired' | 'not_evaluated' | 'missing' | 'outdated';
export type AreaStatus = 'attention' | 'info' | 'no_alerts' | 'not_evaluated';
export type Severity = 'info' | 'attention';

export type Symptom =
  | 'headache'
  | 'dizziness'
  | 'nausea'
  | 'fatigue'
  | 'muscle_soreness'
  | 'joint_pain'
  | 'sleep_disturbance'
  | 'other';

export interface ErrorDetail {
  field: string;
  message: string;
}

export interface ErrorBody {
  code: string;
  message: string;
  details: ErrorDetail[];
}

export interface ErrorResponse {
  error: ErrorBody;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface HealthOut {
  status: 'ok' | 'degraded';
  version: string;
  database: 'ok' | 'unavailable';
  server_time: string;
}

export interface MetricOut {
  metric_key: string;
  display_name: string;
  category: string;
  canonical_unit: string;
  description: string;
  plausible_min: number;
  plausible_max: number;
  freshness_hours: number;
  allowed_source_types: string[];
}

export interface LatestMeasurement {
  measurement_id: number;
  value: number;
  unit: string;
  observed_at: string;
  source_type: SourceTypeInput;
  source_detail: string | null;
  validation_status: string;
  is_synthetic: boolean;
}

export interface BaselineSnapshot {
  baseline_id: number | null;
  method: string;
  reference_value: number;
  unit: string;
  observation_count: number;
  window_start: string;
  window_end: string;
}

export interface DashboardIndicator {
  metric_key: string;
  display_name: string;
  category: string;
  problem_area: string;
  latest: LatestMeasurement | null;
  freshness: Freshness;
  age_hours: number | null;
  freshness_window_hours: number;
  compared_value: number | null;
  baseline: BaselineSnapshot | null;
  change_pct: number | null;
  status: IndicatorStatus;
  rule_ids: string[];
  note: string | null;
}

export interface ProblemArea {
  area: string;
  label: string;
  status: AreaStatus;
  alert_count: number;
  indicator_keys: string[];
}

export interface LiveAlert {
  rule_id: string;
  category: string;
  severity: Severity;
  title: string;
  metric_key: string;
}

export interface ScanRequirement {
  metric_key: string;
  display_name: string;
  unit: string;
  reason: 'missing' | 'outdated';
  allowed_source_types: SourceTypeInput[];
}

export interface DataNotice {
  id: string;
  metric_key: string | null;
  message: string;
}

export interface WellbeingStatus {
  source_type: 'self_reported';
  as_of: string | null;
  required_today: boolean;
  mood_score: number | null;
  stress_score: number | null;
  sleep_hours: number | null;
  symptoms: Symptom[];
}

export interface Dashboard {
  generated_at: string;
  as_of: string;
  astronaut: {
    id: number;
    display_id: string;
    display_name: string;
    mission_name: string;
    is_synthetic: boolean;
  };
  mission: {
    mission_day: number;
    mission_start_date: string;
  };
  last_scan: {
    id: number;
    as_of: string;
    mission_day: number;
    submitted_at: string;
  } | null;
  wellbeing: WellbeingStatus;
  problem_areas: ProblemArea[];
  indicators: DashboardIndicator[];
  alerts: LiveAlert[];
  scan_requirements: ScanRequirement[];
  data_notices: DataNotice[];
  disclaimer: string;
}

export interface MeasurementCreate {
  astronaut_id?: number;
  metric_key: string;
  value: number;
  unit: string;
  observed_at: string;
  source_type: SourceTypeInput;
  source_detail?: string;
}

export interface MeasurementOut {
  id: number;
  astronaut_id: number;
  metric_key: string;
  display_name: string;
  category: string;
  value: number;
  unit: string;
  observed_at: string;
  recorded_at: string;
  source_type: SourceTypeInput;
  source_detail: string | null;
  validation_status: string;
  validation_notes: string | null;
  is_synthetic: boolean;
}

// One entry of a scan submission. Same rules as POST /measurements, minus astronaut_id.
export type MeasurementInput = Omit<MeasurementCreate, 'astronaut_id'>;

export interface WellbeingInput {
  mood_score: number;
  stress_score: number;
  sleep_hours: number;
  symptoms: Symptom[];
  notes?: string;
}

export interface ScanCreate {
  astronaut_id?: number;
  as_of?: string;
  wellbeing: WellbeingInput;
  new_measurements: MeasurementInput[];
  // Client-generated idempotency key. The same ID with the same body returns the stored scan (200);
  // the same ID with a different body is rejected with 409 idempotency_conflict.
  client_scan_id?: string;
}

export interface EvidenceValues {
  latest: number;
  reference: number | null;
  change: number;
  change_unit: 'percent' | 'absolute';
  threshold: number;
}

export interface ScanAlert {
  id: number | null;
  scan_id: number | null;
  category: string;
  severity: Severity;
  rule_id: string;
  title: string;
  explanation: string;
  evidence: {
    measurement_ids: number[];
    baseline_id: number | null;
    values: EvidenceValues;
  };
  created_at: string | null;
}

export interface ScanOut {
  id: number;
  astronaut_id: number;
  client_scan_id?: string | null;
  submitted_at: string;
  as_of: string;
  mission_day: number;
  processing_status: 'completed';
  wellbeing: {
    source_type: 'self_reported';
    mood_score: number;
    stress_score: number;
    sleep_hours: number;
    symptoms: Symptom[];
    notes: string | null;
  };
  measurements_used: {
    measurement_id: number;
    metric_key: string;
    value: number;
    unit: string;
    observed_at: string;
    source_type: SourceTypeInput;
    is_synthetic: boolean;
  }[];
  baselines: {
    baseline_id: number | null;
    metric_key: string;
    method: string;
    reference_value: number | null;
    unit: string;
    observation_count: number;
    window_start: string;
    window_end: string;
  }[];
  alerts: ScanAlert[];
  data_notices: DataNotice[];
  summary: {
    overall_status: AreaStatus;
    counts: { alerts_attention: number; alerts_info: number; data_notices: number };
    problem_areas: { area: string; status: AreaStatus; alert_count: number }[];
  };
  next_steps: { priority: number; text: string; related_rule_ids: string[]; related_notice_ids: string[] }[];
  disclaimer: string;
}

export interface ScanListItem {
  id: number;
  as_of: string;
  mission_day: number;
  submitted_at: string;
  processing_status: string;
  overall_status: AreaStatus;
  alert_count: number;
}
