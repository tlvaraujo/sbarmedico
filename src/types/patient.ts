// Modelo de dados central. `Patient` é a entidade durável — na Fase 2 a
// evolução (SOAP) reaproveita estes mesmos campos.

export type StabilityStatus = 'estavel' | 'atencao' | 'instavel'

export type CareLevel =
  | 'nao_definido'
  | 'reanimar'
  | 'nao_reanimar'
  | 'cuidados_paliativos'

export type Sex = '' | 'F' | 'M' | 'outro'

export type PendingKind =
  | 'exame'
  | 'parecer'
  | 'conduta'
  | 'procedimento'
  | 'outro'

export interface Device {
  id: string
  type: string // ex.: AVP, AVC, PICC, SVD, SNG, Dreno, O2, VM
  detail?: string // sítio, calibre, "D3" (dia do dispositivo)
}

export interface PendingItem {
  id: string
  kind: PendingKind
  text: string
  done: boolean
}

export interface SbarSections {
  situacao: string // S — situação atual / problema ativo
  historico: string // B — breve histórico relevante
  avaliacao: string // A — avaliação / impressão clínica
  recomendacao: string // R — recomendação / conduta / plano
}

export interface Patient {
  id: string
  createdAt: string
  updatedAt: string

  // Identificação (privacidade por padrão: iniciais + leito)
  bed: string
  initials: string
  fullName?: string
  age?: number | null
  sex?: Sex
  recordNumber?: string

  // Quadro clínico
  admissionDate?: string // ISO (yyyy-mm-dd)
  mainDiagnosis: string
  comorbidities: string[]
  allergies: string // default "Nega"
  devices: Device[]
  pending: PendingItem[]

  // Vigilância / segurança
  watchParams: string
  alertSigns: string
  stability: StabilityStatus
  careLevel: CareLevel

  // Narrativa SBAR (montada + editável)
  sbar: SbarSections

  // Meta
  pinned: boolean
  archived: boolean // plantão encerrado (soft)
}
