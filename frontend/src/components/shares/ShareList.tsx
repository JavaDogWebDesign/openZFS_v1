import type { SMBShare, NFSExport } from '../../types';

interface ShareListProps {
  smbShares: SMBShare[];
  nfsExports: NFSExport[];
  activeTab: 'smb' | 'nfs';
  onTabChange: (tab: 'smb' | 'nfs') => void;
  onDeleteSmb: (name: string) => void;
  onDeleteNfs: (id: number) => void;
}

export default function ShareList({
  smbShares,
  nfsExports,
  activeTab,
  onTabChange,
  onDeleteSmb,
  onDeleteNfs,
}: ShareListProps) {
  return (
    <div>
      <div className="mb-4 flex border-b border-gray-200">
        <button
          onClick={() => onTabChange('smb')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'smb'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          SMB Shares ({smbShares.length})
        </button>
        <button
          onClick={() => onTabChange('nfs')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'nfs'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          NFS Exports ({nfsExports.length})
        </button>
      </div>

      {activeTab === 'smb' ? (
        smbShares.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
            No SMB shares configured.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Path</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Browseable</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Read Only</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Guest</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {smbShares.map((share) => (
                  <tr key={share.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{share.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{share.path}</td>
                    <td className="px-4 py-3 text-sm">{share.browseable ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-sm">{share.read_only ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-sm">{share.guest_ok ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      <button
                        onClick={() => onDeleteSmb(share.name)}
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
        )
      ) : nfsExports.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          No NFS exports configured.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Path</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Options</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {nfsExports.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{exp.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{exp.path}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{exp.client}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{exp.options}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      onClick={() => onDeleteNfs(exp.id)}
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
      )}
    </div>
  );
}
