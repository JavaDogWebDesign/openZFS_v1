import { Link } from 'react-router-dom';
import type { Pool } from '../../types';
import { formatBytes, healthColor } from '../../utils/format';

interface PoolListProps {
  pools: Pool[];
  onScrub: (name: string) => void;
  onDestroy: (name: string) => void;
}

export default function PoolList({ pools, onScrub, onDestroy }: PoolListProps) {
  if (pools.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        No pools found. Create one to get started.
      </div>
    );
  }

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
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {pools.map((pool) => (
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
              <td className="px-4 py-3 text-right text-sm">
                <button
                  onClick={() => onScrub(pool.name)}
                  className="mr-2 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-900"
                >
                  Scrub
                </button>
                <button
                  onClick={() => onDestroy(pool.name)}
                  className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900"
                >
                  Destroy
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
