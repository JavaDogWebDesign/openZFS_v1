import { useQuery } from '@tanstack/react-query';
import { listPools } from '../api/pools';
import { listDatasets } from '../api/datasets';
import { formatBytes, healthColor } from '../utils/format';
import {
  CircleStackIcon,
  FolderIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const { data: pools = [] } = useQuery({ queryKey: ['pools'], queryFn: listPools });
  const { data: datasets = [] } = useQuery({ queryKey: ['datasets'], queryFn: () => listDatasets() });

  const totalSize = pools.reduce((sum, p) => sum + p.size, 0);
  const totalUsed = pools.reduce((sum, p) => sum + p.allocated, 0);
  const healthyPools = pools.filter((p) => p.health === 'ONLINE').length;
  const unhealthyPools = pools.length - healthyPools;

  const stats = [
    {
      label: 'Total Pools',
      value: pools.length,
      icon: CircleStackIcon,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Total Datasets',
      value: datasets.length,
      icon: FolderIcon,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: 'Healthy',
      value: healthyPools,
      icon: CheckCircleIcon,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Degraded/Faulted',
      value: unhealthyPools,
      icon: ExclamationTriangleIcon,
      color: unhealthyPools > 0 ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-50',
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="mb-3 font-semibold text-gray-900">Storage Overview</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Capacity</span>
              <span className="font-medium">{formatBytes(totalSize)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Used</span>
              <span className="font-medium">{formatBytes(totalUsed)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Free</span>
              <span className="font-medium">{formatBytes(totalSize - totalUsed)}</span>
            </div>
            {totalSize > 0 && (
              <div className="pt-2">
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${(totalUsed / totalSize) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-xs text-gray-500">
                  {((totalUsed / totalSize) * 100).toFixed(1)}% used
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="mb-3 font-semibold text-gray-900">Pool Health</h3>
          {pools.length === 0 ? (
            <p className="text-sm text-gray-500">No pools configured</p>
          ) : (
            <div className="space-y-2">
              {pools.map((pool) => (
                <div key={pool.name} className="flex items-center justify-between rounded-md border border-gray-100 p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{pool.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(pool.allocated)} / {formatBytes(pool.size)}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${healthColor(pool.health)}`}>
                    {pool.health}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
