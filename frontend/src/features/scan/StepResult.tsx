import { Card } from '../../components/ui/Card';

// Steps 7 to 9. Analysis is performed by the backend only (Spec, Section 6, Step 7).
// Until the endpoint exists (T-021), the result is explicitly pending and no local analysis is shown.
export function StepAnalyse({ onContinue }: { onContinue: () => void }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">Analysis</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Analysis is pending. CrewSense does not calculate health results on the device, so the overview will show the
        recorded values only.
      </p>
      <button type="button" onClick={onContinue} className="mt-4 rounded-chip bg-accent-cyan px-4 py-2 text-sm font-medium text-bg-base">
        Continue
      </button>
    </Card>
  );
}

export function StepOverview() {
  return (
    <Card>
      <h2 className="text-lg font-semibold">Scan overview</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Recorded values are listed on the review step. Changes, alerts and recommendations appear here once the backend
        analysis is connected.
      </p>
    </Card>
  );
}

export function StepSave({ onFinish }: { onFinish: () => void }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">Save and finish</h2>
      <p className="mt-2 text-sm text-text-secondary">
        The scan is kept on this device until it can be sent. Local storage is connected in T-019.
      </p>
      <button type="button" onClick={onFinish} className="mt-4 rounded-chip bg-accent-cyan px-4 py-2 text-sm font-medium text-bg-base">
        Finish
      </button>
    </Card>
  );
}
