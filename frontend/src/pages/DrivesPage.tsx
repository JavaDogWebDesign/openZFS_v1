import { useQuery } from '@tanstack/react-query';
import { listDrives } from '../api/drives';
import { formatBytes, formatPowerOnHours } from '../utils/format';
import {
  CpuChipIcon,
  CheckCircleIcon,
  XCircleIcon,
  MinusCircleIcon,
} from '@heroicons/react/24/outline';
import type { DriveInfo } from '../types';

function SmartBadge({ drive }: { drive: DriveInfo }) {
  if (!drive.smart.available) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
        <MinusCircleIcon className="h-3.5 w-3.5" /> N/A
      </span>
    );
  }
  if (drive.smart.healthy) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-400">
        <CheckCircleIcon className="h-3.5 w-3.5" /> PASSED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/50 dark:text-red-400">
      <XCircleIcon className="h-3.5 w-3.5" /> FAILED
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    HDD: 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
    SSD: 'bg-purple-50 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400',
    NVMe: 'bg-orange-50 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[type] || colors.HDD}`}>
      {type}
    </span>
  );
}

export default function DrivesPage() {
  const { data: drives = [], isLoading } = useQuery({
    queryKey: ['drives'],
    queryFn: listDrives,
  });

  if (isLoading) {
    return <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  const healthyCount = drives.filter((d) => d.smart.available && d.smart.healthy).length;
  const hddCount = drives.filter((d) => d.type === 'HDD').length;
  const ssdCount = drives.filter((d) => d.type === 'SSD' || d.type === 'NVMe').length;

  const stats = [
    { label: 'Total Drives', value: drives.length, color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/50' },
    { label: 'Healthy', value: healthyCount, color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/50' },
    { label: 'HDD', value: hddCount, color: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700' },
    { label: 'SSD/NVMe', value: ssdCount, color: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CpuChipIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Drive Health</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {drives.map((drive) => (
          <div
            key={drive.name}
            className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">/dev/{drive.name}</span>
                <TypeBadge type={drive.type} />
              </div>
              <SmartBadge drive={drive} />
            </div>

            <div className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Model</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 truncate ml-2 max-w-[60%] text-right">{drive.model || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Size</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatBytes(drive.size)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Serial</span>
                <span className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate ml-2 max-w-[60%] text-right">{drive.serial || '-'}</span>
              </div>
              {drive.smart.temperature !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Temperature</span>
                  <span className={`font-medium ${drive.smart.temperature > 55 ? 'text-red-600 dark:text-red-400' : drive.smart.temperature > 45 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {drive.smart.temperature}&deg;C
                  </span>
                </div>
              )}
              {drive.smart.power_on_hours !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Power-On</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{formatPowerOnHours(drive.smart.power_on_hours)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Pool</span>
                <span className={`font-medium ${drive.pool ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  {drive.pool || 'None'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {drives.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          No drives detected.
        </div>
      )}
    </div>
  );
}
