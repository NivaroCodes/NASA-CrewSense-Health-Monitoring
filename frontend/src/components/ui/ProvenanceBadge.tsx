import { PROVENANCE_LABEL, type Provenance } from '../../types/provenance';

// Every value on screen carries one of these (Spec, Phase 5.7).
// SYNTHETIC is rendered with a distinct outline so it cannot pass as a live reading.
export function ProvenanceBadge({ source }: { source: Provenance | undefined }) {
  if (!source) {
    return (
      <span className="inline-flex items-center rounded-chip border border-status-slate px-1.5 py-0.5 font-mono text-xs text-status-slate">
        Source unknown
      </span>
    );
  }
  const synthetic = source === 'SYNTHETIC';
  return (
    <span
      className={[
        'inline-flex items-center rounded-chip px-1.5 py-0.5 font-mono text-xs',
        synthetic
          ? 'border border-dashed border-accent-amber text-accent-amber'
          : 'bg-bg-surface-raised text-text-secondary',
      ].join(' ')}
      data-provenance={source}
    >
      {PROVENANCE_LABEL[source]}
    </span>
  );
}
