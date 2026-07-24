export function nowIso(): string {
  return new Date().toISOString()
}

function parse(iso?: string): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d
}

export function formatDate(iso?: string): string {
  const d = parse(iso)
  if (!d) return ''
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(iso?: string): string {
  const d = parse(iso)
  if (!d) return ''
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Dias completos desde a data (para tempo de internação). */
export function daysSince(iso?: string): number | null {
  const d = parse(iso)
  if (!d) return null
  const ms = Date.now() - d.getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
}

/** yyyy-mm-dd de hoje, para pré-preencher inputs de data. */
export function todayInputValue(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
