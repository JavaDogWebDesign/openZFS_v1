import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Required').regex(/^[a-zA-Z][a-zA-Z0-9_.\-]+(\/[a-zA-Z][a-zA-Z0-9_.\-]+)*$/, 'Invalid dataset path (e.g., pool/dataset)'),
  quota: z.string().optional(),
  compression: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface DatasetCreateFormProps {
  onSubmit: (name: string, properties: Record<string, string>) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function DatasetCreateForm({ onSubmit, onCancel, isSubmitting }: DatasetCreateFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const handleFormSubmit = (data: FormData) => {
    const props: Record<string, string> = {};
    if (data.quota) props.quota = data.quota;
    if (data.compression) props.compression = data.compression;
    onSubmit(data.name, props);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create Dataset</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dataset Path</label>
        <input
          {...register('name')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          placeholder="pool/dataset"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Compression</label>
        <select
          {...register('compression')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        >
          <option value="">Default</option>
          <option value="lz4">LZ4</option>
          <option value="zstd">ZSTD</option>
          <option value="gzip">GZIP</option>
          <option value="off">Off</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quota (optional)</label>
        <input
          {...register('quota')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          placeholder="e.g., 100G"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {isSubmitting ? 'Creating...' : 'Create Dataset'}
        </button>
      </div>
    </form>
  );
}
