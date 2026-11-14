import type { MonitoringSummary } from '../../types/telemetry';

// Reports monitoring capability, never clinical health (Spec, Section 5, Component B).
// Deliberately contains no numeric health score.
export function MonitoringBanner({ summary }: { summary: MonitoringSummary }) {
  const { activeSources, totalSources, needingAttention, missing } = summary;
  const operational = activeSources === totalSources;
  return (
    <section aria-label="Monitoring status" className="rounded-card border border-border-subtle bg-bg-surface p-4">
      <p className="text-base">
        <span className={operational ? 'text-accent-cyan' : 'text-accent-amber'}>
          {operational ? 'Monitoring operational' : 'Monitoring partially operational'}
        </span>
        <span className="text-text-secondary"> · </span>
        <span className="font-mono">
          {activeSources}/{totalSources}
        </span>{' '}
        <span className="text-text-secondary">active sources</span>
      </p>
      <p className="mt-1 text-sm text-text-secondary">
        {needingAttention} {needingAttention === 1 ? 'indicator needs' : 'indicators need'} attention · {missing} missing
      </p>
      <p className="mt-2 text-xs text-text-secondary">
        This reports monitoring conditions, not a clinical assessment.
      </p>
    </section>
  );
}
