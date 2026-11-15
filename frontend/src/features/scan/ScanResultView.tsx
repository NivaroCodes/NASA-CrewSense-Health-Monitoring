import { Card } from '../../components/ui/Card';
import { ProvenanceBadge } from '../../components/ui/ProvenanceBadge';
import { StatusChip } from '../../components/ui/StatusChip';
import { AlertList } from '../dashboard/AlertList';
import type { ScanOut } from '../../types/api';
import { formatDateTime } from '../../utils/datetime';
import { formatValue, pad3 } from '../../utils/format';
import { CATEGORY_LABEL, SYMPTOM_LABEL } from '../../utils/labels';

// The consolidated result of one scan (contract section 6). Also used to reopen a stored scan.
export function ScanResultView({ scan }: { scan: ScanOut }) {
  const { counts } = scan.summary;
  const steps = [...scan.next_steps].sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-sans font-semibold">Scan #{scan.id}</h1>
        <p className="text-sm text-text-secondary">
          Mission Day {pad3(scan.mission_day)} · Submitted {formatDateTime(scan.submitted_at)} · Evaluated at {formatDateTime(scan.as_of)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-sm">Overall</span>
          <StatusChip value={scan.summary.overall_status} />
          <span className="text-xs text-text-secondary">
            {counts.alerts_attention} attention · {counts.alerts_info} info · {counts.data_notices} data notice(s)
          </span>
        </div>
      </div>

      <section aria-label="Problem areas">
        <h2 className="mb-2 text-sm uppercase tracking-wide text-text-secondary">Problem areas</h2>
        <ul className="flex flex-wrap gap-3">
          {scan.summary.problem_areas.map((a) => (
            <li key={a.area} className="flex items-center gap-2 text-sm">
              <span>{CATEGORY_LABEL[a.area] ?? a.area}</span>
              <StatusChip value={a.status} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Alerts from this scan">
        <h2 className="mb-2 text-sm uppercase tracking-wide text-text-secondary">Alerts</h2>
        <AlertList alerts={scan.alerts} emptyText="No alerts from this scan." />
      </section>

      <section aria-label="Next steps">
        <h2 className="mb-2 text-sm uppercase tracking-wide text-text-secondary">Next steps</h2>
        {steps.length === 0 ? (
          <p className="text-sm text-text-secondary">No next steps were given.</p>
        ) : (
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {steps.map((s) => (
              <li key={s.priority}>{s.text}</li>
            ))}
          </ol>
        )}
      </section>

      {scan.data_notices.length > 0 ? (
        <section aria-label="Data notices">
          <h2 className="mb-2 text-sm uppercase tracking-wide text-text-secondary">Data notices</h2>
          <ul className="space-y-1 text-sm">
            {scan.data_notices.map((n) => (
              <li key={`${n.id}-${n.metric_key}`}>
                <span className="font-mono text-xs text-text-secondary">{n.id}</span> {n.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold">Measurements used</h2>
          {scan.measurements_used.length === 0 ? (
            <p className="mt-2 text-sm text-text-secondary">None.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {scan.measurements_used.map((m) => (
                <li key={m.measurement_id} className="flex flex-wrap items-center gap-2">
                  <span className="capitalize">{m.metric_key.replace(/_/g, ' ')}</span>
                  <span className="font-mono">
                    {formatValue(m.value)} {m.unit}
                  </span>
                  <ProvenanceBadge sourceType={m.source_type} isSynthetic={m.is_synthetic} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="text-sm font-semibold">Wellbeing (self-reported)</h2>
          <p className="mt-2 text-sm">
            Mood {scan.wellbeing.mood_score} · Stress {scan.wellbeing.stress_score} · Sleep {scan.wellbeing.sleep_hours} h
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Symptoms: {scan.wellbeing.symptoms.length ? scan.wellbeing.symptoms.map((s) => SYMPTOM_LABEL[s] ?? s).join(', ') : 'none'}
          </p>
          {scan.wellbeing.notes ? <p className="mt-1 text-xs text-text-secondary">Notes: {scan.wellbeing.notes}</p> : null}
        </Card>
      </div>

      <p className="text-xs text-text-secondary">{scan.disclaimer}</p>
    </div>
  );
}
