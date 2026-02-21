import type { Snapshot } from '../../types';
import { formatBytes } from '../../utils/format';

interface SnapshotListProps {
  snapshots: Snapshot[];
  onRollback: (dataset: string, snap: string) => void;
  onDestroy: (dataset: string, snap: string) => void;
  onClone: (dataset: string, snap: string) => void;
}

export default function SnapshotList({ snapshots, onRollback, onDestroy, onClone }: SnapshotListProps) {
  if (snapshots.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        No snapshots.
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
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Referenced</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Created</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {snapshots.map((snap) => (
            <tr key={snap.full_name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{snap.name}</td>
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{formatBytes(snap.used)}</td>
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{formatBytes(snap.referenced)}</td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{snap.creation}</td>
              <td className="px-4 py-3 text-right text-sm">
                <button
                  onClick={() => onClone(snap.dataset, snap.name)}
                  className="mr-2 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-900"
                >
                  Clone
                </button>
                <button
                  onClick={() => onRollback(snap.dataset, snap.name)}
                  className="mr-2 rounded bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-400 dark:hover:bg-yellow-900"
                >
                  Rollback
                </button>
                <button
                  onClick={() => onDestroy(snap.dataset, snap.name)}
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
