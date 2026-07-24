import type { Patient } from '../types/patient'

/**
 * Ordenação natural de leitos: "2" < "10" < "12A" < "12B".
 * Cobre esquemas como "UTI-3", "Enf 2 - L4" de forma razoável.
 */
export function compareBeds(a: string, b: string): number {
  return (a || '').localeCompare(b || '', 'pt-BR', {
    numeric: true,
    sensitivity: 'base',
  })
}

/** Fixados primeiro; depois ordem natural de leito. */
export function sortPatients(patients: Patient[]): Patient[] {
  return [...patients].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return compareBeds(a.bed, b.bed)
  })
}
