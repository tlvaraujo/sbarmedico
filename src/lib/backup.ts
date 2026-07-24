import { APP_DATA_VERSION, db } from '../db/db'
import { createEmptyPatient } from '../db/patients'
import type { Patient } from '../types/patient'
import { nowIso } from './format'

// Como os dados vivem só no aparelho, o backup JSON é a rede de segurança
// para troca de celular / reinstalação.

export interface BackupFile {
  app: 'sbar-medico'
  version: number
  exportedAt: string
  patients: Patient[]
}

export type ImportMode = 'replace' | 'merge'

export async function buildBackup(): Promise<BackupFile> {
  const patients = await db.patients.toArray()
  return {
    app: 'sbar-medico',
    version: APP_DATA_VERSION,
    exportedAt: nowIso(),
    patients,
  }
}

export function backupFilename(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(
    d.getDate(),
  )}-${pad(d.getHours())}${pad(d.getMinutes())}`
  return `sbar-plantao-${stamp}.json`
}

export async function downloadBackup(): Promise<void> {
  const data = await buildBackup()
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = backupFilename()
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Normaliza um registro (possivelmente antigo/parcial) para o formato atual. */
function migratePatient(raw: Record<string, unknown>): Patient {
  const base = createEmptyPatient()
  const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d)
  const oneOf = <T extends string>(v: unknown, allowed: readonly T[], d: T): T =>
    allowed.includes(v as T) ? (v as T) : d
  const numOrNull = (v: unknown): number | null => {
    if (typeof v === 'number' && !isNaN(v)) return v
    if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v)
    return null
  }
  const sbarRaw = (raw.sbar ?? {}) as Record<string, unknown>
  return {
    id: str(raw.id, base.id),
    createdAt: str(raw.createdAt, base.createdAt),
    updatedAt: str(raw.updatedAt, base.updatedAt),
    bed: str(raw.bed),
    initials: str(raw.initials),
    fullName: str(raw.fullName),
    age: numOrNull(raw.age),
    sex: oneOf(raw.sex, ['', 'F', 'M', 'outro'] as const, ''),
    recordNumber: str(raw.recordNumber),
    admissionDate: str(raw.admissionDate),
    mainDiagnosis: str(raw.mainDiagnosis),
    comorbidities: Array.isArray(raw.comorbidities)
      ? (raw.comorbidities.filter((x) => typeof x === 'string') as string[])
      : [],
    allergies: str(raw.allergies, base.allergies),
    devices: Array.isArray(raw.devices) ? (raw.devices as Patient['devices']) : [],
    pending: Array.isArray(raw.pending) ? (raw.pending as Patient['pending']) : [],
    watchParams: str(raw.watchParams),
    alertSigns: str(raw.alertSigns),
    stability: oneOf(
      raw.stability,
      ['estavel', 'atencao', 'instavel'] as const,
      'estavel',
    ),
    careLevel: oneOf(
      raw.careLevel,
      ['nao_definido', 'reanimar', 'nao_reanimar', 'cuidados_paliativos'] as const,
      'nao_definido',
    ),
    sbar: {
      situacao: str(sbarRaw.situacao),
      historico: str(sbarRaw.historico),
      avaliacao: str(sbarRaw.avaliacao),
      recomendacao: str(sbarRaw.recomendacao),
    },
    pinned: Boolean(raw.pinned),
    archived: Boolean(raw.archived),
  }
}

export function parseBackup(text: string): BackupFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Arquivo inválido: não é um JSON legível.')
  }
  if (!data || typeof data !== 'object') throw new Error('Arquivo inválido.')
  const obj = data as Partial<BackupFile>
  if (obj.app !== 'sbar-medico' || !Array.isArray(obj.patients)) {
    throw new Error('Este arquivo não parece um backup do SBAR Médico.')
  }
  return {
    app: 'sbar-medico',
    version: typeof obj.version === 'number' ? obj.version : 1,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : '',
    patients: (obj.patients as unknown as Record<string, unknown>[]).map(
      migratePatient,
    ),
  }
}

export interface ImportResult {
  imported: number
  mode: ImportMode
}

export async function importBackup(
  text: string,
  mode: ImportMode,
): Promise<ImportResult> {
  const backup = parseBackup(text)
  await db.transaction('rw', db.patients, async () => {
    if (mode === 'replace') await db.patients.clear()
    await db.patients.bulkPut(backup.patients)
  })
  return { imported: backup.patients.length, mode }
}
