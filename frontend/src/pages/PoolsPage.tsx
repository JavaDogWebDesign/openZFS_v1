import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listPools, createPool, destroyPool, scrubPool, listDisks } from '../api/pools';
import PoolList from '../components/pools/PoolList';
import PoolCreateForm from '../components/pools/PoolCreateForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import type { PoolCreateRequest } from '../types';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function PoolsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDestroy, setConfirmDestroy] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: pools = [], isLoading } = useQuery({ queryKey: ['pools'], queryFn: listPools });
  const { data: disks = [] } = useQuery({ queryKey: ['disks'], queryFn: listDisks, enabled: showCreate });

  const createMutation = useMutation({
    mutationFn: (data: PoolCreateRequest) => createPool(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pools'] });
      setShowCreate(false);
    },
  });

  const destroyMutation = useMutation({
    mutationFn: destroyPool,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pools'] });
      setConfirmDestroy(null);
    },
  });

  const scrubMutation = useMutation({ mutationFn: scrubPool });

  if (isLoading) {
    return <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">ZFS Pools</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4" />
          Create Pool
        </button>
      </div>

      {showCreate && (
        <PoolCreateForm
          disks={disks}
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowCreate(false)}
          isSubmitting={createMutation.isPending}
        />
      )}

      <PoolList
        pools={pools}
        onScrub={(name) => scrubMutation.mutate(name)}
        onDestroy={(name) => setConfirmDestroy(name)}
      />

      <ConfirmDialog
        open={confirmDestroy !== null}
        title="Destroy Pool"
        message={`Are you sure you want to destroy pool "${confirmDestroy}"? This will permanently delete all data.`}
        confirmLabel="Destroy"
        onConfirm={() => confirmDestroy && destroyMutation.mutate(confirmDestroy)}
        onCancel={() => setConfirmDestroy(null)}
      />
    </div>
  );
}
