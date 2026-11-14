// Skeletons occupy the exact size of loaded content so nothing shifts on arrival (Spec, Section 11, rule 1).
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-chip bg-bg-surface-raised ${className}`} />;
}
