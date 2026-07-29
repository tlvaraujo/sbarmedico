import Dexie, { type Table } from 'dexie'
import type { SbarDocument } from '../types/document'

// Versão dos dados (para migrações). v2 = redesenho total.
export const APP_DATA_VERSION = 2

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
  }
}

export const db = new SbarDB()
