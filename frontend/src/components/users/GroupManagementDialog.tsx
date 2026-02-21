import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface GroupManagementDialogProps {
  open: boolean;
  username: string;
  currentGroups: string[];
  availableGroups: { name: string; gid: number; members: string[] }[];
  onSave: (username: string, groups: string[]) => void;
  onClose: () => void;
  saving?: boolean;
}

export default function GroupManagementDialog({
  open,
  username,
  currentGroups,
  availableGroups,
  onSave,
  onClose,
  saving = false,
}: GroupManagementDialogProps) {
  const [groups, setGroups] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setGroups([...currentGroups]);
    setInputValue('');
  }, [currentGroups, username]);

  const suggestions = availableGroups
    .map((g) => g.name)
    .filter((name) => !groups.includes(name));

  const addGroup = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !groups.includes(trimmed)) {
      setGroups([...groups, trimmed]);
    }
    setInputValue('');
  };

  const removeGroup = (name: string) => {
    setGroups(groups.filter((g) => g !== name));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addGroup(inputValue);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/30" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Manage Groups for {username}
          </DialogTitle>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add or remove group memberships for this user.
          </p>

          <div className="mt-4">
            {groups.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => (
                  <span
                    key={g}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                  >
                    {g}
                    <button
                      onClick={() => removeGroup(g)}
                      className="rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800"
                    >
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">No groups assigned.</p>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                list="group-suggestions"
                placeholder="Type group name..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
              />
              <datalist id="group-suggestions">
                {suggestions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <button
              onClick={() => addGroup(inputValue)}
              disabled={!inputValue.trim()}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(username, groups)}
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
