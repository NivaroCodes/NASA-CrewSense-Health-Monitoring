// Display labels for backend enumerations. Values are the contract's; only the wording is local.

export const CATEGORY_LABEL: Record<string, string> = {
  cardiovascular: 'Cardiovascular',
  bone_muscle: 'Bone and muscle',
  immune: 'Immune (examination)',
  behavioral: 'Behavioral health',
  nutrition: 'Nutrition',
  environmental: 'Environmental',
};

export const SYMPTOM_OPTIONS: { value: string; label: string }[] = [
  { value: 'headache', label: 'Headache' },
  { value: 'dizziness', label: 'Dizziness' },
  { value: 'nausea', label: 'Nausea' },
  { value: 'fatigue', label: 'Fatigue' },
  { value: 'muscle_soreness', label: 'Muscle soreness' },
  { value: 'joint_pain', label: 'Joint pain' },
  { value: 'sleep_disturbance', label: 'Sleep disturbance' },
  { value: 'other', label: 'Other' },
];

export const SYMPTOM_LABEL: Record<string, string> = Object.fromEntries(
  SYMPTOM_OPTIONS.map((s) => [s.value, s.label]),
);

export const SOURCE_LABEL: Record<string, string> = {
  sensor_reading: 'Sensor reading',
  manual_input: 'Manual entry',
  imported_examination: 'Imported examination',
  self_reported: 'Self-reported',
};
