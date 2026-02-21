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
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
        No datasets found.
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
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Available</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Mountpoint</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {datasets.map((ds) => (
            <tr key={ds.name} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium">
                <Link to={`/datasets/${encodeURIComponent(ds.name)}`} className="text-blue-600 hover:text-blue-800">
                  {ds.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">{formatBytes(ds.used)}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{formatBytes(ds.available)}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{ds.mountpoint}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{ds.type}</td>
              <td className="px-4 py-3 text-right text-sm">
                <button
                  onClick={() => onSnapshot(ds.name)}
                  className="mr-2 rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                >
                  Snapshot
                </button>
                <button
                  onClick={() => onDestroy(ds.name)}
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
