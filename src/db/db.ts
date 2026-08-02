import Dexie, { type Table } from 'dexie'
import type { SbarDocument } from '../types/document'

// Versão dos dados (para migrações). v3 = SBAR de cobertura (B/A viram listas).
export const APP_DATA_VERSION = 3

export interface MetaRow {
  key: string
  value: unknown
}

export class SbarDB extends Dexie {
  documents!: Table<SbarDocument, string>
  meta!: Table<MetaRow, string>

  constructor() {
    super('sbar-medico')
    // v1 (legado): store `patients` — abandonado no redesenho.
    this.version(1).stores({ patients: 'id, bed, updatedAt', meta: 'key' })
    // v2: substituição total — remove `patients` (destrutivo) e adiciona `documents`.
    this.version(2).stores({
      patients: null,
      documents: 'id, createdAt',
      meta: 'key',
    })
    // v3: SBAR de cobertura — B/A passam de string para lista; novo campoAusentes.
    this.version(3)
      .stores({ documents: 'id, createdAt', meta: 'key' })
      .upgrade((tx) =>
        tx
          .table('documents')
          .toCollection()
          .modify((d: Record<string, unknown>) => {
            if (typeof d.b === 'string') d.b = d.b.trim() ? [d.b.trim()] : []
            if (typeof d.a === 'string') d.a = d.a.trim() ? [d.a.trim()] : []
            if (!Array.isArray(d.camposAusentes)) d.camposAusentes = []
          }),
      )
  }
}

export const db = new SbarDB()
