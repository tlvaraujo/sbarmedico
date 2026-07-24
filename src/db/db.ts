import Dexie, { type Table } from 'dexie'
import type { Patient } from '../types/patient'

// Versão dos DADOS (vai carimbada nos backups JSON para migração na importação).
// Independente do número de versão do schema do Dexie.
export const APP_DATA_VERSION = 1

export interface MetaRow {
  key: string
  value: unknown
}

export class SbarDB extends Dexie {
  patients!: Table<Patient, string>
  meta!: Table<MetaRow, string>

  constructor() {
    super('sbar-medico')
    // Só indexamos o que é usado em consulta. `archived`/`pinned` são
    // booleanos (não indexáveis no IndexedDB) e são filtrados em memória —
    // o conjunto de um plantão é pequeno (dezenas de registros).
    this.version(1).stores({
      patients: 'id, bed, updatedAt',
      meta: 'key',
    })

    // --- Reserva Fase 2 (aditivo, não-destrutivo) ---
    // this.version(2).stores({
    //   patients: 'id, bed, updatedAt',
    //   evolutions: 'id, patientId, date',
    // })
  }
}

export const db = new SbarDB()
