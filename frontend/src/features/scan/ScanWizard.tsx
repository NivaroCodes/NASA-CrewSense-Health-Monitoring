import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorDetailList } from './ErrorDetailList';
import { ApiError } from '../../services/api/client';
import { getScan, submitScan } from '../../services/api/endpoints';
import { deleteDraft, loadDraft, queueScan, saveDraft } from '../../services/offline/scanRepo';
import { useScanStore } from '../../store/useScanStore';
import type { Dashboard, ErrorDetail, MetricOut, ScanCreate, ScanOut } from '../../types/api';
import type { ManualEntry, ScanDraft, ScanStep } from '../../types/scanDraft';
import { toLocalInputValue } from '../../utils/datetime';
import { buildScanBody } from './buildScanBody';
import { ScanProgress } from './ScanProgress';
import { ScanResultView } from './ScanResultView';
import { StepMeasurements, StepOverview, StepReview, StepWellbeing } from './steps';
import { mapServerErrors, stepErrors, type FieldErrors } from './validateStep';

type Outcome = { kind: 'saved'; scan: ScanOut; verified: boolean } | { kind: 'queued' };

interface Props {
  dashboard: Dashboard;
  fromCache: boolean;
  metricsByKey: Map<string, MetricOut>;
}

const hasContent = (draft: ScanDraft) =>
  Object.keys(draft.entries).length > 0 || Object.values(draft.wellbeing).some((v) => (Array.isArray(v) ? v.length > 0 : v !== ''));

// The Daily Health Scan as one container across four steps. Drafts survive reloads. A submission is sent once.
export function ScanWizard({ dashboard, fromCache, metricsByKey }: Props) {
  const queryClient = useQueryClient();
  const store = useScanStore();
  const requirements = dashboard.scan_requirements;
  const hasMeasurements = requirements.length > 0;
  // Default observation time is when this scan was created (persisted in the draft), never the dashboard's cached as_of.
  const defaultObservedAt = toLocalInputValue(store.startedAt);

  const [ready, setReady] = useState(false);
  const [restored, setRestored] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [serverFields, setServerFields] = useState<FieldErrors>({});
  const [serverGeneral, setServerGeneral] = useState<string[]>([]);
  const [serverDetails, setServerDetails] = useState<ErrorDetail[]>([]);
  const submittingRef = useRef(false);

  // Restore an unfinished scan from IndexedDB, or start a new one.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const stored = await loadDraft();
      if (!alive) return;
      if (stored?.draft && stored.scanId) {
        useScanStore.getState().restore(stored.scanId, stored.draft);
        setRestored(hasContent(stored.draft));
      } else {
        useScanStore.getState().begin();
      }
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Every change is written to IndexedDB, so a reload resumes at the same step with the same values.
  useEffect(
    () =>
      useScanStore.subscribe((s) => {
        if (s.scanId) void saveDraft(s.scanId, { step: s.step, entries: s.entries, wellbeing: s.wellbeing, startedAt: s.startedAt });
      }),
    [],
  );

  // Pre-fill each requested value with its source type and the dashboard reference time. The astronaut's edits are kept.
  useEffect(() => {
    if (!ready) return;
    const defaults: Record<string, ManualEntry> = {};
    for (const req of requirements) {
      defaults[req.metric_key] = {
        value: '',
        observedAt: defaultObservedAt,
        sourceType: req.allowed_source_types[0] ?? 'manual_input',
      };
    }
    useScanStore.getState().ensureEntries(defaults);
  }, [ready, requirements, defaultObservedAt]);

  const draft: ScanDraft = { step: store.step, entries: store.entries, wellbeing: store.wellbeing, startedAt: store.startedAt };
  const inputs = { requirements, metricsByKey, draft };
  const clientErrors = stepErrors(store.step, inputs);
  const shownErrors: FieldErrors = { ...clientErrors, ...serverFields };
  const blocked = Object.keys(clientErrors).length > 0;

  const nextOf = (s: ScanStep): ScanStep | null => {
    if (s === 1) return hasMeasurements ? 2 : 3;
    if (s === 2) return 3;
    if (s === 3) return 4;
    return null;
  };
  const prevOf = (s: ScanStep): ScanStep | null => {
    if (s === 4) return 3;
    if (s === 3) return hasMeasurements ? 2 : 1;
    if (s === 2) return 1;
    return null;
  };

  const goNext = () => {
    const next = nextOf(store.step);
    if (next !== null && !blocked) store.setStep(next);
  };
  const goBack = () => {
    const prev = prevOf(store.step);
    if (prev !== null) store.setStep(prev);
  };

  const submit = async () => {
    if (submittingRef.current || !store.scanId) return;
    const scanId = store.scanId;
    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    setServerFields({});
    setServerGeneral([]);
    setServerDetails([]);

    let body: ScanCreate;
    try {
      body = buildScanBody({
        astronautId: dashboard.astronaut.id,
        // Reference time is when the scan was created. It is fixed in the draft, so a retry after a reload sends the same body.
        asOf: draft.startedAt,
        // The scan's ID is created once when the scan begins and is reused by every retry.
        clientScanId: scanId,
        draft,
        requirements,
        metricsByKey,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'The scan could not be prepared.');
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    try {
      // The draft (with its scan ID and startedAt) is on disk before the first request leaves the device.
      await saveDraft(scanId, draft);
      const saved = await submitScan(body);
      let verified = false;
      try {
        await getScan(saved.id);
        verified = true;
      } catch {
        verified = false;
      }
      await deleteDraft(scanId);
      useScanStore.getState().begin();
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['scans'] });
      void queryClient.invalidateQueries({ queryKey: ['alerts'] });
      void queryClient.invalidateQueries({ queryKey: ['measurements'] });
      setOutcome({ kind: 'saved', scan: saved, verified });
    } catch (err) {
      if (err instanceof ApiError && err.isNetworkFailure) {
        // No answer from the server: keep the scan on this device and send it when the link returns.
        await queueScan(scanId, body);
        useScanStore.getState().begin();
        setOutcome({ kind: 'queued' });
      } else if (err instanceof ApiError) {
        const mapped = mapServerErrors(err.details, requirements);
        setServerFields(mapped.fields);
        setServerGeneral(mapped.general);
        setServerDetails(err.details);
        setFormError(
          err.code === 'idempotency_conflict'
            ? 'This scan was already saved with different values, so it was not stored again. Discard the draft to start a new scan.'
            : err.status >= 500
              ? `${err.message} (${err.code}). The scan may or may not have been saved. Submit again without changing the values: the same scan ID is reused, so it cannot be stored twice.`
              : `${err.message} (${err.code}). Nothing was stored; correct the values and submit again.`,
        );
      } else {
        setFormError('An unexpected error occurred. Your entries are kept.');
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const discard = async () => {
    if (store.scanId) await deleteDraft(store.scanId);
    useScanStore.getState().begin();
    setRestored(false);
    setServerFields({});
    setServerGeneral([]);
    setServerDetails([]);
    setFormError(null);
  };

  if (!ready) return <p className="text-sm text-text-secondary">Loading the scan…</p>;

  if (outcome?.kind === 'saved') {
    return (
      <div className="space-y-6">
        <Card>
          <p className="text-sm">
            Scan #{outcome.scan.id} was stored on the server.
            {outcome.verified ? ' It was read back from the server to confirm.' : ' The read-back check failed; open it from History to confirm.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setOutcome(null)}>
              Start another scan
            </Button>
            <Link to="/dashboard" className="self-center text-sm text-accent-teal underline">
              Back to dashboard
            </Link>
          </div>
        </Card>
        <ScanResultView scan={outcome.scan} />
      </div>
    );
  }

  if (outcome?.kind === 'queued') {
    return (
      <Card className="space-y-3">
        <p className="text-sm">The server did not answer, so this scan is saved on this device.</p>
        <p className="text-sm text-text-secondary">It will be sent automatically when the backend is reachable. The header shows how many are waiting.</p>
        <Button variant="secondary" onClick={() => setOutcome(null)}>
          Start another scan
        </Button>
      </Card>
    );
  }

  const isLast = store.step === 4;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ScanProgress step={store.step} hasMeasurements={hasMeasurements} />

      {restored ? (
        <Card>
          <p className="text-sm text-text-secondary">An unfinished scan from this device was restored.</p>
          <button type="button" onClick={() => void discard()} className="mt-2 text-sm text-accent-orange underline">
            Discard it and start again
          </button>
        </Card>
      ) : null}

      {fromCache ? (
        <p className="text-sm text-accent-orange">
          Offline: the requirements come from the last cached dashboard. Submitting now stores the scan on this device.
        </p>
      ) : null}

      {store.step === 1 ? <StepOverview dashboard={dashboard} requirements={requirements} /> : null}
      {store.step === 2 ? (
        <StepMeasurements
          requirements={requirements}
          metricsByKey={metricsByKey}
          entries={store.entries}
          errors={shownErrors}
          onEntry={(metricKey, patch) => {
            setServerFields({});
            store.setEntry(metricKey, patch);
          }}
          defaultObservedAt={defaultObservedAt}
        />
      ) : null}
      {store.step === 3 ? (
        <StepWellbeing
          wellbeing={store.wellbeing}
          errors={shownErrors}
          onChange={(patch) => {
            setServerFields({});
            store.setWellbeing(patch);
          }}
          onToggleSymptom={(s) => store.toggleSymptom(s)}
        />
      ) : null}
      {store.step === 4 ? <StepReview requirements={requirements} metricsByKey={metricsByKey} draft={draft} /> : null}

      {formError ? (
        <div role="alert" className="space-y-2">
          <p className="text-sm text-accent-red">{formError}</p>
          {serverGeneral.length > 0 ? (
            <ul className="list-disc pl-5 text-xs text-accent-red">
              {serverGeneral.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          ) : null}
          <ErrorDetailList details={serverDetails} />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {prevOf(store.step) !== null ? (
          <Button variant="secondary" onClick={goBack} disabled={submitting}>
            Back
          </Button>
        ) : null}
        {isLast ? (
          <Button
            variant="primary"
            onClick={() => void submit()}
            loading={submitting}
            disabled={submitting}
            disabledReason={submitting ? 'Submitting…' : undefined}
          >
            Submit scan
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={goNext}
            disabled={blocked}
            disabledReason={blocked ? 'Correct the highlighted values to continue.' : undefined}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
