// Every status the backend sends is shown with its word and a marker, so colour is never the only signal.
type Tone = 'attention' | 'info' | 'neutral' | 'warning';

const LABEL: Record<string, { text: string; tone: Tone }> = {
  attention: { text: 'Attention', tone: 'attention' },
  info: { text: 'Info', tone: 'info' },
  no_alerts: { text: 'No alerts', tone: 'neutral' },
  not_evaluated: { text: 'Not evaluated', tone: 'neutral' },
  rule_fired: { text: 'Rule fired', tone: 'attention' },
  no_rule_fired: { text: 'No rule fired', tone: 'neutral' },
  missing: { text: 'Missing', tone: 'warning' },
  outdated: { text: 'Outdated', tone: 'warning' },
  current: { text: 'Current', tone: 'neutral' },
};

const TONE: Record<Tone, { cls: string; marker: string }> = {
  attention: { cls: 'border-accent-orange text-accent-orange', marker: '▲' },
  info: { cls: 'border-accent-teal text-accent-teal', marker: '●' },
  neutral: { cls: 'border-status-muted text-text-secondary', marker: '○' },
  warning: { cls: 'border-dashed border-accent-orange text-accent-orange', marker: '◇' },
};

export function StatusChip({ value }: { value: string }) {
  const entry = LABEL[value] ?? { text: value, tone: 'neutral' as Tone };
  const style = TONE[entry.tone];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-chip border px-2 py-0.5 text-xs font-medium ${style.cls}`}>
      <span aria-hidden="true">{style.marker}</span>
      {entry.text}
    </span>
  );
}
