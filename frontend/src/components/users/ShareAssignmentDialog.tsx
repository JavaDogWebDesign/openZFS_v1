import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from '@headlessui/react';
import type { SMBShare } from '../../types';

interface ShareAssignment {
  shareName: string;
  inValidUsers: boolean;
  inWriteList: boolean;
}

interface ShareAssignmentDialogProps {
  open: boolean;
  username: string;
  smbShares: SMBShare[];
  onSave: (changes: { shareName: string; valid_users: string[]; write_list: string[] }[]) => Promise<void>;
  onClose: () => void;
}

export default function ShareAssignmentDialog({
  open,
  username,
  smbShares,
  onSave,
  onClose,
}: ShareAssignmentDialogProps) {
  const [assignments, setAssignments] = useState<ShareAssignment[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAssignments(
      smbShares.map((share) => ({
        shareName: share.name,
        inValidUsers: share.valid_users.includes(username),
        inWriteList: (share.write_list || []).includes(username),
      }))
    );
  }, [smbShares, username]);

  const toggleValidUsers = (shareName: string) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.shareName === shareName
          ? { ...a, inValidUsers: !a.inValidUsers, inWriteList: !a.inValidUsers ? a.inWriteList : false }
          : a
      )
    );
  };

  const toggleWriteList = (shareName: string) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.shareName === shareName ? { ...a, inWriteList: !a.inWriteList } : a
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const changes = assignments
        .filter((a) => {
          const share = smbShares.find((s) => s.name === a.shareName);
          if (!share) return false;
          const wasInValid = share.valid_users.includes(username);
          const wasInWrite = (share.write_list || []).includes(username);
          return a.inValidUsers !== wasInValid || a.inWriteList !== wasInWrite;
        })
        .map((a) => {
          const share = smbShares.find((s) => s.name === a.shareName)!;
          const validUsers = a.inValidUsers
            ? [...new Set([...share.valid_users, username])]
            : share.valid_users.filter((u) => u !== username);
          const writeList = a.inWriteList
            ? [...new Set([...(share.write_list || []), username])]
            : (share.write_list || []).filter((u) => u !== username);
          return { shareName: a.shareName, valid_users: validUsers, write_list: writeList };
        });

      if (changes.length > 0) {
        await onSave(changes);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/30" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Assign Shares for {username}
          </DialogTitle>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select which SMB shares this user can access and write to.
          </p>

          <div className="mt-4 max-h-64 space-y-3 overflow-y-auto">
            {assignments.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No SMB shares configured.</p>
            ) : (
              assignments.map((a) => (
                <div key={a.shareName} className="flex items-center justify-between rounded-md border border-gray-100 p-3 dark:border-gray-700">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.shareName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {smbShares.find((s) => s.name === a.shareName)?.path}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={a.inValidUsers}
                        onChange={() => toggleValidUsers(a.shareName)}
                        className="rounded"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300">Access</span>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={a.inWriteList}
                        onChange={() => toggleWriteList(a.shareName)}
                        disabled={!a.inValidUsers}
                        className="rounded disabled:opacity-50"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300">Write</span>
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
