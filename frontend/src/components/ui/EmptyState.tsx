// Placeholder shared by every route until its feature lands.
// Empty and error states are distinct wording (Spec, Section 11, rule 4).
export function PlaceholderPanel({ title, note }: { title: string; note: string }) {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-sans font-semibold">{title}</h1>
      <p className="text-sm text-text-secondary">{note}</p>
    </div>
  );
}
