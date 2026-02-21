import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9_\-]*$/, 'Invalid share name'),
  path: z.string().min(1).regex(/^\/[a-zA-Z0-9_.\-/]+$/, 'Must be an absolute path'),
  comment: z.string().optional(),
  browseable: z.boolean().optional(),
  read_only: z.boolean().optional(),
  guest_ok: z.boolean().optional(),
  valid_users: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface SMBShareFormProps {
  onSubmit: (data: {
    name: string;
    path: string;
    comment?: string;
    browseable?: boolean;
    read_only?: boolean;
    guest_ok?: boolean;
    valid_users?: string[];
  }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function SMBShareForm({ onSubmit, onCancel, isSubmitting }: SMBShareFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { browseable: true, read_only: false, guest_ok: false },
  });

  const handleFormSubmit = (data: FormData) => {
    onSubmit({
      ...data,
      comment: data.comment || '',
      valid_users: data.valid_users ? data.valid_users.split(',').map((u) => u.trim()).filter(Boolean) : [],
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">Create SMB Share</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Share Name</label>
          <input {...register('name')} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Path</label>
          <input {...register('path')} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="/mnt/pool/share" />
          {errors.path && <p className="mt-1 text-sm text-red-600">{errors.path.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Comment</label>
        <input {...register('comment')} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Valid Users (comma-separated, leave empty for all)</label>
        <input {...register('valid_users')} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="user1, user2" />
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('browseable')} className="rounded" />
          <span className="text-sm text-gray-700">Browseable</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('read_only')} className="rounded" />
          <span className="text-sm text-gray-700">Read Only</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('guest_ok')} className="rounded" />
          <span className="text-sm text-gray-700">Guest OK</span>
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {isSubmitting ? 'Creating...' : 'Create Share'}
        </button>
      </div>
    </form>
  );
}
