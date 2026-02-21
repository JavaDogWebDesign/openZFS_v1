import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listDatasets, createDataset, destroyDataset } from '../api/datasets';
import DatasetList from '../components/datasets/DatasetList';
import DatasetCreateForm from '../components/datasets/DatasetCreateForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function DatasetsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDestroy, setConfirmDestroy] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: datasets = [], isLoading } = useQuery({ queryKey: ['datasets'], queryFn: () => listDatasets() });

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

  const handleSnapshot = (datasetName: string) => {
    navigate(`/snapshots?dataset=${encodeURIComponent(datasetName)}`);
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
