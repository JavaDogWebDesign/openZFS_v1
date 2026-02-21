import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  path: z.string().min(1).regex(/^\/[a-zA-Z0-9_.\-/]+$/, 'Must be an absolute path'),
  client: z.string().min(1, 'Client is required').regex(/^[a-zA-Z0-9.*_\-/]+$/, 'Invalid client spec'),
  options: z.string().min(1, 'Options are required'),
});

type FormData = z.infer<typeof schema>;

interface NFSExportFormProps {
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function NFSExportForm({ onSubmit, onCancel, isSubmitting }: NFSExportFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { client: '*', options: 'rw,sync,no_subtree_check' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">Create NFS Export</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700">Path</label>
        <input {...register('path')} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="/mnt/pool/share" />
        {errors.path && <p className="mt-1 text-sm text-red-600">{errors.path.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Client</label>
        <input {...register('client')} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="* or 192.168.1.0/24" />
        {errors.client && <p className="mt-1 text-sm text-red-600">{errors.client.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Options</label>
        <input {...register('options')} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        {errors.options && <p className="mt-1 text-sm text-red-600">{errors.options.message}</p>}
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {isSubmitting ? 'Creating...' : 'Create Export'}
        </button>
      </div>
    </form>
  );
}
