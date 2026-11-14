import { TrendPanel } from './TrendPanel';
import type { IndicatorId } from '../../types/telemetry';

// History and analytics (Spec, Section 9). Trend panels for each indicator; blood pressure reports unavailable.
const INDICATORS: { id: IndicatorId; title: string }[] = [
  { id: 'heartRate', title: 'Heart rate' },
  { id: 'bloodPressure', title: 'Blood pressure' },
  { id: 'bloodGlucose', title: 'Blood glucose' },
  { id: 'bodyTemperature', title: 'Body temperature' },
  { id: 'sleepDuration', title: 'Sleep duration' },
  { id: 'mood', title: 'Mood' },
];

export function HistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-sans font-semibold">History</h1>
        <p className="text-sm text-text-secondary">Last 30 days. Breaks in a line mark days without a reading.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {INDICATORS.map((item) => (
          <TrendPanel key={item.id} id={item.id} title={item.title} />
        ))}
      </div>
    </div>
  );
}
