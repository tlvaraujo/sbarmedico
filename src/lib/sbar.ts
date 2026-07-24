import type { Device, Patient, PendingItem } from '../types/patient'
import { CARE_LEVEL_LABEL, STABILITY_LABEL } from './labels'
import { daysSince, formatDate } from './format'

// O "motor de inteligência" do app: puro, determinístico, sem rede e sem IA.
// Transforma os campos estruturados no texto do SBAR, omitindo toda linha vazia.

export type SbarFormat = 'full' | 'compact'

function fmtDevice(d: Device): string {
  const t = d.type.trim()
  const detail = (d.detail ?? '').trim()
  if (!t && !detail) return ''
  return detail ? `${t} (${detail})` : t
}

function openPending(p: Patient): PendingItem[] {
  return p.pending.filter((i) => !i.done && i.text.trim())
}

function idLine(p: Patient): string {
  const id = [p.initials.trim(), p.fullName?.trim()].filter(Boolean).join(' / ')
  const demo = [
    p.age != null ? `${p.age}a` : '',
    p.sex && p.sex !== 'outro' ? p.sex : '',
  ]
    .filter(Boolean)
    .join(' ')

  const parts = [`Leito ${p.bed.trim() || '—'}`, id || 'Sem ID']
  if (demo) parts.push(demo)
  parts.push(STABILITY_LABEL[p.stability])
  return parts.join(' | ')
}

export function buildSbarText(p: Patient, fmt: SbarFormat = 'full'): string {
  const compact = fmt === 'compact'
  const L: string[] = []

  // --- Cabeçalho ---
  L.push(idLine(p))
  if (p.mainDiagnosis.trim()) L.push(`Dx: ${p.mainDiagnosis.trim()}`)

  const meta: string[] = []
  if (p.admissionDate) {
    const d = daysSince(p.admissionDate)
    meta.push(
      `Internação: ${formatDate(p.admissionDate)}${d != null ? ` (${d}d)` : ''}`,
    )
  }
  if (p.allergies.trim()) meta.push(`Alergias: ${p.allergies.trim()}`)
  if (p.careLevel !== 'nao_definido') {
    meta.push(`Nível de cuidado: ${CARE_LEVEL_LABEL[p.careLevel]}`)
  }
  if (meta.length) L.push(meta.join(' | '))

  // --- SBAR ---
  const lbl = compact
    ? { s: 'S:', b: 'B:', a: 'A:', r: 'R:' }
    : {
        s: 'S (Situação):',
        b: 'B (Breve histórico):',
        a: 'A (Avaliação):',
        r: 'R (Conduta):',
      }
  const sbarBlock: string[] = []
  if (p.sbar.situacao.trim()) sbarBlock.push(`${lbl.s} ${p.sbar.situacao.trim()}`)
  if (p.sbar.historico.trim()) sbarBlock.push(`${lbl.b} ${p.sbar.historico.trim()}`)
  if (p.comorbidities.length) {
    sbarBlock.push(`${compact ? '' : '   '}Comorbidades: ${p.comorbidities.join(', ')}`)
  }
  if (p.sbar.avaliacao.trim()) sbarBlock.push(`${lbl.a} ${p.sbar.avaliacao.trim()}`)
  if (p.sbar.recomendacao.trim()) {
    sbarBlock.push(`${lbl.r} ${p.sbar.recomendacao.trim()}`)
  }
  if (sbarBlock.length) {
    if (!compact) L.push('')
    L.push(...sbarBlock)
  }

  // --- Bloco operacional ---
  const ops: string[] = []
  const devices = p.devices.map(fmtDevice).filter(Boolean)
  const pend = openPending(p)
  if (devices.length) ops.push(`Dispositivos: ${devices.join(', ')}`)
  if (pend.length) ops.push(`Pendências: ${pend.map((i) => i.text.trim()).join('; ')}`)
  if (p.watchParams.trim()) ops.push(`Vigiar: ${p.watchParams.trim()}`)
  if (p.alertSigns.trim()) ops.push(`Sinais de alerta: ${p.alertSigns.trim()}`)
  if (ops.length) {
    if (!compact) L.push('')
    L.push(...ops)
  }

  return L.join('\n').trim()
}

export interface HandoffMeta {
  shift?: string
  author?: string
  date?: string // ISO
}

export function buildHandoffText(
  patients: Patient[],
  meta: HandoffMeta = {},
): string {
  const ordered = [...patients].sort((a, b) =>
    (a.bed || '').localeCompare(b.bed || '', 'pt-BR', { numeric: true }),
  )

  const header: string[] = []
  header.push(
    `PASSAGEM DE PLANTÃO${meta.date ? ` — ${formatDate(meta.date)}` : ''}`,
  )
  const sub: string[] = []
  if (meta.shift?.trim()) sub.push(`Turno: ${meta.shift.trim()}`)
  if (meta.author?.trim()) sub.push(`Médico(a): ${meta.author.trim()}`)
  sub.push(`Pacientes: ${ordered.length}`)
  header.push(sub.join(' | '))

  if (ordered.length === 0) {
    return `${header.join('\n')}\n\n(Sem pacientes ativos.)`
  }

  const sep = `\n${'—'.repeat(38)}\n`
  const body = ordered.map((p) => buildSbarText(p, 'full')).join(sep)
  return `${header.join('\n')}\n\n${body}`.trim()
}
