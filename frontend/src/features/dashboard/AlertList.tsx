import { StatusChip } from '../../components/ui/StatusChip';
import type { ScanAlert } from '../../types/api';
import { formatDateTime } from '../../utils/datetime';
import { CATEGORY_LABEL } from '../../utils/labels';
import { formatValue } from '../../utils/format';

// Saved alerts from scans. Attention-required items come first. The explanation text is the backend's, shown as received.
export function AlertList({ alerts, emptyText }: { alerts: ScanAlert[]; emptyText: string }) {
  if (alerts.length === 0) return <p className="text-sm text-text-secondary">{emptyText}</p>;
  const sorted = [...alerts].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'attention' ? -1 : 1));

  return (
    <ul className="space-y-3">
      {sorted.map((alert) => {
        const v = alert.evidence.values;
        return (
          <li key={`${alert.id ?? alert.rule_id}-${alert.scan_id ?? 'x'}`} className="rounded-card border border-border-subtle bg-bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusChip value={alert.severity} />
              <span className="text-xs text-text-secondary">{CATEGORY_LABEL[alert.category] ?? alert.category}</span>
            </div>
            <h3 className="mt-2 text-sm font-semibold">{alert.title}</h3>
            <p className="mt-1 text-sm">{alert.explanation}</p>
            <p className="mt-2 font-mono text-xs text-text-secondary">
              Latest {formatValue(v.latest)} · reference {v.reference === null ? 'n/a' : formatValue(v.reference)} · change{' '}
              {formatValue(v.change)}
              {v.change_unit === 'percent' ? '%' : ' (absolute)'} · threshold {formatValue(v.threshold)}
            </p>
            <p className="mt-2 text-xs text-text-secondary">
              {alert.scan_id !== null ? `Scan #${alert.scan_id}` : 'Scan not identified'}
              {alert.created_at ? ` · generated ${formatDateTime(alert.created_at)}` : ''}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
