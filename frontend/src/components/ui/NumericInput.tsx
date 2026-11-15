import { useId } from 'react';

interface NumericInputProps {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  rangeHint: string;
  error?: string;
  inputMode?: 'numeric' | 'decimal';
}

// Controlled numeric field. The accepted range is always stated under the field,
// and the error text names the range rather than any clinical meaning (Spec, Section 6, Step 4).
export function NumericInput({ label, unit, value, onChange, rangeHint, error, inputMode = 'numeric' }: NumericInputProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm text-text-secondary">
        {label} <span className="font-mono">({unit})</span>
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
        className={`w-40 rounded-chip border bg-bg-surface px-3 py-2 font-mono text-lg text-text-primary focus:outline-none ${
          error ? 'border-accent-red' : 'border-border-subtle focus:border-accent-teal'
        }`}
      />
      <p id={hintId} className="text-xs text-text-secondary">
        Accepted: {rangeHint}
      </p>
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-accent-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}
