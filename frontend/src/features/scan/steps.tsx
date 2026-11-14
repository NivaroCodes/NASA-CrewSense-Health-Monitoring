import { Card } from '../../components/ui/Card';
import { NumericInput } from '../../components/ui/NumericInput';
import { ProvenanceBadge } from '../../components/ui/ProvenanceBadge';
import { useScanStore, type ManualKey } from '../../store/useScanStore';
import type { Reading } from '../../types/telemetry';
import {
  type ValidationResult,
  BP_DIASTOLIC_RANGE,
  BP_SYSTOLIC_RANGE,
  GLUCOSE_RANGE,
  HEART_RATE_RANGE,
  SLEEP_RANGE,
  TEMPERATURE_RANGE,
  validateBloodPressure,
  validateGlucose,
  validateHeartRate,
  validateSleep,
  validateTemperature,
} from '../../utils/validation';

// Step 1: confirmation before the scan begins.
export function StepStart({ onBegin }: { onBegin: () => void }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">Start Daily Health Scan</h2>
      <p className="mt-2 text-sm text-text-secondary">
        CrewSense will retrieve available readings, ask only for what is missing, and ask two short wellbeing questions.
      </p>
      <button type="button" onClick={onBegin} className="mt-4 rounded-chip bg-accent-cyan px-4 py-2 text-sm font-medium text-bg-base">
        Begin
      </button>
    </Card>
  );
}

// Step 2: what each source returned. Unanswered sources are stated, never filled in.
export function StepSensorFetch({ readings }: { readings: Reading[] }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">Retrieved readings</h2>
      <ul className="mt-3 divide-y divide-border-subtle">
        {readings.map((r) => (
          <li key={r.id} className="flex items-center justify-between py-2 text-sm">
            <span>{r.name}</span>
            <span className="flex items-center gap-2">
              {r.value !== null ? (
                <>
                  <span className="font-mono">
                    {r.value} {r.unit}
                  </span>
                  <ProvenanceBadge source={r.provenance} />
                </>
              ) : (
                <span className="font-mono text-text-secondary">Not available</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// Step 3: the list of missing measurements, derived from step 2.
export function StepMissing({ missing }: { missing: ManualKey[] }) {
  if (missing.length === 0) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">Nothing missing</h2>
        <p className="mt-2 text-sm text-text-secondary">All measurements were retrieved. Manual entry is skipped.</p>
      </Card>
    );
  }
  return (
    <Card>
      <h2 className="text-lg font-semibold">Missing measurements</h2>
      <p className="mt-2 text-sm text-text-secondary">{missing.length} field(s) need manual entry.</p>
    </Card>
  );
}

// Show an error only once the field has input, so an untouched field is not flagged.
function errorIfTyped(result: ValidationResult, raw: string | undefined): string | undefined {
  if (!raw || result.ok) return undefined;
  return result.message;
}

// Step 4: manual entry for missing fields only, tagged MANUAL on save. Technical plausibility guards only.
export function StepManualEntry({ missing }: { missing: ManualKey[] }) {
  const manual = useScanStore((s) => s.manual);
  const setManual = useScanStore((s) => s.setManual);
  const show = (key: ManualKey) => missing.includes(key);

  const bp = validateBloodPressure(manual.systolic ?? '', manual.diastolic ?? '');

  return (
    <Card className="space-y-6">
      <h2 className="text-lg font-semibold">Enter missing measurements</h2>
      {show('heartRate') ? (
        <NumericInput
          label="Heart rate"
          unit="bpm"
          value={manual.heartRate ?? ''}
          onChange={(v) => setManual('heartRate', v)}
          rangeHint={`${HEART_RATE_RANGE.min} to ${HEART_RATE_RANGE.max} bpm`}
          error={errorIfTyped(validateHeartRate(manual.heartRate ?? ''), manual.heartRate)}
        />
      ) : null}
      {show('systolic') || show('diastolic') ? (
        <div className="flex flex-wrap gap-6">
          <NumericInput
            label="Systolic"
            unit="mmHg"
            value={manual.systolic ?? ''}
            onChange={(v) => setManual('systolic', v)}
            rangeHint={`${BP_SYSTOLIC_RANGE.min} to ${BP_SYSTOLIC_RANGE.max} mmHg`}
            error={!bp.systolic.ok && manual.systolic ? bp.systolic.message : bp.pair.ok ? undefined : bp.pair.message}
          />
          <NumericInput
            label="Diastolic"
            unit="mmHg"
            value={manual.diastolic ?? ''}
            onChange={(v) => setManual('diastolic', v)}
            rangeHint={`${BP_DIASTOLIC_RANGE.min} to ${BP_DIASTOLIC_RANGE.max} mmHg`}
            error={!bp.diastolic.ok && manual.diastolic ? bp.diastolic.message : undefined}
          />
        </div>
      ) : null}
      {show('glucose') ? (
        <NumericInput
          label="Blood glucose"
          unit="mg/dL"
          value={manual.glucose ?? ''}
          onChange={(v) => setManual('glucose', v)}
          rangeHint={`${GLUCOSE_RANGE.min} to ${GLUCOSE_RANGE.max} mg/dL`}
          error={errorIfTyped(validateGlucose(manual.glucose ?? ''), manual.glucose)}
        />
      ) : null}
      {show('temperature') ? (
        <NumericInput
          label="Body temperature"
          unit="°C"
          value={manual.temperature ?? ''}
          onChange={(v) => setManual('temperature', v)}
          rangeHint={`${TEMPERATURE_RANGE.min.toFixed(1)} to ${TEMPERATURE_RANGE.max.toFixed(1)} °C`}
          inputMode="decimal"
          error={errorIfTyped(validateTemperature(manual.temperature ?? ''), manual.temperature)}
        />
      ) : null}
      {show('sleep') ? (
        <NumericInput
          label="Sleep duration"
          unit="hours"
          value={manual.sleep ?? ''}
          onChange={(v) => setManual('sleep', v)}
          rangeHint={`${SLEEP_RANGE.min.toFixed(1)} to ${SLEEP_RANGE.max.toFixed(1)} hours`}
          inputMode="decimal"
          error={errorIfTyped(validateSleep(manual.sleep ?? ''), manual.sleep)}
        />
      ) : null}
    </Card>
  );
}

// Step 5: subjective self-report. Stored with provenance SELF-REPORT.
const SYMPTOMS = ['Headache', 'Fatigue', 'Nausea', 'Dizziness', 'Sleep disruption'];

export function StepWellbeing() {
  const mood = useScanStore((s) => s.mood);
  const stress = useScanStore((s) => s.stress);
  const symptoms = useScanStore((s) => s.symptoms);
  const setMood = useScanStore((s) => s.setMood);
  const setStress = useScanStore((s) => s.setStress);
  const toggle = useScanStore((s) => s.toggleSymptom);

  const scale = (label: string, value: number | null, onPick: (n: number) => void) => (
    <fieldset className="space-y-2">
      <legend className="text-sm text-text-secondary">{label} (1 to 5)</legend>
      <div className="flex gap-2" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onPick(n)}
            className={`h-10 w-10 rounded-chip border font-mono ${
              value === n ? 'border-accent-cyan bg-accent-cyan text-bg-base' : 'border-border-subtle text-text-primary'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </fieldset>
  );

  return (
    <Card className="space-y-6">
      <h2 className="text-lg font-semibold">Wellbeing</h2>
      {scale('Mood', mood, setMood)}
      {scale('Stress', stress, setStress)}
      <fieldset className="space-y-2">
        <legend className="text-sm text-text-secondary">Symptoms (none is a valid answer)</legend>
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS.map((s) => (
            <label key={s} className="flex items-center gap-2 rounded-chip border border-border-subtle px-3 py-1 text-sm">
              <input type="checkbox" checked={symptoms.includes(s)} onChange={() => toggle(s)} />
              {s}
            </label>
          ))}
        </div>
      </fieldset>
    </Card>
  );
}

// Step 6: every value with its origin badge. Values can be corrected by returning to step 4 or 5.
export function StepReview({ readings, missing }: { readings: Reading[]; missing: ManualKey[] }) {
  const manual = useScanStore((s) => s.manual);
  const mood = useScanStore((s) => s.mood);
  const stress = useScanStore((s) => s.stress);
  const rows = [
    ...readings.filter((r) => r.value !== null).map((r) => ({ name: r.name, value: `${r.value} ${r.unit}`, source: r.provenance })),
    ...missing
      .filter((k) => manual[k])
      .map((k) => ({ name: k, value: manual[k] ?? '', source: 'MANUAL' as const })),
    { name: 'Mood', value: `${mood ?? '-'} / 5`, source: 'SELF-REPORT' as const },
    { name: 'Stress', value: `${stress ?? '-'} / 5`, source: 'SELF-REPORT' as const },
  ];
  return (
    <Card>
      <h2 className="text-lg font-semibold">Review</h2>
      <table className="mt-3 w-full text-sm">
        <tbody className="divide-y divide-border-subtle">
          {rows.map((row, i) => (
            <tr key={i}>
              <td className="py-2 text-text-secondary">{row.name}</td>
              <td className="py-2 font-mono">{row.value}</td>
              <td className="py-2 text-right">
                <ProvenanceBadge source={row.source} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
