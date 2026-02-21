import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-gray-900">OpenZFS Manager</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {user?.username}
          {user?.is_admin && (
            <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              Admin
            </span>
          )}
        </span>
        <button
          onClick={logout}
          className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  );
}
