// Armazenamento persistente reduz o risco de o navegador descartar o
// IndexedDB (sobretudo no iOS). Melhor esforço — nunca lança.

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist()
  } catch {
    /* ignore */
  }
  return false
}

export async function isStoragePersisted(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted) return await navigator.storage.persisted()
  } catch {
    /* ignore */
  }
  return false
}

export async function estimateStorage(): Promise<{
  usage: number
  quota: number
} | null> {
  try {
    if (navigator.storage?.estimate) {
      const e = await navigator.storage.estimate()
      return { usage: e.usage ?? 0, quota: e.quota ?? 0 }
    }
  } catch {
    /* ignore */
  }
  return null
}
