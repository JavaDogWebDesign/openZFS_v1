import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listDrives } from '../../api/drives';
import { formatBytes } from '../../utils/format';
import type { PoolCreateRequest, DriveInfo } from '../../types';
import {
  CheckCircleIcon,
  XCircleIcon,
  MinusCircleIcon,
} from '@heroicons/react/24/outline';

interface PoolWizardProps {
  onSubmit: (data: PoolCreateRequest) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  error?: string;
}

const VDEV_TYPES = [
  { value: 'stripe', label: 'Stripe', minDisks: 1, description: 'No redundancy. Maximum capacity.', parity: 0 },
  { value: 'mirror', label: 'Mirror', minDisks: 2, description: 'Full copy on each disk. Survives N-1 failures.', parity: -1 },
  { value: 'raidz', label: 'RAIDZ', minDisks: 3, description: 'Single parity. Survives 1 disk failure.', parity: 1 },
  { value: 'raidz2', label: 'RAIDZ2', minDisks: 4, description: 'Double parity. Survives 2 disk failures.', parity: 2 },
  { value: 'raidz3', label: 'RAIDZ3', minDisks: 5, description: 'Triple parity. Survives 3 disk failures.', parity: 3 },
] as const;

function StepIndicator({ currentStep, steps }: { currentStep: number; steps: string[] }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
            i < currentStep
              ? 'bg-blue-600 text-white'
              : i === currentStep
                ? 'bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-800'
                : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            {i < currentStep ? '\u2713' : i + 1}
          </div>
          <span className={`text-sm ${i === currentStep ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
            {label}
          </span>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-8 ${i < currentStep ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function SmartBadgeSmall({ drive }: { drive: DriveInfo }) {
  if (!drive.smart.available) return <MinusCircleIcon className="h-4 w-4 text-gray-400" />;
  if (drive.smart.healthy) return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
  return <XCircleIcon className="h-4 w-4 text-red-500" />;
}

function estimateUsable(diskCount: number, diskSizes: number[], vdevType: string): number {
  if (diskCount === 0 || diskSizes.length === 0) return 0;
  const minSize = Math.min(...diskSizes);
  const vdev = VDEV_TYPES.find((v) => v.value === vdevType);
  if (!vdev) return 0;
  if (vdevType === 'stripe') return minSize * diskCount;
  if (vdevType === 'mirror') return minSize;
  // raidz: (N - parity) * minSize
  return (diskCount - vdev.parity) * minSize;
}

export default function PoolWizard({ onSubmit, onCancel, isSubmitting, error }: PoolWizardProps) {
  const [step, setStep] = useState(0);

  // Step 1: Config
  const [poolName, setPoolName] = useState('');
  const [mountpoint, setMountpoint] = useState('');
  const [vdevType, setVdevType] = useState<string>('mirror');
  const [compression, setCompression] = useState('lz4');
  const [ashift, setAshift] = useState('12');
  const [encryption, setEncryption] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [passphraseConfirm, setPassphraseConfirm] = useState('');
  const [force, setForce] = useState(false);

  // Step 2: Disks
  const [selectedDisks, setSelectedDisks] = useState<string[]>([]);

  const { data: drives = [] } = useQuery({ queryKey: ['drives'], queryFn: listDrives });
  const availableDrives = drives.filter((d) => !d.in_use);

  // Validation
  const nameValid = /^[a-zA-Z][a-zA-Z0-9_.\-]*$/.test(poolName) && poolName.length > 0;
  const mountpointValid = !mountpoint || mountpoint.startsWith('/');
  const passphraseValid = !encryption || (passphrase.length >= 8 && passphrase === passphraseConfirm);
  const vdevInfo = VDEV_TYPES.find((v) => v.value === vdevType)!;
  const disksValid = selectedDisks.length >= vdevInfo.minDisks;
  const step1Valid = nameValid && mountpointValid && passphraseValid;

  const selectedDriveObjects = drives.filter((d) => selectedDisks.includes(d.path));
  const usableCapacity = estimateUsable(
    selectedDisks.length,
    selectedDriveObjects.map((d) => d.size),
    vdevType,
  );

  const handleToggleDisk = (path: string) => {
    setSelectedDisks((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const handleCreate = () => {
    const properties: Record<string, string> = {};
    if (ashift !== '0') properties.ashift = ashift;

    const fsProperties: Record<string, string> = {};
    if (compression !== 'off') fsProperties.compression = compression;
    if (encryption) {
      fsProperties.encryption = 'aes-256-gcm';
      fsProperties.keyformat = 'passphrase';
      fsProperties.keylocation = 'prompt';
    }

    onSubmit({
      name: poolName,
      vdev_type: vdevType as PoolCreateRequest['vdev_type'],
      disks: selectedDisks,
      properties,
      fs_properties: fsProperties,
      force,
      mountpoint: mountpoint || undefined,
    });
  };

  const inputClass = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <StepIndicator currentStep={step} steps={['Configuration', 'Disk Selection', 'Review & Create']} />

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/50 dark:text-red-400">{error}</div>
      )}

      {/* Step 1: Configuration */}
      {step === 0 && (
        <div className="mt-6 space-y-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pool Configuration</h3>

          <div>
            <label className={labelClass}>Pool Name</label>
            <input
              type="text"
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
              className={inputClass}
              placeholder="mypool"
            />
            {poolName && !nameValid && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">Must start with a letter, alphanumeric + _.-</p>
            )}
          </div>

          <div>
            <label className={labelClass}>Mountpoint (optional)</label>
            <input
              type="text"
              value={mountpoint}
              onChange={(e) => setMountpoint(e.target.value)}
              className={inputClass}
              placeholder="/mnt/mypool"
            />
            {mountpoint && !mountpointValid && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">Must start with /</p>
            )}
          </div>

          <div>
            <label className={labelClass}>VDEV Type</label>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {VDEV_TYPES.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setVdevType(v.value)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    vdevType === v.value
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:border-blue-400 dark:bg-blue-900/30'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{v.label}</div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{v.description}</div>
                  <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">Min {v.minDisks} disk{v.minDisks > 1 ? 's' : ''}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Compression</label>
              <select value={compression} onChange={(e) => setCompression(e.target.value)} className={inputClass}>
                <option value="off">Off</option>
                <option value="lz4">LZ4 (recommended)</option>
                <option value="gzip">Gzip</option>
                <option value="zstd">Zstd</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Ashift (sector size)</label>
              <select value={ashift} onChange={(e) => setAshift(e.target.value)} className={inputClass}>
                <option value="9">9 (512B)</option>
                <option value="12">12 (4K, recommended)</option>
                <option value="13">13 (8K)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={encryption} onChange={(e) => setEncryption(e.target.checked)} className="rounded" />
              <span className={labelClass}>Enable encryption (AES-256-GCM)</span>
            </label>
            {encryption && (
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Passphrase</label>
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className={inputClass}
                    placeholder="Min 8 characters"
                  />
                </div>
                <div>
                  <label className={labelClass}>Confirm Passphrase</label>
                  <input
                    type="password"
                    value={passphraseConfirm}
                    onChange={(e) => setPassphraseConfirm(e.target.value)}
                    className={inputClass}
                  />
                </div>
                {passphrase && passphrase.length < 8 && (
                  <p className="col-span-2 text-sm text-red-600 dark:text-red-400">Passphrase must be at least 8 characters</p>
                )}
                {passphrase && passphraseConfirm && passphrase !== passphraseConfirm && (
                  <p className="col-span-2 text-sm text-red-600 dark:text-red-400">Passphrases do not match</p>
                )}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} className="rounded" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Force create (skip some safety checks)</span>
          </label>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button
              type="button"
              disabled={!step1Valid}
              onClick={() => setStep(1)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Next: Select Disks
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Disk Selection */}
      {step === 1 && (
        <div className="mt-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Select Disks ({selectedDisks.length} of {vdevInfo.minDisks}+ required)
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedDisks(availableDrives.map((d) => d.path))}
                className="rounded-md px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => setSelectedDisks([])}
                className="rounded-md px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Deselect All
              </button>
            </div>
          </div>

          {availableDrives.length === 0 ? (
            <div className="rounded-lg border border-gray-200 p-6 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
              No available disks found. All disks are currently in use.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {availableDrives.map((drive) => {
                const isSelected = selectedDisks.includes(drive.path);
                return (
                  <button
                    key={drive.path}
                    type="button"
                    onClick={() => handleToggleDisk(drive.path)}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={isSelected} readOnly className="rounded" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">/dev/{drive.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          drive.type === 'NVMe' ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400' :
                          drive.type === 'SSD' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400' :
                          'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
                        }`}>{drive.type}</span>
                      </div>
                      <SmartBadgeSmall drive={drive} />
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatBytes(drive.size)}</span>
                      <span className="truncate">{drive.model || 'Unknown'}</span>
                      {drive.serial && <span className="font-mono truncate">{drive.serial}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!disksValid && selectedDisks.length > 0 && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {vdevType} requires at least {vdevInfo.minDisks} disks. You selected {selectedDisks.length}.
            </p>
          )}

          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(0)} className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
              Back
            </button>
            <button
              type="button"
              disabled={!disksValid}
              onClick={() => setStep(2)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Next: Review
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 2 && (
        <div className="mt-6 space-y-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Review & Create</h3>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Pool Name</dt>
                <dd className="font-semibold text-gray-900 dark:text-gray-100">{poolName}</dd>
              </div>
              {mountpoint && (
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Mountpoint</dt>
                  <dd className="font-medium dark:text-gray-200">{mountpoint}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Topology</dt>
                <dd className="font-medium dark:text-gray-200">{vdevInfo.label}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Disks</dt>
                <dd className="font-medium dark:text-gray-200">{selectedDisks.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Compression</dt>
                <dd className="font-medium dark:text-gray-200">{compression === 'off' ? 'Off' : compression.toUpperCase()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Ashift</dt>
                <dd className="font-medium dark:text-gray-200">{ashift}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Encryption</dt>
                <dd className="font-medium dark:text-gray-200">{encryption ? 'AES-256-GCM' : 'None'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Force</dt>
                <dd className="font-medium dark:text-gray-200">{force ? 'Yes' : 'No'}</dd>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                <dt className="text-gray-500 dark:text-gray-400">Est. Usable Capacity</dt>
                <dd className="font-semibold text-blue-600 dark:text-blue-400">{formatBytes(usableCapacity)}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Selected Disks</h4>
            <div className="flex flex-wrap gap-2">
              {selectedDriveObjects.map((d) => (
                <span key={d.path} className="rounded-md bg-gray-100 px-2 py-1 text-xs font-mono text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  {d.name} ({formatBytes(d.size)})
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
              Back
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCreate}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Pool...' : 'Create Pool'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
