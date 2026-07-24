import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, Plus, Trash2, X } from 'lucide-react'
import { Button, inputClass } from './ui'
import { newId } from '../lib/id'
import type { Device, PendingItem } from '../types/patient'

export function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details open={defaultOpen} className="border-b border-slate-200">
      <summary className="flex cursor-pointer items-center justify-between py-3 text-sm font-semibold text-slate-700">
        <span>{title}</span>
        <ChevronDown className="section-chevron h-4 w-4 text-slate-400" />
      </summary>
      <div className="space-y-4 pb-4">{children}</div>
    </details>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; activeClass?: string }[]
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-lg px-2 py-2 text-sm font-semibold transition ${
              active
                ? (o.activeClass ?? 'bg-white text-slate-900 shadow-sm')
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function ChipInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [text, setText] = useState('')
  function commit() {
    const t = text.trim()
    if (t && !value.includes(t)) onChange([...value, t])
    setText('')
  }
  return (
    <div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((c, i) => (
            <span
              key={`${c}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-sm text-teal-800"
            >
              {c}
              <button
                type="button"
                aria-label={`Remover ${c}`}
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="text-teal-500 hover:text-teal-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            commit()
          }
        }}
        onBlur={commit}
      />
    </div>
  )
}

const DEVICE_TYPES = [
  'AVP',
  'AVC',
  'PICC',
  'SVD',
  'SNG',
  'SNE',
  'Dreno',
  'Cateter O2',
  'VM',
  'PAI',
  'Traqueostomia',
]

export function DeviceEditor({
  value,
  onChange,
}: {
  value: Device[]
  onChange: (v: Device[]) => void
}) {
  const update = (id: string, patch: Partial<Device>) =>
    onChange(value.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  return (
    <div className="space-y-2">
      <datalist id="device-types">
        {DEVICE_TYPES.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      {value.map((d) => (
        <div key={d.id} className="flex gap-2">
          <input
            list="device-types"
            value={d.type}
            onChange={(e) => update(d.id, { type: e.target.value })}
            placeholder="Tipo"
            className={`${inputClass} flex-1`}
          />
          <input
            value={d.detail ?? ''}
            onChange={(e) => update(d.id, { detail: e.target.value })}
            placeholder="Detalhe"
            className={`${inputClass} flex-1`}
          />
          <button
            type="button"
            aria-label="Remover dispositivo"
            onClick={() => onChange(value.filter((x) => x.id !== d.id))}
            className="shrink-0 rounded-xl px-2 text-slate-400 hover:text-red-600"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          onChange([...value, { id: newId(), type: '', detail: '' }])
        }
      >
        <Plus className="h-4 w-4" /> Dispositivo
      </Button>
    </div>
  )
}

export function PendingEditor({
  value,
  onChange,
}: {
  value: PendingItem[]
  onChange: (v: PendingItem[]) => void
}) {
  const update = (id: string, patch: Partial<PendingItem>) =>
    onChange(value.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  return (
    <div className="space-y-2">
      {value.map((it) => (
        <div key={it.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={it.done}
            onChange={(e) => update(it.id, { done: e.target.checked })}
            aria-label="Concluída"
            className="h-5 w-5 shrink-0 accent-teal-600"
          />
          <input
            value={it.text}
            onChange={(e) => update(it.id, { text: e.target.value })}
            placeholder="Pendência (exame, parecer, conduta...)"
            className={`${inputClass} flex-1 ${
              it.done ? 'text-slate-400 line-through' : ''
            }`}
          />
          <button
            type="button"
            aria-label="Remover pendência"
            onClick={() => onChange(value.filter((x) => x.id !== it.id))}
            className="shrink-0 rounded-xl px-2 text-slate-400 hover:text-red-600"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          onChange([
            ...value,
            { id: newId(), kind: 'conduta', text: '', done: false },
          ])
        }
      >
        <Plus className="h-4 w-4" /> Pendência
      </Button>
    </div>
  )
}
