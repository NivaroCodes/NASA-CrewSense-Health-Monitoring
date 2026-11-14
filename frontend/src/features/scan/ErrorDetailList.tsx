import type { ErrorDetail } from '../../types/api';

// Raw field-level messages from the server, for any field the form cannot show next to an input.
export function ErrorDetailList({ details }: { details: ErrorDetail[] }) {
  if (details.length === 0) return null;
  return (
    <ul className="list-disc pl-5 font-mono text-xs text-text-secondary">
      {details.map((d) => (
        <li key={`${d.field}-${d.message}`}>
          {d.field}: {d.message}
        </li>
      ))}
    </ul>
  );
}
