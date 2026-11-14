// Persistent notice while demonstration data is shown (Spec, Phase 8 and Section 19).
// Hidden only once live data replaces the synthetic source.
export function SyntheticNotice() {
  return (
    <div
      role="status"
      className="rounded-card border border-dashed border-accent-amber bg-accent-amber/5 px-4 py-2 text-sm text-accent-amber"
    >
      SYNTHETIC DEMONSTRATION DATA. Values shown are not measurements.
    </div>
  );
}
