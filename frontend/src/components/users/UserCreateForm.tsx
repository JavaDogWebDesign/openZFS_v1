import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  username: z.string().min(1).max(32).regex(/^[a-z_][a-z0-9_\-]*$/, 'Lowercase letters, numbers, underscore, hyphen'),
  password: z.string().min(1, 'Password required'),
  groups: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface UserCreateFormProps {
  onSubmit: (username: string, password: string, groups: string[]) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function UserCreateForm({ onSubmit, onCancel, isSubmitting }: UserCreateFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const handleFormSubmit = (data: FormData) => {
    const groups = data.groups ? data.groups.split(',').map((g) => g.trim()).filter(Boolean) : [];
    onSubmit(data.username, data.password, groups);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">Create System User</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700">Username</label>
        <input
          {...register('username')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Password</label>
        <input
          type="password"
          {...register('password')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Groups (comma-separated)</label>
        <input
          {...register('groups')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="e.g., samba,storage"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {isSubmitting ? 'Creating...' : 'Create User'}
        </button>
      </div>
    </form>
  );
}
