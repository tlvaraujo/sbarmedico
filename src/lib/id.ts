// Identificadores únicos. `crypto.randomUUID` exige contexto seguro
// (https/localhost) — o fallback cobre o resto.
export function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID()
    }
  } catch {
    /* ignore */
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
