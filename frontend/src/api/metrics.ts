import client from './client';
import type { MetricsQueryResponse, MetricTimeRange } from '../types';

export async function getMetrics(
  metricNames: string[],
  range: MetricTimeRange,
  pool?: string,
): Promise<MetricsQueryResponse> {
  const params: Record<string, string> = {
    metric_names: metricNames.join(','),
    range,
  };
  if (pool) params.pool = pool;
  const res = await client.get<MetricsQueryResponse>('/metrics', { params });
  return res.data;
}
