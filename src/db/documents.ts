import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { SbarDocument } from '../types/document'
import { newId } from '../lib/id'
import { nowIso } from '../lib/format'

export function createDocument(
  seed: Omit<SbarDocument, 'id' | 'createdAt'>,
): SbarDocument {
  return { id: newId(), createdAt: nowIso(), ...seed }
}

export async function putDocument(d: SbarDocument): Promise<void> {
  await db.documents.put(d)
}

export async function getDocument(id: string): Promise<SbarDocument | undefined> {
  return db.documents.get(id)
}

export async function deleteDocument(id: string): Promise<void> {
  await db.documents.delete(id)
}

/** Documentos do mais novo para o mais antigo. */
export function useAllDocuments(): SbarDocument[] | undefined {
  return useLiveQuery(() => db.documents.orderBy('createdAt').reverse().toArray(), [])
}

export function useDocument(id: string | undefined): SbarDocument | undefined {
  return useLiveQuery(() => (id ? db.documents.get(id) : undefined), [id])
}
