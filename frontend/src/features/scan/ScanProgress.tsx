import type { ScanStep } from '../../store/useScanStore';

const LABELS = ['Start', 'Retrieve', 'Missing', 'Enter', 'Wellbeing', 'Review', 'Analyse', 'Overview', 'Save'];

// Step counter visible at all times during the scan (Spec, Section 6, cross-cutting rule 4).
export function ScanProgress({ step }: { step: ScanStep }) {
  return (
    <div aria-label={`Step ${step} of 9`} className="space-y-2">
      <p className="font-mono text-sm text-text-secondary">
        Step {step} of 9 · <span className="text-text-primary">{LABELS[step - 1]}</span>
      </p>
      <ol className="flex gap-1" aria-hidden="true">
        {LABELS.map((_, i) => (
          <li
            key={i}
            className={`h-1 flex-1 rounded-chip ${i + 1 <= step ? 'bg-accent-cyan' : 'bg-bg-surface-raised'}`}
          />
        ))}
      </ol>
    </div>
  );
}
