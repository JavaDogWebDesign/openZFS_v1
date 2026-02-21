import type { SystemUser, SMBShare } from '../../types';

interface UserListProps {
  users: SystemUser[];
  smbShares?: SMBShare[];
  onDelete: (username: string) => void;
  onSetSmbPassword: (username: string) => void;
  onAssignShares?: (username: string) => void;
}

export default function UserList({ users, smbShares = [], onDelete, onSetSmbPassword, onAssignShares }: UserListProps) {
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
                  {onAssignShares && (
                    <button
                      onClick={() => onAssignShares(user.username)}
                      className="mr-2 rounded bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 dark:bg-purple-900/50 dark:text-purple-400 dark:hover:bg-purple-900"
                    >
                      Assign Shares
                    </button>
                  )}
                  <button
                    onClick={() => onSetSmbPassword(user.username)}
                    className="mr-2 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-900"
                  >
                    SMB Pass
                  </button>
                  <button
                    onClick={() => onDelete(user.username)}
                    className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
