import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPool, listPools } from '../api/pools';
import DiskUsageChart from '../components/pools/DiskUsageChart';
import { healthColor } from '../utils/format';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function PoolDetailPage() {
  const { name } = useParams<{ name: string }>();
  const { data: detail, isLoading } = useQuery({
    queryKey: ['pool', name],
    queryFn: () => getPool(name!),
    enabled: !!name,
  });
  const { data: pools = [] } = useQuery({ queryKey: ['pools'], queryFn: listPools });
  const poolSummary = pools.find((p) => p.name === name);

  if (isLoading) {
    return <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  if (!detail) {
    return <div className="p-8 text-center text-gray-500">Pool not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/pools" className="rounded-md p-1 hover:bg-gray-100">
          <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
        </Link>
        <h2 className="text-xl font-bold text-gray-900">{detail.name}</h2>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${healthColor(detail.state)}`}>
          {detail.state}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {poolSummary && (
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="mb-3 font-semibold text-gray-900">Disk Usage</h3>
            <DiskUsageChart pool={poolSummary} />
          </div>
        )}

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="mb-3 font-semibold text-gray-900">Pool Info</h3>
          <dl className="space-y-2">
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Status</dt>
              <dd className="font-medium">{detail.status || 'None'}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Scan</dt>
              <dd className="font-medium">{detail.scan || 'None'}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Errors</dt>
              <dd className="font-medium">{detail.errors || 'None'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-gray-900">VDEV Configuration</h3>
        {detail.config.length === 0 ? (
          <p className="text-sm text-gray-500">No configuration data</p>
        ) : (
          <div className="space-y-3">
            {detail.config.map((vdev, i) => (
              <div key={i} className="rounded-md border border-gray-100 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{vdev.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${healthColor(vdev.state)}`}>
                    {vdev.state}
                  </span>
                </div>
                {vdev.children && vdev.children.length > 0 && (
                  <div className="mt-2 ml-4 space-y-1">
                    {vdev.children.map((child, j) => (
                      <div key={j} className="flex items-center gap-2 text-sm">
                        <span className="text-gray-700">{child.name}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-xs ${healthColor(child.state)}`}>
                          {child.state}
                        </span>
                        <span className="text-xs text-gray-400">
                          R:{child.read} W:{child.write} C:{child.checksum}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
