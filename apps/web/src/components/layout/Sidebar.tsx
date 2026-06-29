import { NavLink } from 'react-router-dom'
import { Flag, Layers, Globe, Settings, LogOut } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/flags', icon: Flag, label: 'Flags' },
  { to: '/segments', icon: Layers, label: 'Segments' },
  { to: '/environments', icon: Globe, label: 'Environments' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const { logout, user } = useAuth()

  return (
    <aside className="w-56 flex flex-col bg-white border-r border-gray-200">
      <div className="px-4 py-4 border-b border-gray-200">
        <span className="text-lg font-bold text-brand-600">FlagBase</span>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 mb-2 truncate">{user?.email}</div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
