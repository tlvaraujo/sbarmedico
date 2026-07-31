import type { SbarDocument } from '../types/document'
import { PROPORCIONALIDADE_LABEL } from '../types/document'

/** SBAR em texto puro (para copiar/colar no prontuário eletrônico ou WhatsApp). */
export function sbarToText(d: SbarDocument): string {
  const lines: string[] = [`SBAR — Leito ${d.leito || '—'}`]
  if (d.identificacao) lines.push(d.identificacao)
  lines.push(`Proporcionalidade: ${PROPORCIONALIDADE_LABEL[d.proporcionalidade]}`)
  lines.push('', 'S — Situação', d.s || '—')
  lines.push('', 'B — Breve histórico', d.b || '—')
  lines.push('', 'A — Avaliação', d.a || '—')
  lines.push('', 'R — Recomendação')
  if (d.r.length) for (const it of d.r) lines.push(`• ${it}`)
  else lines.push('—')
  lines.push('', '— Gerado por SBAR Médico')
  return lines.join('\n')
}

/** Copia texto para a área de transferência, com fallback para contextos antigos. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* tenta o fallback abaixo */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
