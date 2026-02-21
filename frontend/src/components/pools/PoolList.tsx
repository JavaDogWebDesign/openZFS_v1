import { Link } from 'react-router-dom';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import type { Pool, ScrubSchedule } from '../../types';
import { formatBytes, healthColor, formatScrubSchedule, formatRelativeTime } from '../../utils/format';

interface PoolListProps {
  pools: Pool[];
  scrubSchedules: ScrubSchedule[];
  onScrub: (name: string) => void;
  onCancelScrub: (name: string) => void;
  onDestroy: (name: string) => void;
}

export default function PoolList({ pools, scrubSchedules, onScrub, onCancelScrub, onDestroy }: PoolListProps) {
  if (pools.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        No pools found. Create one to get started.
      </div>
    );
  }

  const getScheduleForPool = (poolName: string) =>
    scrubSchedules.find((s) => s.pool === poolName && s.enabled);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Size</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Used</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Free</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Health</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Frag</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Scrub</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {pools.map((pool) => {
            const schedule = getScheduleForPool(pool.name);
            return (
              <tr key={pool.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 text-sm font-medium">
                  <Link to={`/pools/${pool.name}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                    {pool.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{formatBytes(pool.size)}</td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{formatBytes(pool.allocated)}</td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{formatBytes(pool.free)}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${healthColor(pool.health)}`}>
                    {pool.health}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{pool.fragmentation}%</td>
                <td className="px-4 py-3 text-sm">
                  {schedule ? (
                    <div>
                      <span className="text-gray-900 dark:text-gray-100">{formatScrubSchedule(schedule)}</span>
                      {schedule.last_run && (
                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                          (ran {formatRelativeTime(schedule.last_run)})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">Not scheduled</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <Menu as="div" className="relative inline-block text-left">
                    <MenuButton className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <EllipsisVerticalIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </MenuButton>
                    <MenuItems className="absolute right-0 z-10 mt-1 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none dark:bg-gray-800 dark:ring-gray-700">
                      <div className="py-1">
                        <MenuItem>
                          <button
                            onClick={() => onScrub(pool.name)}
                            className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-[focus]:bg-gray-100 dark:text-gray-300 dark:data-[focus]:bg-gray-700"
                          >
                            Scrub Now
                          </button>
                        </MenuItem>
                        <MenuItem>
                          <button
                            onClick={() => onCancelScrub(pool.name)}
                            className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-[focus]:bg-gray-100 dark:text-gray-300 dark:data-[focus]:bg-gray-700"
                          >
                            Cancel Scrub
                          </button>
                        </MenuItem>
                        <MenuItem>
                          <Link
                            to={`/pools/${pool.name}`}
                            className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-[focus]:bg-gray-100 dark:text-gray-300 dark:data-[focus]:bg-gray-700"
                          >
                            View Details
                          </Link>
                        </MenuItem>
                        <MenuItem>
                          <button
                            onClick={() => onDestroy(pool.name)}
                            className="block w-full px-4 py-2 text-left text-sm text-red-600 data-[focus]:bg-gray-100 dark:text-red-400 dark:data-[focus]:bg-gray-700"
                          >
                            Destroy
                          </button>
                        </MenuItem>
                      </div>
                    </MenuItems>
                  </Menu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
