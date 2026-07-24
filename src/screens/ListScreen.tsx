import { useMemo, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  ClipboardList,
  MoreVertical,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import {
  deletePatient,
  setArchived,
  setPinned,
  useActivePatients,
} from '../db/patients'
import type { Patient } from '../types/patient'
import { STABILITY_BADGE, STABILITY_DOT, STABILITY_LABEL } from '../lib/labels'
import { Button, PageHeader, inputClass } from '../components/ui'
import { useToast } from '../components/Toast'

function hasAllergy(p: Patient): boolean {
  const a = p.allergies.trim().toLowerCase()
  return a !== '' && !['nega', 'nkda', 'nenhuma', 'não', 'nao'].includes(a)
}

function MenuItem({
  children,
  icon,
  onClick,
  danger,
}: {
  children: ReactNode
  icon: ReactNode
  onClick: (e: MouseEvent) => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function PatientRow({ p }: { p: Patient }) {
  const navigate = useNavigate()
  const toast = useToast()
  const openCount = p.pending.filter((i) => !i.done && i.text.trim()).length

  const closeMenu = (e: MouseEvent) =>
    (e.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute(
      'open',
    )

  return (
    <div className="relative flex items-stretch border-b border-slate-200 bg-white">
      <button
        onClick={() => navigate(`/sbar/${p.id}`)}
        className="flex flex-1 items-center gap-3 py-3 pl-3 text-left"
      >
        <span
          className={`flex h-11 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${STABILITY_BADGE[p.stability]}`}
        >
          {p.bed || '—'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-slate-900">
              {p.initials || 'Sem ID'}
            </span>
            {p.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-teal-600" />}
          </div>
          <p className="truncate text-sm text-slate-500">
            {p.mainDiagnosis || 'Sem diagnóstico'}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${STABILITY_BADGE[p.stability]}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${STABILITY_DOT[p.stability]}`} />
              {STABILITY_LABEL[p.stability]}
            </span>
            {openCount > 0 && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                {openCount} pend.
              </span>
            )}
            {p.devices.length > 0 && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                {p.devices.length} disp.
              </span>
            )}
            {hasAllergy(p) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700">
                <TriangleAlert className="h-3 w-3" /> Alergia
              </span>
            )}
          </div>
        </div>
      </button>

      <details className="relative flex items-center">
        <summary className="flex h-full cursor-pointer items-center px-2 text-slate-400 hover:text-slate-600">
          <MoreVertical className="h-5 w-5" />
        </summary>
        <div className="absolute right-2 top-11 z-20 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          <MenuItem
            icon={<Pencil className="h-4 w-4" />}
            onClick={(e) => {
              closeMenu(e)
              navigate(`/paciente/${p.id}`)
            }}
          >
            Editar
          </MenuItem>
          <MenuItem
            icon={p.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            onClick={(e) => {
              closeMenu(e)
              void setPinned(p.id, !p.pinned)
            }}
          >
            {p.pinned ? 'Desafixar' : 'Fixar'}
          </MenuItem>
          <MenuItem
            icon={<Archive className="h-4 w-4" />}
            onClick={(e) => {
              closeMenu(e)
              void setArchived(p.id, true)
              toast.show('Paciente arquivado')
            }}
          >
            Arquivar
          </MenuItem>
          <MenuItem
            danger
            icon={<Trash2 className="h-4 w-4" />}
            onClick={(e) => {
              closeMenu(e)
              if (
                window.confirm(
                  `Excluir ${p.initials || 'este paciente'}? Esta ação não pode ser desfeita.`,
                )
              ) {
                void deletePatient(p.id)
                toast.show('Paciente excluído')
              }
            }}
          >
            Excluir
          </MenuItem>
        </div>
      </details>
    </div>
  )
}

function EmptyState({
  hasPatients,
  onAdd,
}: {
  hasPatients: boolean
  onAdd: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
        <ClipboardList className="h-8 w-8" />
      </div>
      <h2 className="text-lg font-bold text-slate-800">
        {hasPatients ? 'Nenhum resultado' : 'Nenhum paciente ainda'}
      </h2>
      <p className="mt-1 max-w-xs text-sm text-slate-500">
        {hasPatients
          ? 'Tente outro termo de busca.'
          : 'Adicione o primeiro paciente do plantão. Leva poucos segundos.'}
      </p>
      {!hasPatients && (
        <Button className="mt-6" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Adicionar paciente
        </Button>
      )}
    </div>
  )
}

export function ListScreen() {
  const navigate = useNavigate()
  const patients = useActivePatients()
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    if (!patients) return undefined
    const term = q.trim().toLowerCase()
    if (!term) return patients
    return patients.filter((p) =>
      `${p.bed} ${p.initials} ${p.fullName ?? ''} ${p.mainDiagnosis}`
        .toLowerCase()
        .includes(term),
    )
  }, [patients, q])

  const count = patients?.length ?? 0

  return (
    <div>
      <PageHeader
        title="Plantão"
        subtitle={
          patients
            ? `${count} paciente${count === 1 ? '' : 's'} ativo${count === 1 ? '' : 's'}`
            : 'Carregando…'
        }
      />

      <div className="border-b border-slate-200 bg-slate-100 px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por leito, iniciais, diagnóstico…"
            className={`${inputClass} pl-9`}
          />
        </div>
      </div>

      {filtered === undefined ? null : filtered.length === 0 ? (
        <EmptyState hasPatients={count > 0} onAdd={() => navigate('/novo')} />
      ) : (
        <ul>
          {filtered.map((p) => (
            <li key={p.id}>
              <PatientRow p={p} />
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => navigate('/novo')}
        aria-label="Adicionar paciente"
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg shadow-teal-600/30 transition hover:bg-teal-700 active:scale-95"
      >
        <Plus className="h-7 w-7" />
      </button>
    </div>
  )
}
