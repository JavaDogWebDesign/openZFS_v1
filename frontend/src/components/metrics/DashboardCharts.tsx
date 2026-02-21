import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMetrics } from '../../api/metrics';
import { formatBytes } from '../../utils/format';
import type { MetricTimeRange } from '../../types';
import TimeRangeSelector from './TimeRangeSelector';
import MetricChart from './MetricChart';

const REFETCH_INTERVALS: Record<MetricTimeRange, number> = {
  '1m': 10_000,
  '5m': 30_000,
  '15m': 30_000,
  '30m': 30_000,
  '1h': 30_000,
  '24h': 60_000,
  '7d': 60_000,
};

export default function DashboardCharts() {
  const [range, setRange] = useState<MetricTimeRange>('1h');
  const refetch = REFETCH_INTERVALS[range];

  const { data: storageData } = useQuery({
    queryKey: ['metrics', 'storage', range],
    queryFn: () => getMetrics(['pool.allocated', 'pool.free'], range),
    refetchInterval: refetch,
  });

  const { data: cpuMemData } = useQuery({
    queryKey: ['metrics', 'cpumem', range],
    queryFn: () => getMetrics(['system.cpu_percent', 'system.memory_percent'], range),
    refetchInterval: refetch,
  });

  const { data: networkData } = useQuery({
    queryKey: ['metrics', 'network', range],
    queryFn: () => getMetrics(['system.net_bytes_recv', 'system.net_bytes_sent'], range),
    refetchInterval: refetch,
  });

  const { data: healthData } = useQuery({
    queryKey: ['metrics', 'health', range],
    queryFn: () => getMetrics(['pool.fragmentation', 'pool.capacity', 'pool.dedupratio'], range),
    refetchInterval: refetch,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Historical Metrics</h3>
        <TimeRangeSelector value={range} onChange={setRange} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MetricChart
          title="Pool Storage"
          series={storageData?.series ?? []}
          range={range}
          yAxisFormatter={(v) => formatBytes(v, 1)}
          tooltipFormatter={(v) => formatBytes(v)}
        />
        <MetricChart
          title="CPU & Memory"
          series={cpuMemData?.series ?? []}
          range={range}
          yAxisFormatter={(v) => `${v}%`}
          tooltipFormatter={(v) => `${v.toFixed(1)}%`}
        />
        <MetricChart
          title="Network I/O"
          series={networkData?.series ?? []}
          range={range}
          yAxisFormatter={(v) => formatBytes(v, 1)}
          tooltipFormatter={(v) => formatBytes(v)}
        />
        <MetricChart
          title="Pool Health"
          series={healthData?.series ?? []}
          range={range}
          yAxisFormatter={(v) => String(v)}
          tooltipFormatter={(v) => v.toFixed(2)}
        />
      </div>
    </div>
  );
}
