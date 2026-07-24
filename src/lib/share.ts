/** Copia texto para a área de transferência, com fallback para contextos não seguros. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* tenta o fallback abaixo */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-1000px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}

export function canShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

/** Retorna false se o usuário cancelar ou o recurso não existir. */
export async function shareText(text: string, title = 'SBAR'): Promise<boolean> {
  if (!canShare()) return false
  try {
    await navigator.share({ title, text })
    return true
  } catch {
    return false
  }
}
