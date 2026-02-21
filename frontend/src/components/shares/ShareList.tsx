import type { SMBShare, NFSExport } from '../../types';

interface ShareListProps {
  smbShares: SMBShare[];
  nfsExports: NFSExport[];
  activeTab: 'smb' | 'nfs';
  onTabChange: (tab: 'smb' | 'nfs') => void;
  onDeleteSmb: (name: string) => void;
  onDeleteNfs: (id: number) => void;
  onEditSmb?: (share: SMBShare) => void;
}

export default function ShareList({
  smbShares,
  nfsExports,
  activeTab,
  onTabChange,
  onDeleteSmb,
  onDeleteNfs,
  onEditSmb,
}: ShareListProps) {
  return (
    <div>
      <div className="mb-4 flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => onTabChange('smb')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'smb'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          SMB Shares ({smbShares.length})
        </button>
        <button
          onClick={() => onTabChange('nfs')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'nfs'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          NFS Exports ({nfsExports.length})
        </button>
      </div>

      {activeTab === 'smb' ? (
        smbShares.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            No SMB shares configured.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Path</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Browseable</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Read Only</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Guest</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Write List</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {smbShares.map((share) => (
                  <tr key={share.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{share.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{share.path}</td>
                    <td className="px-4 py-3 text-sm dark:text-gray-300">{share.browseable ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-sm dark:text-gray-300">{share.read_only ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-sm dark:text-gray-300">{share.guest_ok ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {(share as any).write_list?.length > 0
                        ? (share as any).write_list.join(', ')
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {onEditSmb && (
                        <button
                          onClick={() => onEditSmb(share)}
                          className="mr-2 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-900"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteSmb(share.name)}
                        className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : nfsExports.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          No NFS exports configured.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Path</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Options</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {nfsExports.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{exp.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{exp.path}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{exp.client}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{exp.options}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      onClick={() => onDeleteNfs(exp.id)}
                      className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
