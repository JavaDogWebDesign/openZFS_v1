import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from '@headlessui/react';
import { EllipsisVerticalIcon, PlusIcon } from '@heroicons/react/24/outline';
import {
  listAllSnapshots,
  listDatasets,
  createSnapshot,
  destroySnapshot,
  rollbackSnapshot,
  cloneSnapshot,
  renameSnapshot,
} from '../api/datasets';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { formatBytes } from '../utils/format';

type DialogMode = null | 'create' | 'clone' | 'rename' | 'rollback' | 'destroy';

export default function SnapshotsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const datasetFilter = searchParams.get('dataset') || '';
  const queryClient = useQueryClient();

  // Dialog state
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedSnap, setSelectedSnap] = useState<{ dataset: string; name: string } | null>(null);

  // Create snapshot form
  const [createDataset, setCreateDataset] = useState('');
  const [createName, setCreateName] = useState('');

  // Clone form
  const [cloneTarget, setCloneTarget] = useState('');

  // Rename form
  const [renameName, setRenameName] = useState('');

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ['all-snapshots', datasetFilter],
    queryFn: () => listAllSnapshots(datasetFilter || undefined),
  });

  const { data: datasets = [] } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => listDatasets(),
  });

  const datasetNames = useMemo(
    () => [...new Set(snapshots.map((s) => s.dataset))].sort(),
    [snapshots]
  );

  const allDatasetNames = useMemo(
    () => datasets.filter((d) => d.type === 'filesystem').map((d) => d.name).sort(),
    [datasets]
  );

  const setFilter = (dataset: string) => {
    if (dataset) {
      setSearchParams({ dataset });
    } else {
      setSearchParams({});
    }
  };

  const createMutation = useMutation({
    mutationFn: ({ dataset, name }: { dataset: string; name: string }) => createSnapshot(dataset, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-snapshots'] });
      closeDialog();
    },
  });

  const destroyMutation = useMutation({
    mutationFn: ({ dataset, snap }: { dataset: string; snap: string }) => destroySnapshot(dataset, snap),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-snapshots'] });
      closeDialog();
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: ({ dataset, snap }: { dataset: string; snap: string }) => rollbackSnapshot(dataset, snap),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-snapshots', 'datasets'] });
      closeDialog();
    },
  });

  const cloneMutation = useMutation({
    mutationFn: ({ dataset, snap, target }: { dataset: string; snap: string; target: string }) =>
      cloneSnapshot(dataset, snap, target),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      closeDialog();
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ dataset, snap, newName }: { dataset: string; snap: string; newName: string }) =>
      renameSnapshot(dataset, snap, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-snapshots'] });
      closeDialog();
    },
  });

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedSnap(null);
    setCreateDataset('');
    setCreateName('');
    setCloneTarget('');
    setRenameName('');
  };

  const openCreate = () => {
    setCreateDataset(datasetFilter || allDatasetNames[0] || '');
    setCreateName('');
    setDialogMode('create');
  };

  const openClone = (dataset: string, name: string) => {
    setSelectedSnap({ dataset, name });
    setCloneTarget('');
    setDialogMode('clone');
  };

  const openRename = (dataset: string, name: string) => {
    setSelectedSnap({ dataset, name });
    setRenameName(name);
    setDialogMode('rename');
  };

  const openRollback = (dataset: string, name: string) => {
    setSelectedSnap({ dataset, name });
    setDialogMode('rollback');
  };

  const openDestroy = (dataset: string, name: string) => {
    setSelectedSnap({ dataset, name });
    setDialogMode('destroy');
  };

  const formatCreation = (creation: string) => {
    const ts = parseInt(creation, 10);
    if (isNaN(ts)) return creation;
    return new Date(ts * 1000).toLocaleString();
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Snapshots</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4" />
          Create Snapshot
        </button>
      </div>

      {/* Dataset filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('')}
          className={`rounded-md px-3 py-1 text-sm ${
            !datasetFilter
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          All
        </button>
        {(datasetFilter && !allDatasetNames.includes(datasetFilter)
          ? [datasetFilter, ...allDatasetNames]
          : allDatasetNames
        ).map((name) => (
          <button
            key={name}
            onClick={() => setFilter(name)}
            className={`rounded-md px-3 py-1 text-sm ${
              datasetFilter === name
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Snapshot table */}
      {snapshots.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          No snapshots found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Dataset</th>
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
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{snap.dataset}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{formatBytes(snap.used)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{formatBytes(snap.referenced)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatCreation(snap.creation)}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <Menu as="div" className="relative inline-block text-left">
                      <MenuButton className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <EllipsisVerticalIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      </MenuButton>
                      <MenuItems className="absolute right-0 z-10 mt-1 w-36 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none dark:bg-gray-800 dark:ring-gray-700">
                        <div className="py-1">
                          <MenuItem>
                            <button
                              onClick={() => openClone(snap.dataset, snap.name)}
                              className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-[focus]:bg-gray-100 dark:text-gray-300 dark:data-[focus]:bg-gray-700"
                            >
                              Clone
                            </button>
                          </MenuItem>
                          <MenuItem>
                            <button
                              onClick={() => openRollback(snap.dataset, snap.name)}
                              className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-[focus]:bg-gray-100 dark:text-gray-300 dark:data-[focus]:bg-gray-700"
                            >
                              Rollback
                            </button>
                          </MenuItem>
                          <MenuItem>
                            <button
                              onClick={() => openRename(snap.dataset, snap.name)}
                              className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-[focus]:bg-gray-100 dark:text-gray-300 dark:data-[focus]:bg-gray-700"
                            >
                              Rename
                            </button>
                          </MenuItem>
                          <MenuItem>
                            <button
                              onClick={() => openDestroy(snap.dataset, snap.name)}
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Snapshot Dialog */}
      <Dialog open={dialogMode === 'create'} onClose={closeDialog} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create Snapshot</DialogTitle>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dataset</label>
                <select
                  value={createDataset}
                  onChange={(e) => setCreateDataset(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  {allDatasetNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Snapshot Name</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. daily-backup"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={closeDialog} className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
              <button
                onClick={() => createMutation.mutate({ dataset: createDataset, name: createName })}
                disabled={!createDataset || !createName || createMutation.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Clone Dialog */}
      <Dialog open={dialogMode === 'clone'} onClose={closeDialog} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Clone Snapshot</DialogTitle>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Clone {selectedSnap?.dataset}@{selectedSnap?.name}
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Target Path</label>
              <input
                type="text"
                value={cloneTarget}
                onChange={(e) => setCloneTarget(e.target.value)}
                placeholder="e.g. pool/clone-name"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={closeDialog} className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
              <button
                onClick={() => selectedSnap && cloneMutation.mutate({ dataset: selectedSnap.dataset, snap: selectedSnap.name, target: cloneTarget })}
                disabled={!cloneTarget || cloneMutation.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {cloneMutation.isPending ? 'Cloning...' : 'Clone'}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={dialogMode === 'rename'} onClose={closeDialog} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Rename Snapshot</DialogTitle>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Rename {selectedSnap?.dataset}@{selectedSnap?.name}
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Name</label>
              <input
                type="text"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={closeDialog} className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
              <button
                onClick={() => selectedSnap && renameMutation.mutate({ dataset: selectedSnap.dataset, snap: selectedSnap.name, newName: renameName })}
                disabled={!renameName || renameName === selectedSnap?.name || renameMutation.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {renameMutation.isPending ? 'Renaming...' : 'Rename'}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Rollback Confirm Dialog */}
      <ConfirmDialog
        open={dialogMode === 'rollback'}
        title="Rollback Snapshot"
        message={`Are you sure you want to rollback to "${selectedSnap?.dataset}@${selectedSnap?.name}"? This will discard all changes made after this snapshot.`}
        confirmLabel="Rollback"
        onConfirm={() => selectedSnap && rollbackMutation.mutate({ dataset: selectedSnap.dataset, snap: selectedSnap.name })}
        onCancel={closeDialog}
      />

      {/* Destroy Confirm Dialog */}
      <ConfirmDialog
        open={dialogMode === 'destroy'}
        title="Destroy Snapshot"
        message={`Are you sure you want to destroy "${selectedSnap?.dataset}@${selectedSnap?.name}"? This action cannot be undone.`}
        confirmLabel="Destroy"
        onConfirm={() => selectedSnap && destroyMutation.mutate({ dataset: selectedSnap.dataset, snap: selectedSnap.name })}
        onCancel={closeDialog}
      />
    </div>
  );
}
