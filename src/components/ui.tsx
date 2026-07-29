import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronLeft } from 'lucide-react'

export const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm placeholder:text-slate-400 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-teal-600 text-white shadow-md shadow-teal-950/15 hover:bg-teal-700 active:bg-teal-800',
    secondary:
      'border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-red-600 text-white shadow-sm shadow-red-950/15 hover:bg-red-700',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[.97] disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function PageHeader({
  title,
  subtitle,
  left,
  right,
  className = '',
}: {
  title: string
  subtitle?: string
  left?: ReactNode
  right?: ReactNode
  className?: string
}) {
  return (
    <header
      className={`glass sticky top-0 z-30 border-b border-slate-900/5 px-4 pt-safe ${className}`}
    >
      <div className="flex min-h-[3.5rem] items-center gap-2 py-2.5">
        {left}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[1.3rem] font-bold text-slate-900">{title}</h1>
          {subtitle ? (
            <p className="truncate text-xs font-medium text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {right}
      </div>
    </header>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">{label}</span>
      {children}
      {hint ? (
        <span className="mt-1 block text-xs text-slate-400">{hint}</span>
      ) : null}
    </label>
  )
}

export function BackButton() {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(-1)}
      aria-label="Voltar"
      className="-ml-1 rounded-lg p-2 text-slate-600 transition hover:bg-slate-900/5"
    >
      <ChevronLeft className="h-6 w-6" />
    </button>
  )
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  className = '',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  className?: string
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={`${inputClass} appearance-none pr-10 ${className}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  )
}
