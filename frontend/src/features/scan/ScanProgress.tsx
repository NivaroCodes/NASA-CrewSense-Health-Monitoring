// Position within the scan. The measurement step is omitted when the server requests nothing.
export function ScanProgress({ step, hasMeasurements }: { step: number; hasMeasurements: boolean }) {
  const labels = hasMeasurements ? ['Overview', 'Measurements', 'Wellbeing', 'Review'] : ['Overview', 'Wellbeing', 'Review'];
  const current = hasMeasurements ? step : step === 1 ? 1 : step === 3 ? 2 : step === 4 ? 3 : 1;
  return (
    <div className="space-y-2" aria-label="Scan progress">
      <p className="text-sm text-text-secondary">
        Step {current} of {labels.length}: {labels[current - 1]}
      </p>
      <div className="flex gap-1" aria-hidden="true">
        {labels.map((label, i) => (
          <span key={label} className={`h-1 flex-1 rounded-chip ${i < current ? 'bg-accent-teal' : 'bg-bg-surface-raised'}`} />
        ))}
      </div>
    </div>
  );
}
