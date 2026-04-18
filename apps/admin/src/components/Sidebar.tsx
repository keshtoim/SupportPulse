import { NavLink } from 'react-router-dom'
import type { UserDTO } from '@supportpulse/shared'

const NAV = [
  { to: '/tickets', label: 'Тикеты', icon: '🎫' },
  { to: '/settings', label: 'Настройки', icon: '⚙️' },
]

export function Sidebar({
  user,
  onLogout,
}: {
  user: UserDTO | null
  onLogout: () => void
}) {
  return (
    <aside className="w-60 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <img src="/vite.svg" alt="SupportPulse" className="w-8 h-8 rounded-lg" />
        <span className="font-bold text-gray-800 text-lg leading-tight">SupportPulse</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 flex flex-col gap-1">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-100">
        {user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        )}
        <button
          className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors"
          onClick={onLogout}
        >
          <span>🚪</span> Выйти
        </button>
      </div>
    </aside>
  )
}
