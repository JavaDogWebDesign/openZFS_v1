import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listUsers, createUser, deleteUser, setSmbPassword } from '../api/users';
import { listSMBShares, updateSMBShare } from '../api/shares';
import UserList from '../components/users/UserList';
import UserCreateForm from '../components/users/UserCreateForm';
import ShareAssignmentDialog from '../components/users/ShareAssignmentDialog';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { PlusIcon } from '@heroicons/react/24/outline';
import type { SMBShare } from '../types';

export default function UsersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [assignSharesUser, setAssignSharesUser] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: listUsers });
  const { data: smbShares = [] } = useQuery({ queryKey: ['smb-shares'], queryFn: listSMBShares });

  const [createError, setCreateError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: ({ username, password, groups }: { username: string; password: string; groups: string[] }) =>
      createUser({ username, password, groups }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreate(false);
      setCreateError(null);
    },
    onError: (err: any) => {
      setCreateError(err?.response?.data?.detail || err?.message || 'Failed to create user');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmDelete(null);
    },
  });

  const smbPassMutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      setSmbPassword(username, password),
  });

  const handleSetSmbPassword = (username: string) => {
    const password = prompt(`Set Samba password for ${username}:`);
    if (password) smbPassMutation.mutate({ username, password });
  };

  const handleSaveShareAssignment = async (changes: { shareName: string; valid_users: string[]; write_list: string[] }[]) => {
    for (const change of changes) {
      await updateSMBShare(change.shareName, {
        valid_users: change.valid_users,
        write_list: change.write_list,
      } as Partial<SMBShare>);
    }
    queryClient.invalidateQueries({ queryKey: ['smb-shares'] });
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">System Users</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4" />
          Create User
        </button>
      </div>

      {showCreate && (
        <>
          {createError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/50 dark:text-red-400">
              {createError}
            </div>
          )}
          <UserCreateForm
            onSubmit={(username, password, groups) => { setCreateError(null); createMutation.mutate({ username, password, groups }); }}
            onCancel={() => { setShowCreate(false); setCreateError(null); }}
            isSubmitting={createMutation.isPending}
          />
        </>
      )}

      <UserList
        users={users}
        smbShares={smbShares}
        onDelete={(username) => setConfirmDelete(username)}
        onSetSmbPassword={handleSetSmbPassword}
        onAssignShares={(username) => setAssignSharesUser(username)}
      />

      {assignSharesUser && (
        <ShareAssignmentDialog
          open={!!assignSharesUser}
          username={assignSharesUser}
          smbShares={smbShares}
          onSave={handleSaveShareAssignment}
          onClose={() => setAssignSharesUser(null)}
        />
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete User"
        message={`Are you sure you want to delete user "${confirmDelete}"? This will also remove their home directory.`}
        confirmLabel="Delete"
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
