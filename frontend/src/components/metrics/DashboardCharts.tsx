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

function formatOps(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(Math.round(v));
}

export default function DashboardCharts() {
  const [range, setRange] = useState<MetricTimeRange>('1h');
  const refetch = REFETCH_INTERVALS[range];

  const { data: storageData } = useQuery({
    queryKey: ['metrics', 'storage', range],
    queryFn: () => getMetrics(['pool.allocated', 'pool.free'], range),
    refetchInterval: refetch,
  });

  const { data: ioOpsData } = useQuery({
    queryKey: ['metrics', 'io-ops', range],
    queryFn: () => getMetrics(['pool.read_ops', 'pool.write_ops'], range),
    refetchInterval: refetch,
  });

  const { data: ioBwData } = useQuery({
    queryKey: ['metrics', 'io-bw', range],
    queryFn: () => getMetrics(['pool.read_bw', 'pool.write_bw'], range),
    refetchInterval: refetch,
  });

  const { data: cpuData } = useQuery({
    queryKey: ['metrics', 'cpu', range],
    queryFn: () => getMetrics(['system.cpu_percent'], range),
    refetchInterval: refetch,
  });

  const { data: memData } = useQuery({
    queryKey: ['metrics', 'memory', range],
    queryFn: () => getMetrics(['system.memory_percent'], range),
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
          title="Pool I/O Operations"
          series={ioOpsData?.series ?? []}
          range={range}
          yAxisFormatter={(v) => `${formatOps(v)}/s`}
          tooltipFormatter={(v) => `${formatOps(v)} ops/s`}
        />
        <MetricChart
          title="Pool I/O Bandwidth"
          series={ioBwData?.series ?? []}
          range={range}
          yAxisFormatter={(v) => `${formatBytes(v, 1)}/s`}
          tooltipFormatter={(v) => `${formatBytes(v)}/s`}
        />
        <MetricChart
          title="CPU Usage"
          series={cpuData?.series ?? []}
          range={range}
          yAxisFormatter={(v) => `${v}%`}
          tooltipFormatter={(v) => `${v.toFixed(1)}%`}
        />
        <MetricChart
          title="Memory Usage"
          series={memData?.series ?? []}
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
