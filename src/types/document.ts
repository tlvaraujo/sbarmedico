// Modelo do documento SBAR (substitui o antigo Patient).

export type Proporcionalidade =
  | 'suporte_invasivo'
  | 'suporte_nao_invasivo'
  | 'objetivo_nao_definido'

export const PROPORCIONALIDADE_LABEL: Record<Proporcionalidade, string> = {
  suporte_invasivo: 'Suporte invasivo',
  suporte_nao_invasivo: 'Suporte não invasivo individualizado',
  objetivo_nao_definido: 'Objetivo não definido',
}

export const PROPORCIONALIDADE_OPTIONS = (
  Object.keys(PROPORCIONALIDADE_LABEL) as Proporcionalidade[]
).map((value) => ({ value, label: PROPORCIONALIDADE_LABEL[value] }))

export interface SbarDocument {
  id: string
  leito: string
  identificacao: string
  proporcionalidade: Proporcionalidade
  s: string // Situação — 1 linha
  b: string[] // Background — tópicos
  a: string[] // Avaliação — tópicos
  r: string[] // Recomendação — tópicos
  camposAusentes: string[] // itens críticos não registrados no prontuário
  createdAt: string // ISO
}
