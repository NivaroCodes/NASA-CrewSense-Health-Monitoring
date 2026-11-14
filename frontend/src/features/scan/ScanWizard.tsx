import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useHealthOverview } from '../../hooks/useHealthOverview';
import { useScanStore, type ScanStep, type ScanState } from '../../store/useScanStore';
import { finalizeScan, loadDraft, saveDraft } from '../../services/offline/scanRepo';
import type { ScanDraftPayload } from '../../services/offline/db';
import { canAdvance } from './validateStep';
import { ScanProgress } from './ScanProgress';
import { computeMissing } from './missing';
import { StepAnalyse, StepOverview, StepSave } from './StepResult';
import { StepManualEntry, StepMissing, StepReview, StepSensorFetch, StepStart, StepWellbeing } from './steps';

function snapshot(s: ScanState): ScanDraftPayload {
  return { step: s.step, manual: s.manual, mood: s.mood, stress: s.stress, symptoms: s.symptoms };
}

// One container, one session, one progress indicator (Spec, Section 6). The container never changes route
// between steps, and Back never clears entered values.
export function ScanWizard() {
  const navigate = useNavigate();
  const { data } = useHealthOverview();
  const state = useScanStore();
  const readings = data?.readings ?? [];
  const missing = useMemo(() => computeMissing(readings), [readings]);

  // Restore an unfinished scan after a reload (Spec, Section 6, Step 1).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (useScanStore.getState().scanId) return;
      const draft = await loadDraft();
      if (cancelled || !draft) return;
      const p = draft.payload;
      useScanStore.setState({ scanId: draft.scanId, step: p.step, manual: p.manual, mood: p.mood, stress: p.stress, symptoms: p.symptoms });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Save the draft on every change so a reload resumes at the same step with values intact.
  useEffect(() => {
    return useScanStore.subscribe((s) => {
      if (!s.scanId) return;
      void saveDraft(s.scanId, snapshot(s));
    });
  }, []);

  // Step 4 is skipped when nothing is missing (Spec, Section 6, Step 3).
  const effectiveNext = (from: ScanStep): ScanStep => {
    if (from === 3 && missing.length === 0) return 5;
    return (from + 1) as ScanStep;
  };
  const effectiveBack = (from: ScanStep): ScanStep => {
    if (from === 5 && missing.length === 0) return 3;
    return (from - 1) as ScanStep;
  };

  const gate = canAdvance(state.step, state, missing);

  const next = () => {
    if (!gate.ok) return;
    state.setStep(effectiveNext(state.step));
  };
  const back = () => state.setStep(effectiveBack(state.step));

  // Step 9: write the scan and queue it for sync in one transaction, then leave the scan (Spec, Section 6).
  const finish = async () => {
    const s = useScanStore.getState();
    if (s.scanId) await finalizeScan(s.scanId, snapshot(s));
    state.reset();
    navigate('/dashboard');
  };

  if (state.scanId === null) {
    return <StepStart onBegin={() => state.begin()} />;
  }

  const current = (() => {
    switch (state.step) {
      case 1:
        return null;
      case 2:
        return <StepSensorFetch readings={readings} />;
      case 3:
        return <StepMissing missing={missing} />;
      case 4:
        return <StepManualEntry missing={missing} />;
      case 5:
        return <StepWellbeing />;
      case 6:
        return <StepReview readings={readings} missing={missing} />;
      case 7:
        return <StepAnalyse onContinue={next} />;
      case 8:
        return <StepOverview />;
      case 9:
        return <StepSave onFinish={finish} />;
    }
  })();

  // Steps 7 to 9 carry their own controls.
  const showNav = state.step !== 7 && state.step !== 9;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ScanProgress step={state.step} />
      {current}
      {showNav ? (
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="secondary" onClick={back} disabled={state.step === 1} disabledReason={state.step === 1 ? 'Nothing before the first step' : undefined}>
            Back
          </Button>
          <Button onClick={next} disabled={!gate.ok} disabledReason={gate.reason}>
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
