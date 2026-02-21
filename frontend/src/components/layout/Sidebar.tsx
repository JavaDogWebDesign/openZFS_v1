import { NavLink } from 'react-router-dom';
import {
  CircleStackIcon,
  ServerStackIcon,
  FolderIcon,
  UsersIcon,
  ShareIcon,
  HomeIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';

const navItems = [
  { to: '/', label: 'Dashboard', icon: HomeIcon },
  { to: '/pools', label: 'Pools', icon: CircleStackIcon },
  { to: '/datasets', label: 'Datasets', icon: FolderIcon },
  { to: '/drives', label: 'Drives', icon: CpuChipIcon },
  { to: '/users', label: 'Users', icon: UsersIcon },
  { to: '/shares', label: 'Shares', icon: ShareIcon },
];

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6 dark:border-gray-700">
        <ServerStackIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">OpenZFS</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
