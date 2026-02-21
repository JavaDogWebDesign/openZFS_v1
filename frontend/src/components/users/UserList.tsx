import type { SystemUser } from '../../types';

interface UserListProps {
  users: SystemUser[];
  onDelete: (username: string) => void;
  onSetSmbPassword: (username: string) => void;
}

export default function UserList({ users, onDelete, onSetSmbPassword }: UserListProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
        No system users found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Username</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">UID</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Home</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Groups</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.username} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.username}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{user.uid}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{user.home}</td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {user.groups.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {user.groups.map((g) => (
                      <span key={g} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{g}</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400">None</span>
                )}
              </td>
              <td className="px-4 py-3 text-right text-sm">
                <button
                  onClick={() => onSetSmbPassword(user.username)}
                  className="mr-2 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  SMB Pass
                </button>
                <button
                  onClick={() => onDelete(user.username)}
                  className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
