import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPool, listPools, getPoolProperties, scrubPool, cancelScrub, trimPool, exportPool, destroyPool } from '../api/pools';
import DiskUsageChart from '../components/pools/DiskUsageChart';
import ScrubScheduleForm from '../components/pools/ScrubScheduleForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { healthColor } from '../utils/format';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function PoolDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDestroy, setConfirmDestroy] = useState(false);
  const [confirmExport, setConfirmExport] = useState(false);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['pool', name],
    queryFn: () => getPool(name!),
    enabled: !!name,
  });
  const { data: pools = [] } = useQuery({ queryKey: ['pools'], queryFn: listPools });
  const poolSummary = pools.find((p) => p.name === name);

  const { data: propsData } = useQuery({
    queryKey: ['pool-properties', name],
    queryFn: () => getPoolProperties(name!),
    enabled: !!name,
  });

  const scrubMutation = useMutation({
    mutationFn: () => scrubPool(name!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pool', name] }),
  });

  const cancelScrubMutation = useMutation({
    mutationFn: () => cancelScrub(name!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pool', name] }),
  });

  const trimMutation = useMutation({
    mutationFn: () => trimPool(name!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pool', name] }),
  });

  const exportMutation = useMutation({
    mutationFn: () => exportPool(name!),
    onSuccess: () => navigate('/pools'),
  });

  const destroyMutation = useMutation({
    mutationFn: () => destroyPool(name!),
    onSuccess: () => navigate('/pools'),
  });

  if (isLoading) {
    return <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  if (!detail) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Pool not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/pools" className="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeftIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </Link>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{detail.name}</h2>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${healthColor(detail.state)}`}>
          {detail.state}
        </span>
      </div>

      {/* Disk Usage + Pool Info */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {poolSummary && (
          <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Disk Usage</h3>
            <DiskUsageChart pool={poolSummary} />
          </div>
        )}

        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Pool Info</h3>
          <dl className="space-y-2">
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500 dark:text-gray-400">Status</dt>
              <dd className="font-medium dark:text-gray-200">{detail.status || 'None'}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500 dark:text-gray-400">Scan</dt>
              <dd className="font-medium dark:text-gray-200">{detail.scan || 'None'}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500 dark:text-gray-400">Errors</dt>
              <dd className="font-medium dark:text-gray-200">{detail.errors || 'None'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Device Tree */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Device Tree</h3>
        {detail.config.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No configuration data</p>
        ) : (
          <div className="space-y-3">
            {detail.config.map((vdev, i) => (
              <div key={i} className="rounded-md border border-gray-100 p-3 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{vdev.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${healthColor(vdev.state)}`}>
                    {vdev.state}
                  </span>
                </div>
                {vdev.children && vdev.children.length > 0 && (
                  <div className="mt-2 ml-4 space-y-1">
                    {vdev.children.map((child, j) => (
                      <div key={j} className="flex items-center gap-2 text-sm">
                        <span className="text-gray-700 dark:text-gray-300">{child.name}</span>
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

      {/* Scrub & Schedule */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Scrub & Schedule</h3>
        <div className="mb-4 flex gap-3">
          <button
            onClick={() => scrubMutation.mutate()}
            disabled={scrubMutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {scrubMutation.isPending ? 'Starting...' : 'Scrub Now'}
          </button>
          <button
            onClick={() => cancelScrubMutation.mutate()}
            disabled={cancelScrubMutation.isPending}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            {cancelScrubMutation.isPending ? 'Cancelling...' : 'Cancel Scrub'}
          </button>
        </div>
        {scrubMutation.isError && (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">{(scrubMutation.error as Error).message}</p>
        )}
        {cancelScrubMutation.isError && (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">{(cancelScrubMutation.error as Error).message}</p>
        )}
        <ScrubScheduleForm poolName={name!} />
      </div>

      {/* Trim */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Trim</h3>
        <button
          onClick={() => trimMutation.mutate()}
          disabled={trimMutation.isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {trimMutation.isPending ? 'Starting...' : 'Start Trim'}
        </button>
        {trimMutation.isSuccess && (
          <p className="mt-2 text-sm text-green-600 dark:text-green-400">Trim started successfully.</p>
        )}
        {trimMutation.isError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{(trimMutation.error as Error).message}</p>
        )}
      </div>

      {/* Pool Properties */}
      {propsData && propsData.properties.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Pool Properties</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Property</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Value</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {propsData.properties.map((prop) => (
                  <tr key={prop.property} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">{prop.property}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 break-all">{prop.value}</td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{prop.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feature Flags */}
      {propsData && propsData.features.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Feature Flags</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Feature Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {propsData.features.map((feat) => (
                  <tr key={feat.property} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {feat.property.replace('feature@', '')}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{feat.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="rounded-lg border border-red-200 bg-white p-5 dark:border-red-900 dark:bg-gray-800">
        <h3 className="mb-3 font-semibold text-red-600 dark:text-red-400">Danger Zone</h3>
        <div className="flex gap-3">
          <button
            onClick={() => setConfirmExport(true)}
            disabled={exportMutation.isPending}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            {exportMutation.isPending ? 'Exporting...' : 'Export Pool'}
          </button>
          <button
            onClick={() => setConfirmDestroy(true)}
            disabled={destroyMutation.isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {destroyMutation.isPending ? 'Destroying...' : 'Destroy Pool'}
          </button>
        </div>
        {exportMutation.isError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{(exportMutation.error as Error).message}</p>
        )}
        {destroyMutation.isError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{(destroyMutation.error as Error).message}</p>
        )}
      </div>

      <ConfirmDialog
        open={confirmExport}
        title="Export Pool"
        message={`Are you sure you want to export pool "${name}"? The pool will be removed from the system but can be imported again later.`}
        confirmLabel="Export"
        onConfirm={() => {
          exportMutation.mutate();
          setConfirmExport(false);
        }}
        onCancel={() => setConfirmExport(false)}
      />

      <ConfirmDialog
        open={confirmDestroy}
        title="Destroy Pool"
        message={`Are you sure you want to destroy pool "${name}"? This will permanently delete all data.`}
        confirmLabel="Destroy"
        onConfirm={() => {
          destroyMutation.mutate();
          setConfirmDestroy(false);
        }}
        onCancel={() => setConfirmDestroy(false)}
      />
    </div>
  );
}
