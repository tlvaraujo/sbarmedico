import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { Patient } from '../types/patient'
import { newId } from '../lib/id'
import { nowIso } from '../lib/format'
import { sortPatients } from '../lib/bedSort'

export function createEmptyPatient(): Patient {
  const ts = nowIso()
  return {
    id: newId(),
    createdAt: ts,
    updatedAt: ts,
    bed: '',
    initials: '',
    fullName: '',
    age: null,
    sex: '',
    recordNumber: '',
    admissionDate: '',
    mainDiagnosis: '',
    comorbidities: [],
    allergies: 'Nega',
    devices: [],
    pending: [],
    watchParams: '',
    alertSigns: '',
    stability: 'estavel',
    careLevel: 'nao_definido',
    sbar: { situacao: '', historico: '', avaliacao: '', recomendacao: '' },
    pinned: false,
    archived: false,
  }
}

export async function putPatient(p: Patient): Promise<void> {
  await db.patients.put({ ...p, updatedAt: nowIso() })
}

export async function getPatient(id: string): Promise<Patient | undefined> {
  return db.patients.get(id)
}

export async function deletePatient(id: string): Promise<void> {
  await db.patients.delete(id)
}

export async function setArchived(id: string, archived: boolean): Promise<void> {
  await db.patients.update(id, { archived, updatedAt: nowIso() })
}

export async function setPinned(id: string, pinned: boolean): Promise<void> {
  await db.patients.update(id, { pinned, updatedAt: nowIso() })
}

/** Arquiva (soft) todos os pacientes ativos — "encerrar plantão". */
export async function archiveActivePatients(): Promise<number> {
  const active = (await db.patients.toArray()).filter((p) => !p.archived)
  const ts = nowIso()
  await db.patients.bulkPut(active.map((p) => ({ ...p, archived: true, updatedAt: ts })))
  return active.length
}

export async function deleteArchivedPatients(): Promise<number> {
  const archived = (await db.patients.toArray()).filter((p) => p.archived)
  await db.patients.bulkDelete(archived.map((p) => p.id))
  return archived.length
}

export async function deleteAllPatients(): Promise<void> {
  await db.patients.clear()
}

// --- Hooks reativos (useLiveQuery re-renderiza sozinho quando o DB muda) ---

export function useAllPatients(): Patient[] | undefined {
  return useLiveQuery(() => db.patients.toArray(), [])
}

export function useActivePatients(): Patient[] | undefined {
  const all = useAllPatients()
  if (!all) return undefined
  return sortPatients(all.filter((p) => !p.archived))
}

export function useArchivedCount(): number {
  const all = useAllPatients()
  return all ? all.filter((p) => p.archived).length : 0
}

export function usePatient(id: string | undefined): Patient | undefined {
  return useLiveQuery(() => (id ? db.patients.get(id) : undefined), [id])
}
