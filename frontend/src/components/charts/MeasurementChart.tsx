import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { gapThresholdMs, toChartRows, type ChartPoint } from './measurementRows';

// Colours mirror the design tokens in tailwind.config.js (Recharts takes literal values).
const LINE = '#00F0FF';
const REFERENCE = '#FFB800';
const AXIS = '#8A99AD';
const GRID = '#223049';

interface Props {
  points: ChartPoint[];
  unit: string;
  freshnessHours: number;
  referenceValue?: number | null;
}

// Stored values over time. The reference line is the backend's personal baseline, not a clinical threshold.
export function MeasurementChart({ points, unit, freshnessHours, referenceValue }: Props) {
  if (points.length === 0) {
    return <p className="text-sm text-text-secondary">No stored values for this indicator yet.</p>;
  }
  const rows = toChartRows(points, gapThresholdMs(freshnessHours));

  return (
    <div
      className="h-56 w-full"
      role="img"
      aria-label={`${points.length} stored values. Breaks in the line mark gaps longer than twice the freshness window.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="x"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v: number) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            tick={{ fill: AXIS, fontSize: 11 }}
            stroke={GRID}
          />
          <YAxis domain={['auto', 'auto']} tick={{ fill: AXIS, fontSize: 11 }} width={56} stroke={GRID} />
          <Tooltip
            labelFormatter={(v) => new Date(Number(v)).toLocaleString()}
            formatter={(v) => [`${String(v)} ${unit}`, 'Value']}
          />
          {referenceValue !== null && referenceValue !== undefined ? (
            <ReferenceLine y={referenceValue} stroke={REFERENCE} strokeDasharray="4 4" />
          ) : null}
          <Line
            type="monotone"
            dataKey="value"
            stroke={LINE}
            strokeWidth={2}
            connectNulls={false}
            dot={{ r: 3, fill: LINE, stroke: LINE }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
