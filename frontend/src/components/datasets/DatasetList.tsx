import { Link } from 'react-router-dom';
import type { Dataset } from '../../types';
import { formatBytes } from '../../utils/format';

interface DatasetListProps {
  datasets: Dataset[];
  onDestroy: (name: string) => void;
  onSnapshot: (name: string) => void;
}

export default function DatasetList({ datasets, onDestroy, onSnapshot }: DatasetListProps) {
  if (datasets.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        No datasets found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Used</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Available</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Mountpoint</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Type</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {datasets.map((ds) => (
            <tr key={ds.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-4 py-3 text-sm font-medium">
                <Link to={`/datasets/${encodeURIComponent(ds.name)}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                  {ds.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{formatBytes(ds.used)}</td>
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{formatBytes(ds.available)}</td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{ds.mountpoint}</td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{ds.type}</td>
              <td className="px-4 py-3 text-right text-sm">
                <button
                  onClick={() => onSnapshot(ds.name)}
                  className="mr-2 rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 dark:bg-green-900/50 dark:text-green-400 dark:hover:bg-green-900"
                >
                  Snapshot
                </button>
                <button
                  onClick={() => onDestroy(ds.name)}
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
