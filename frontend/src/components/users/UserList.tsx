import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import type { SystemUser, SMBShare } from '../../types';

interface UserListProps {
  users: SystemUser[];
  smbShares?: SMBShare[];
  onDelete: (username: string) => void;
  onSetSmbPassword: (username: string) => void;
  onAssignShares?: (username: string) => void;
  onManageGroups?: (username: string) => void;
}

export default function UserList({ users, smbShares = [], onDelete, onSetSmbPassword, onAssignShares, onManageGroups }: UserListProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        No system users found.
      </div>
    );
  }

  const getUserShares = (username: string) =>
    smbShares.filter((s) => s.valid_users.includes(username) || (s as any).write_list?.includes(username));

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Username</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">UID</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Home</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Groups</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Shares</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {users.map((user) => {
            const userShares = getUserShares(user.username);
            return (
              <tr key={user.username} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{user.username}</td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{user.uid}</td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{user.home}</td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {user.groups.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {user.groups.map((g) => (
                        <span key={g} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">{g}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">None</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {userShares.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {userShares.map((s) => (
                        <span key={s.name} className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">{s.name}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">None</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <Menu as="div" className="relative inline-block text-left">
                    <MenuButton className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <EllipsisVerticalIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </MenuButton>
                    <MenuItems className="absolute right-0 z-10 mt-1 w-44 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none dark:bg-gray-800 dark:ring-gray-700">
                      <div className="py-1">
                        {onManageGroups && (
                          <MenuItem>
                            <button
                              onClick={() => onManageGroups(user.username)}
                              className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-[focus]:bg-gray-100 dark:text-gray-300 dark:data-[focus]:bg-gray-700"
                            >
                              Manage Groups
                            </button>
                          </MenuItem>
                        )}
                        {onAssignShares && (
                          <MenuItem>
                            <button
                              onClick={() => onAssignShares(user.username)}
                              className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-[focus]:bg-gray-100 dark:text-gray-300 dark:data-[focus]:bg-gray-700"
                            >
                              Assign Shares
                            </button>
                          </MenuItem>
                        )}
                        <MenuItem>
                          <button
                            onClick={() => onSetSmbPassword(user.username)}
                            className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-[focus]:bg-gray-100 dark:text-gray-300 dark:data-[focus]:bg-gray-700"
                          >
                            Set SMB Password
                          </button>
                        </MenuItem>
                        <MenuItem>
                          <button
                            onClick={() => onDelete(user.username)}
                            className="block w-full px-4 py-2 text-left text-sm text-red-600 data-[focus]:bg-gray-100 dark:text-red-400 dark:data-[focus]:bg-gray-700"
                          >
                            Delete
                          </button>
                        </MenuItem>
                      </div>
                    </MenuItems>
                  </Menu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
