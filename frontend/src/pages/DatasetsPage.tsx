import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listDatasets, createDataset, destroyDataset, createSnapshot, listSnapshots, destroySnapshot, rollbackSnapshot, cloneSnapshot } from '../api/datasets';
import DatasetList from '../components/datasets/DatasetList';
import DatasetCreateForm from '../components/datasets/DatasetCreateForm';
import SnapshotList from '../components/datasets/SnapshotList';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function DatasetsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDestroy, setConfirmDestroy] = useState<string | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: datasets = [], isLoading } = useQuery({ queryKey: ['datasets'], queryFn: () => listDatasets() });
  const { data: snapshots = [] } = useQuery({
    queryKey: ['snapshots', selectedDataset],
    queryFn: () => listSnapshots(selectedDataset!),
    enabled: !!selectedDataset,
  });

  const createMutation = useMutation({
    mutationFn: ({ name, properties }: { name: string; properties: Record<string, string> }) =>
      createDataset({ name, properties }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      setShowCreate(false);
    },
  });

  const destroyMutation = useMutation({
    mutationFn: destroyDataset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      setConfirmDestroy(null);
    },
  });

  const snapshotMutation = useMutation({
    mutationFn: ({ dataset, name }: { dataset: string; name: string }) => createSnapshot(dataset, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['snapshots'] }),
  });

  const destroySnapMutation = useMutation({
    mutationFn: ({ dataset, snap }: { dataset: string; snap: string }) => destroySnapshot(dataset, snap),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['snapshots'] }),
  });

  const rollbackMutation = useMutation({
    mutationFn: ({ dataset, snap }: { dataset: string; snap: string }) => rollbackSnapshot(dataset, snap),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['datasets', 'snapshots'] }),
  });

  const cloneMutation = useMutation({
    mutationFn: ({ dataset, snap, target }: { dataset: string; snap: string; target: string }) =>
      cloneSnapshot(dataset, snap, target),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['datasets'] }),
  });

  const handleSnapshot = (datasetName: string) => {
    const name = prompt('Snapshot name:');
    if (name) snapshotMutation.mutate({ dataset: datasetName, name });
  };

  const handleClone = (dataset: string, snap: string) => {
    const target = prompt('Clone target (e.g., pool/clone-name):');
    if (target) cloneMutation.mutate({ dataset, snap, target });
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Datasets</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4" />
          Create Dataset
        </button>
      </div>

      {showCreate && (
        <DatasetCreateForm
          onSubmit={(name, properties) => createMutation.mutate({ name, properties })}
          onCancel={() => setShowCreate(false)}
          isSubmitting={createMutation.isPending}
        />
      )}

      <DatasetList
        datasets={datasets}
        onDestroy={(name) => setConfirmDestroy(name)}
        onSnapshot={handleSnapshot}
      />

      {datasets.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Snapshots</h3>
          <div className="flex flex-wrap gap-2">
            {datasets.filter((d) => d.type === 'filesystem').map((ds) => (
              <button
                key={ds.name}
                onClick={() => setSelectedDataset(ds.name)}
                className={`rounded-md px-3 py-1 text-sm ${
                  selectedDataset === ds.name
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {ds.name}
              </button>
            ))}
          </div>
          {selectedDataset && (
            <SnapshotList
              snapshots={snapshots}
              onRollback={(dataset, snap) => rollbackMutation.mutate({ dataset, snap })}
              onDestroy={(dataset, snap) => destroySnapMutation.mutate({ dataset, snap })}
              onClone={handleClone}
            />
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDestroy !== null}
        title="Destroy Dataset"
        message={`Are you sure you want to destroy "${confirmDestroy}"? This will permanently delete all data.`}
        confirmLabel="Destroy"
        onConfirm={() => confirmDestroy && destroyMutation.mutate(confirmDestroy)}
        onCancel={() => setConfirmDestroy(null)}
      />
    </div>
  );
}
