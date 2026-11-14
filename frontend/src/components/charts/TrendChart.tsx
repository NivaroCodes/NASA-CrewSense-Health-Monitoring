import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TrendSeries } from '../../types/history';
import { ProvenanceBadge } from '../ui/ProvenanceBadge';
import { toTrendRows, trendDomain } from './trendRows';

// Colours mirror the design tokens in tailwind.config.js (Recharts takes literal values, not classes).
const LINE = '#00F0FF';
const BAND = 'rgba(0, 240, 255, 0.12)';
const AXIS = '#8A99AD';
const GRID = '#223049';

// 30-day trend with a baseline band. Days without a reading are breaks in the line, never zeros (Spec, Section 9).
export function TrendChart({ series }: { series: TrendSeries }) {
  const withReading = series.points.filter((p) => p.value !== null).length;
  const total = series.points.length;
  const domain = trendDomain(series);

  if (domain === null) {
    return (
      <div className="space-y-2">
        <p className="text-sm">No readings in the last {total} days.</p>
      </div>
    );
  }

  const rows = toTrendRows(series);
  const summary = `${series.name}: ${withReading} of ${total} days have a reading. Breaks in the line mark days with no reading.`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <ProvenanceBadge source={series.provenance} />
        <span className="text-xs text-text-secondary">
          {withReading} of {total} days with a reading
        </span>
      </div>

      <div role="img" aria-label={summary} className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 11 }} interval="preserveStartEnd" stroke={GRID} />
            <YAxis
              domain={domain}
              tick={{ fill: AXIS, fontSize: 11 }}
              width={48}
              unit={series.unit.startsWith('/') ? '' : ` ${series.unit}`}
              stroke={GRID}
            />
            <Tooltip />
            {series.baseline ? (
              <>
                <Area
                  dataKey="bandBase"
                  stackId="baseline"
                  stroke="none"
                  fill="transparent"
                  isAnimationActive={false}
                  legendType="none"
                  name="baseline base"
                />
                <Area
                  dataKey="bandSize"
                  stackId="baseline"
                  stroke="none"
                  fill={BAND}
                  isAnimationActive={false}
                  legendType="none"
                  name="baseline band"
                />
              </>
            ) : null}
            <Line
              type="monotone"
              dataKey="value"
              name={series.name}
              stroke={LINE}
              strokeWidth={2}
              connectNulls={false}
              dot={{ r: 2, fill: LINE, stroke: LINE }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-text-secondary">
        {series.baseline
          ? `Shaded band: baseline range ${series.baseline.low} to ${series.baseline.high} ${series.unit}. It is a reference range, not a clinical threshold.`
          : 'No baseline range supplied for this indicator.'}
      </p>
    </div>
  );
}
