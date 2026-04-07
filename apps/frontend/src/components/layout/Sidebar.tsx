import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Network, Server, Bell, Settings } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { to: '/hosts', icon: Server, label: 'Hosts' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/dashboard/default', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/network-map/default', icon: Network, label: 'Network Map' },
];

export default function Sidebar() {
  return (
    <aside className="flex flex-col w-64 bg-gray-900 dark:bg-gray-950 text-gray-100 min-h-screen">
      <div className="flex items-center h-16 px-6 border-b border-gray-700">
        <span className="text-xl font-bold text-primary-400">Monitoring</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white',
              )
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-700">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
        >
          <Settings className="w-5 h-5" />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
