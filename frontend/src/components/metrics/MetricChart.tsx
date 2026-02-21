import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { MetricSeries, MetricTimeRange } from '../../types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface MetricChartProps {
  series: MetricSeries[];
  title: string;
  range: MetricTimeRange;
  yAxisFormatter?: (value: number) => string;
  tooltipFormatter?: (value: number) => string;
  height?: number;
}

function seriesLabel(s: MetricSeries): string {
  const short = s.metric_name.split('.').pop() || s.metric_name;
  return s.tags ? `${s.tags} ${short}` : short;
}

function formatTimestamp(ts: number, range: MetricTimeRange): string {
  const d = new Date(ts * 1000);
  if (range === '7d') {
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function MetricChart({
  series,
  title,
  range,
  yAxisFormatter,
  tooltipFormatter,
  height = 220,
}: MetricChartProps) {
  if (!series.length || series.every((s) => s.data.length === 0)) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
        <div
          className="flex items-center justify-center text-sm text-gray-400 dark:text-gray-500"
          style={{ height }}
        >
          Collecting data...
        </div>
      </div>
    );
  }

  // Build labels for each series
  const labels = series.map((s) => seriesLabel(s));

  // Merge all series into flat rows keyed by timestamp
  const tsMap = new Map<number, Record<string, number>>();
  series.forEach((s, i) => {
    const label = labels[i];
    for (const pt of s.data) {
      const row = tsMap.get(pt.timestamp) || { timestamp: pt.timestamp };
      row[label] = pt.value;
      tsMap.set(pt.timestamp, row);
    }
  });
  const data = Array.from(tsMap.values()).sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid, #e5e7eb)" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(ts: number) => formatTimestamp(ts, range)}
            tick={{ fontSize: 11 }}
            stroke="#9ca3af"
          />
          <YAxis
            tickFormatter={yAxisFormatter}
            tick={{ fontSize: 11 }}
            stroke="#9ca3af"
            width={60}
          />
          <Tooltip
            labelFormatter={(ts: number) => new Date(ts * 1000).toLocaleString()}
            formatter={(value: number) =>
              tooltipFormatter ? tooltipFormatter(value) : value.toLocaleString()
            }
            contentStyle={{
              backgroundColor: 'var(--color-chart-bg)',
              color: 'var(--color-chart-text)',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '12px',
            }}
          />
          {labels.length > 1 && <Legend wrapperStyle={{ fontSize: '12px' }} />}
          {labels.map((label, i) => (
            <Area
              key={label}
              type="monotone"
              dataKey={label}
              stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={0.1}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
