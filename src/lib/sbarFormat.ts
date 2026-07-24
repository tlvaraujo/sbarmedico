import type { SbarPatient } from './generate'
import { compareBeds } from './bedSort'

export function isCritical(p: SbarPatient): boolean {
  return p.alert.trim().length > 0
}

export function criticalCount(ps: SbarPatient[]): number {
  return ps.filter(isCritical).length
}

/** Críticos primeiro; depois ordem natural de leito. */
export function sortPatients(ps: SbarPatient[]): SbarPatient[] {
  return [...ps].sort((a, b) => {
    const ca = isCritical(a)
    const cb = isCritical(b)
    if (ca !== cb) return ca ? -1 : 1
    return compareBeds(a.leito, b.leito)
  })
}

function headLabel(p: SbarPatient): string {
  const parts = [p.leito.trim() && `Leito ${p.leito.trim()}`, p.iniciais.trim()].filter(Boolean)
  return parts.join(' · ') || 'Paciente'
}

// --- Texto simples ---
export function toPlainText(p: SbarPatient): string {
  const L: string[] = [headLabel(p)]
  if (p.situation.trim()) L.push(`S (Situação): ${p.situation.trim()}`)
  if (p.background.trim()) L.push(`B (Contexto): ${p.background.trim()}`)
  if (p.assessment.trim()) L.push(`A (Avaliação): ${p.assessment.trim()}`)
  if (p.recommendation.trim()) L.push(`R (Recomendações):\n${p.recommendation.trim()}`)
  if (p.alert.trim()) L.push(`⚠️ ATENÇÃO: ${p.alert.trim()}`)
  return L.join('\n')
}

export function toPlainAll(ps: SbarPatient[]): string {
  const header = `Passagem de Plantão — ${ps.length} paciente(s) (${criticalCount(ps)} crítico(s))`
  const sep = `\n${'─'.repeat(28)}\n`
  return `${header}\n\n${sortPatients(ps).map(toPlainText).join(sep)}`.trim()
}

// --- WhatsApp ---
function whatsBlock(p: SbarPatient): string[] {
  const L: string[] = []
  L.push(`${isCritical(p) ? '🚨 ' : ''}*${headLabel(p)}*`)
  L.push('')
  if (p.situation.trim()) L.push('🔵 *Situação (S)*', p.situation.trim(), '')
  if (p.background.trim()) L.push('🟢 *Contexto (B)*', p.background.trim(), '')
  if (p.assessment.trim()) L.push('🟡 *Avaliação (A)*', p.assessment.trim(), '')
  if (p.recommendation.trim()) L.push('🔴 *Recomendações (R)*', p.recommendation.trim(), '')
  if (p.alert.trim()) L.push(`⚠️ *ATENÇÃO:* ${p.alert.trim()}`, '')
  return L
}

const WHATS_FOOTER = '_Gerado por SBAR Médico · Alpha_'

export function toWhatsApp(p: SbarPatient): string {
  const L = ['🏥 *Passagem de Plantão*', '', ...whatsBlock(p), WHATS_FOOTER]
  return L.join('\n').replace(/\n{3,}/g, '\n\n')
}

export function toWhatsAppAll(ps: SbarPatient[]): string {
  const L: string[] = [
    '🏥 *Passagem de Plantão*',
    `_${ps.length} paciente(s) · ${criticalCount(ps)} crítico(s)_`,
    '',
  ]
  sortPatients(ps).forEach((p, i) => {
    if (i > 0) L.push('➖➖➖➖➖➖', '')
    L.push(...whatsBlock(p))
  })
  L.push(WHATS_FOOTER)
  return L.join('\n').replace(/\n{3,}/g, '\n\n')
}
