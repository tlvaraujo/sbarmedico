import { NavLink } from 'react-router-dom'
import { ClipboardList, Send, Settings, Sparkles } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Plantão', icon: ClipboardList, end: true },
  { to: '/gerar', label: 'Gerar', icon: Sparkles, end: false },
  { to: '/passagem', label: 'Passagem', icon: Send, end: false },
  { to: '/ajustes', label: 'Ajustes', icon: Settings, end: false },
]

export function TabBar() {
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-safe backdrop-blur">
      <div className="mx-auto flex max-w-lg">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition ${
                isActive ? 'text-teal-600' : 'text-slate-500'
              }`
            }
          >
            <Icon className="h-6 w-6" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
