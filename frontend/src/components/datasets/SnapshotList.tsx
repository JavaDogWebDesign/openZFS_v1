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
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500">
        No snapshots.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Used</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Referenced</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {snapshots.map((snap) => (
            <tr key={snap.full_name} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{snap.name}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{formatBytes(snap.used)}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{formatBytes(snap.referenced)}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{snap.creation}</td>
              <td className="px-4 py-3 text-right text-sm">
                <button
                  onClick={() => onClone(snap.dataset, snap.name)}
                  className="mr-2 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  Clone
                </button>
                <button
                  onClick={() => onRollback(snap.dataset, snap.name)}
                  className="mr-2 rounded bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-100"
                >
                  Rollback
                </button>
                <button
                  onClick={() => onDestroy(snap.dataset, snap.name)}
                  className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
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
