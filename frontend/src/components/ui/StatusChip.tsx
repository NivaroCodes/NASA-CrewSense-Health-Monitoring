// Every status the backend sends is shown with its word and a marker, so colour is never the only signal.
type Tone = 'attention' | 'info' | 'neutral' | 'warning';

const LABEL: Record<string, { text: string; tone: Tone }> = {
  attention: { text: 'Needs review', tone: 'attention' },
  info: { text: 'Info', tone: 'info' },
  no_alerts: { text: 'No alerts', tone: 'neutral' },
  not_evaluated: { text: 'Not evaluated', tone: 'neutral' },
  rule_fired: { text: 'Needs review', tone: 'attention' },
  no_rule_fired: { text: 'Close to usual', tone: 'neutral' },
  missing: { text: 'Missing', tone: 'warning' },
  outdated: { text: 'Old data', tone: 'warning' },
  current: { text: 'Up to date', tone: 'neutral' },
};

const TONE: Record<Tone, { cls: string; marker: string }> = {
  attention: { cls: 'border-accent-orange/30 bg-accent-orange/10 text-accent-orange', marker: '▲' },
  info: { cls: 'border-accent-teal/30 bg-accent-teal/10 text-accent-teal', marker: '●' },
  neutral: { cls: 'border-border-subtle bg-bg-surface-raised text-text-secondary', marker: '○' },
  warning: { cls: 'border-dashed border-accent-orange text-accent-orange', marker: '◇' },
};

export function StatusChip({ value }: { value: string }) {
  const entry = LABEL[value] ?? { text: value, tone: 'neutral' as Tone };
  const style = TONE[entry.tone];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${style.cls}`}>
      <span aria-hidden="true">{style.marker}</span>
      {entry.text}
    </span>
  );
}
