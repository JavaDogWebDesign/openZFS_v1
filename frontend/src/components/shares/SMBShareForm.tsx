import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listUsers } from '../../api/users';
import { listDatasets } from '../../api/datasets';
import type { SMBShare } from '../../types';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface SMBShareFormProps {
  initialData?: SMBShare;
  onSubmit: (data: Partial<SMBShare>) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const PRESETS = [
  { label: 'Default', vfs: [], description: 'Standard SMB share' },
  { label: 'Shadow Copy', vfs: ['shadow_copy2'], description: 'Previous versions via snapshots' },
  { label: 'macOS', vfs: ['catia', 'fruit', 'streams_xattr'], description: 'Apple compatibility' },
];

export default function SMBShareForm({ initialData, onSubmit, onCancel, isSubmitting }: SMBShareFormProps) {
  const isEdit = !!initialData;
  const { data: systemUsers = [] } = useQuery({ queryKey: ['users'], queryFn: listUsers });
  const { data: datasets = [] } = useQuery({ queryKey: ['datasets'], queryFn: () => listDatasets() });
  const mountpoints = datasets.filter((d) => d.mountpoint && d.mountpoint !== 'none' && d.mountpoint !== '-');

  const [name, setName] = useState(initialData?.name || '');
  const [path, setPath] = useState(initialData?.path || '');
  const [comment, setComment] = useState(initialData?.comment || '');
  const [browseable, setBrowseable] = useState(initialData?.browseable ?? true);
  const [readOnly, setReadOnly] = useState(initialData?.read_only ?? false);
  const [guestOk, setGuestOk] = useState(initialData?.guest_ok ?? false);
  const [validUsers, setValidUsers] = useState<string[]>(initialData?.valid_users || []);
  const [writeList, setWriteList] = useState<string[]>(initialData?.write_list || []);
  const [createMask, setCreateMask] = useState(initialData?.create_mask || '');
  const [directoryMask, setDirectoryMask] = useState(initialData?.directory_mask || '');
  const [forceUser, setForceUser] = useState(initialData?.force_user || '');
  const [forceGroup, setForceGroup] = useState(initialData?.force_group || '');
  const [inheritPermissions, setInheritPermissions] = useState(initialData?.inherit_permissions ?? false);
  const [vfsObjects, setVfsObjects] = useState<string[]>(initialData?.vfs_objects || []);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [nameError, setNameError] = useState('');
  const [pathError, setPathError] = useState('');

  const validate = () => {
    let valid = true;
    if (!isEdit && !/^[a-zA-Z0-9][a-zA-Z0-9_\-]*$/.test(name)) {
      setNameError('Invalid share name');
      valid = false;
    } else setNameError('');
    if (!/^\/[a-zA-Z0-9_.\-/]+$/.test(path)) {
      setPathError('Must be an absolute path');
      valid = false;
    } else setPathError('');
    return valid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const data: Partial<SMBShare> = {
      path,
      comment,
      browseable,
      read_only: readOnly,
      guest_ok: guestOk,
      valid_users: validUsers,
      write_list: writeList,
      create_mask: createMask,
      directory_mask: directoryMask,
      force_user: forceUser,
      force_group: forceGroup,
      inherit_permissions: inheritPermissions,
      vfs_objects: vfsObjects,
    };
    if (!isEdit) data.name = name;
    onSubmit(data);
  };

  const toggleUser = (username: string, list: string[], setList: (l: string[]) => void) => {
    setList(list.includes(username) ? list.filter((u) => u !== username) : [...list, username]);
  };

  const applyPreset = (vfs: string[]) => {
    setVfsObjects(vfs);
    if (vfs.length > 0) setShowAdvanced(true);
  };

  const inputClass = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{isEdit ? 'Edit' : 'Create'} SMB Share</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Share Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} disabled={isEdit} className={`${inputClass} ${isEdit ? 'opacity-50' : ''}`} />
          {nameError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{nameError}</p>}
        </div>
        <div>
          <label className={labelClass}>Path</label>
          <select
            value={mountpoints.some((d) => d.mountpoint === path) ? path : '__custom__'}
            onChange={(e) => { if (e.target.value !== '__custom__') setPath(e.target.value); }}
            className={inputClass}
          >
            <option value="__custom__">Custom path...</option>
            {mountpoints.map((d) => (
              <option key={d.name} value={d.mountpoint}>{d.mountpoint} ({d.name})</option>
            ))}
          </select>
          {(!mountpoints.some((d) => d.mountpoint === path)) && (
            <input value={path} onChange={(e) => setPath(e.target.value)} className={`${inputClass} mt-1`} placeholder="/mnt/pool/share" />
          )}
          {pathError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{pathError}</p>}
        </div>
      </div>

      <div>
        <label className={labelClass}>Comment</label>
        <input value={comment} onChange={(e) => setComment(e.target.value)} className={inputClass} />
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={browseable} onChange={(e) => setBrowseable(e.target.checked)} className="rounded" />
          <span className="text-sm text-gray-700 dark:text-gray-300">Browseable</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} className="rounded" />
          <span className="text-sm text-gray-700 dark:text-gray-300">Read Only</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={guestOk} onChange={(e) => setGuestOk(e.target.checked)} className="rounded" />
          <span className="text-sm text-gray-700 dark:text-gray-300">Guest OK</span>
        </label>
      </div>

      {/* User picker for valid_users */}
      <div>
        <label className={labelClass}>Valid Users (empty = all users)</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {systemUsers.map((u) => (
            <button
              key={u.username}
              type="button"
              onClick={() => toggleUser(u.username, validUsers, setValidUsers)}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                validUsers.includes(u.username)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {u.username}
            </button>
          ))}
        </div>
      </div>

      {/* SMB Presets */}
      <div>
        <label className={labelClass}>SMB Preset</label>
        <div className="mt-2 flex gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.vfs)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                JSON.stringify(vfsObjects) === JSON.stringify(preset.vfs)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
              title={preset.description}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced options */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
      >
        {showAdvanced ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
        Advanced Options
      </button>

      {showAdvanced && (
        <div className="space-y-4 rounded-md border border-gray-100 p-4 dark:border-gray-700">
          <div>
            <label className={labelClass}>Write List</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {systemUsers.map((u) => (
                <button
                  key={u.username}
                  type="button"
                  onClick={() => toggleUser(u.username, writeList, setWriteList)}
                  className={`rounded-md px-3 py-1 text-xs font-medium ${
                    writeList.includes(u.username)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {u.username}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Create Mask</label>
              <input value={createMask} onChange={(e) => setCreateMask(e.target.value)} className={inputClass} placeholder="0644" />
            </div>
            <div>
              <label className={labelClass}>Directory Mask</label>
              <input value={directoryMask} onChange={(e) => setDirectoryMask(e.target.value)} className={inputClass} placeholder="0755" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Force User</label>
              <select value={forceUser} onChange={(e) => setForceUser(e.target.value)} className={inputClass}>
                <option value="">None</option>
                {systemUsers.map((u) => (
                  <option key={u.username} value={u.username}>{u.username}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Force Group</label>
              <input value={forceGroup} onChange={(e) => setForceGroup(e.target.value)} className={inputClass} placeholder="e.g., samba" />
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={inheritPermissions} onChange={(e) => setInheritPermissions(e.target.checked)} className="rounded" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Inherit Permissions</span>
          </label>

          <div>
            <label className={labelClass}>VFS Objects (space-separated)</label>
            <input
              value={vfsObjects.join(' ')}
              onChange={(e) => setVfsObjects(e.target.value.split(/\s+/).filter(Boolean))}
              className={inputClass}
              placeholder="e.g., shadow_copy2 catia fruit streams_xattr"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {isSubmitting ? 'Saving...' : isEdit ? 'Update Share' : 'Create Share'}
        </button>
      </div>
    </form>
  );
}
