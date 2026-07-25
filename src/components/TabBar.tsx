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
    <nav className="no-print glass fixed inset-x-0 bottom-0 z-40 border-t border-slate-900/5 pb-safe">
      <div className="mx-auto flex max-w-lg px-1">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="flex flex-1 flex-col items-center gap-1 py-2"
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition-all duration-200 ${
                    isActive ? 'bg-teal-600/10 text-teal-700' : 'text-slate-400'
                  }`}
                >
                  <Icon
                    className="h-[22px] w-[22px]"
                    strokeWidth={isActive ? 2.4 : 2}
                  />
                </span>
                <span
                  className={`text-[11px] font-semibold transition-colors ${
                    isActive ? 'text-teal-700' : 'text-slate-400'
                  }`}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
