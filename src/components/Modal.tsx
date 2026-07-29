import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="animate-fade absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="animate-enter relative z-10 max-h-[85vh] w-full max-w-lg overflow-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-1 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="text-sm leading-relaxed text-slate-600">{children}</div>
      </div>
    </div>
  )
}
