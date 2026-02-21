import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listSMBShares, createSMBShare, updateSMBShare, deleteSMBShare, reloadSMB, listNFSExports, createNFSExport, deleteNFSExport, reloadNFS } from '../api/shares';
import ShareList from '../components/shares/ShareList';
import SMBShareForm from '../components/shares/SMBShareForm';
import NFSExportForm from '../components/shares/NFSExportForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import type { SMBShare, SMBShareCreateRequest } from '../types';

export default function SharesPage() {
  const [activeTab, setActiveTab] = useState<'smb' | 'nfs'>('smb');
  const [showCreate, setShowCreate] = useState(false);
  const [editingShare, setEditingShare] = useState<SMBShare | null>(null);
  const [confirmDeleteSmb, setConfirmDeleteSmb] = useState<string | null>(null);
  const [confirmDeleteNfs, setConfirmDeleteNfs] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: smbShares = [] } = useQuery({ queryKey: ['smb-shares'], queryFn: listSMBShares });
  const { data: nfsExports = [] } = useQuery({ queryKey: ['nfs-exports'], queryFn: listNFSExports });

  const createSmbMutation = useMutation({
    mutationFn: createSMBShare,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smb-shares'] });
      setShowCreate(false);
    },
  });

  const updateSmbMutation = useMutation({
    mutationFn: ({ name, data }: { name: string; data: Partial<SMBShare> }) => updateSMBShare(name, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smb-shares'] });
      setEditingShare(null);
    },
  });

  const deleteSmbMutation = useMutation({
    mutationFn: deleteSMBShare,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smb-shares'] });
      setConfirmDeleteSmb(null);
    },
  });

  const createNfsMutation = useMutation({
    mutationFn: createNFSExport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfs-exports'] });
      setShowCreate(false);
    },
  });

  const deleteNfsMutation = useMutation({
    mutationFn: deleteNFSExport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfs-exports'] });
      setConfirmDeleteNfs(null);
    },
  });

  const reloadSmbMutation = useMutation({ mutationFn: reloadSMB });
  const reloadNfsMutation = useMutation({ mutationFn: reloadNFS });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">File Shares</h2>
        <div className="flex gap-2">
          <button
            onClick={() => activeTab === 'smb' ? reloadSmbMutation.mutate() : reloadNfsMutation.mutate()}
            className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Reload {activeTab === 'smb' ? 'Samba' : 'NFS'}
          </button>
          <button
            onClick={() => { setShowCreate(!showCreate); setEditingShare(null); }}
            className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4" />
            Create {activeTab === 'smb' ? 'SMB Share' : 'NFS Export'}
          </button>
        </div>
      </div>

      {showCreate && activeTab === 'smb' && (
        <SMBShareForm
          onSubmit={(data) => createSmbMutation.mutate(data as SMBShareCreateRequest)}
          onCancel={() => setShowCreate(false)}
          isSubmitting={createSmbMutation.isPending}
        />
      )}

      {editingShare && activeTab === 'smb' && (
        <SMBShareForm
          initialData={editingShare}
          onSubmit={(data) => updateSmbMutation.mutate({ name: editingShare.name, data })}
          onCancel={() => setEditingShare(null)}
          isSubmitting={updateSmbMutation.isPending}
        />
      )}

      {showCreate && activeTab === 'nfs' && (
        <NFSExportForm
          onSubmit={(data) => createNfsMutation.mutate(data)}
          onCancel={() => setShowCreate(false)}
          isSubmitting={createNfsMutation.isPending}
        />
      )}

      <ShareList
        smbShares={smbShares}
        nfsExports={nfsExports}
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setShowCreate(false); setEditingShare(null); }}
        onDeleteSmb={(name) => setConfirmDeleteSmb(name)}
        onDeleteNfs={(id) => setConfirmDeleteNfs(id)}
        onEditSmb={(share) => { setEditingShare(share); setShowCreate(false); }}
      />

      <ConfirmDialog
        open={confirmDeleteSmb !== null}
        title="Delete SMB Share"
        message={`Are you sure you want to delete share "${confirmDeleteSmb}"?`}
        confirmLabel="Delete"
        onConfirm={() => confirmDeleteSmb && deleteSmbMutation.mutate(confirmDeleteSmb)}
        onCancel={() => setConfirmDeleteSmb(null)}
      />

      <ConfirmDialog
        open={confirmDeleteNfs !== null}
        title="Delete NFS Export"
        message={`Are you sure you want to delete NFS export #${confirmDeleteNfs}?`}
        confirmLabel="Delete"
        onConfirm={() => confirmDeleteNfs && deleteNfsMutation.mutate(confirmDeleteNfs)}
        onCancel={() => setConfirmDeleteNfs(null)}
      />
    </div>
  );
}
