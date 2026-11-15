import { SOURCE_LABEL } from '../../utils/labels';

// Where a value came from. Synthetic demo data is marked separately and never looks like a live reading.
export function ProvenanceBadge({ sourceType, isSynthetic = false }: { sourceType: string | undefined; isSynthetic?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className="rounded-chip bg-bg-surface-raised px-1.5 py-0.5 font-mono text-xs text-text-secondary" data-source={sourceType ?? 'none'}>
        {sourceType ? (SOURCE_LABEL[sourceType] ?? sourceType) : 'No source'}
      </span>
      {isSynthetic ? (
        <span className="rounded-chip border border-dashed border-accent-orange px-1.5 py-0.5 font-mono text-xs text-accent-orange" data-synthetic="true">
          Synthetic demo
        </span>
      ) : null}
    </span>
  );
}
