// The four interface statuses from Spec, Section 8. Colour is never the only signal:
// every chip carries its word and an icon-like marker.
export type AlertStatus = 'Normal' | 'Attention' | 'Urgent' | 'Insufficient Data';

const STYLE: Record<AlertStatus, { cls: string; marker: string }> = {
  Normal: { cls: 'border-accent-cyan text-accent-cyan', marker: '●' },
  Attention: { cls: 'border-accent-amber text-accent-amber', marker: '▲' },
  Urgent: { cls: 'border-accent-crimson text-accent-crimson', marker: '■' },
  'Insufficient Data': { cls: 'border-status-slate text-status-slate', marker: '○' },
};

export function SeverityChip({ status }: { status: AlertStatus }) {
  const s = STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-chip border px-2 py-0.5 text-xs font-medium ${s.cls}`}>
      <span aria-hidden="true">{s.marker}</span>
      {status}
    </span>
  );
}
