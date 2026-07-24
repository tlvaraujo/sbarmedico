import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

// Preferências simples (chave/valor) persistidas localmente: autor da passagem,
// mostrar nome completo, formato padrão do SBAR, etc.

export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const row = await db.meta.get(key)
  return row ? (row.value as T) : fallback
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value })
}

/** Estado reativo persistente, no estilo useState. */
export function useMeta<T>(key: string, fallback: T): [T, (value: T) => void] {
  const row = useLiveQuery(() => db.meta.get(key), [key])
  const value = row ? (row.value as T) : fallback
  const set = (v: T) => {
    void db.meta.put({ key, value: v })
  }
  return [value, set]
}
