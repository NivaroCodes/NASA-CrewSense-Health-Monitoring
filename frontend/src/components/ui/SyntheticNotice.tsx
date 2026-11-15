// Persistent strip while demonstration data is shown. Hidden only once live data replaces the synthetic source.
export function SyntheticNotice() {
  return (
    <div role="status" className="bg-accent-orange/10 px-4 py-1.5 text-center text-xs text-accent-orange">
      <strong className="font-semibold">Simulated data.</strong> The astronaut and mission are fictional. These values are not real medical records.
    </div>
  );
}
