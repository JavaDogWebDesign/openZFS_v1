import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Disk } from '../../types';
import { formatBytes } from '../../utils/format';

const schema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-zA-Z][a-zA-Z0-9_.\-]*$/, 'Invalid pool name'),
  vdev_type: z.enum(['stripe', 'mirror', 'raidz', 'raidz2', 'raidz3']),
  disks: z.array(z.string()).min(1, 'Select at least one disk'),
});

type FormData = z.infer<typeof schema>;

interface PoolCreateFormProps {
  disks: Disk[];
  onSubmit: (data: FormData & { properties: Record<string, string> }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function PoolCreateForm({ disks, onSubmit, onCancel, isSubmitting }: PoolCreateFormProps) {
  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { vdev_type: 'mirror', disks: [] },
  });

  const selectedDisks = watch('disks');
  const availableDisks = disks.filter((d) => !d.in_use);

  return (
    <form
      onSubmit={handleSubmit((data) => onSubmit({ ...data, properties: {} }))}
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900">Create Pool</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700">Pool Name</label>
        <input
          {...register('name')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="mypool"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">VDEV Type</label>
        <select
          {...register('vdev_type')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="stripe">Stripe (no redundancy)</option>
          <option value="mirror">Mirror</option>
          <option value="raidz">RAIDZ</option>
          <option value="raidz2">RAIDZ2</option>
          <option value="raidz3">RAIDZ3</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Disks ({selectedDisks.length} selected)
        </label>
        <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border border-gray-200 p-3">
          {availableDisks.length === 0 ? (
            <p className="text-sm text-gray-500">No available disks found</p>
          ) : (
            availableDisks.map((disk) => (
              <label key={disk.path} className="flex items-center gap-2">
                <input type="checkbox" value={disk.path} {...register('disks')} className="rounded" />
                <span className="text-sm">
                  {disk.path} - {formatBytes(disk.size)}
                  {disk.model && ` (${disk.model})`}
                </span>
              </label>
            ))
          )}
        </div>
        {errors.disks && <p className="mt-1 text-sm text-red-600">{errors.disks.message}</p>}
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Pool'}
        </button>
      </div>
    </form>
  );
}
