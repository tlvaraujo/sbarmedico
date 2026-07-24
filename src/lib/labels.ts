import type {
  CareLevel,
  PendingKind,
  Sex,
  StabilityStatus,
} from '../types/patient'

export const STABILITY_LABEL: Record<StabilityStatus, string> = {
  estavel: 'Estável',
  atencao: 'Atenção',
  instavel: 'Instável',
}

export const STABILITY_OPTIONS: { value: StabilityStatus; label: string }[] = [
  { value: 'estavel', label: 'Estável' },
  { value: 'atencao', label: 'Atenção' },
  { value: 'instavel', label: 'Instável' },
]

/** Classe da bolinha/borda de status (Tailwind). */
export const STABILITY_DOT: Record<StabilityStatus, string> = {
  estavel: 'bg-emerald-500',
  atencao: 'bg-amber-500',
  instavel: 'bg-red-500',
}

export const STABILITY_BADGE: Record<StabilityStatus, string> = {
  estavel: 'bg-emerald-100 text-emerald-700',
  atencao: 'bg-amber-100 text-amber-700',
  instavel: 'bg-red-100 text-red-700',
}

export const CARE_LEVEL_LABEL: Record<CareLevel, string> = {
  nao_definido: 'Não definido',
  reanimar: 'Reanimar (RCP)',
  nao_reanimar: 'Não reanimar (ONR)',
  cuidados_paliativos: 'Cuidados paliativos',
}

export const CARE_LEVEL_OPTIONS = (
  Object.keys(CARE_LEVEL_LABEL) as CareLevel[]
).map((value) => ({ value, label: CARE_LEVEL_LABEL[value] }))

export const PENDING_KIND_LABEL: Record<PendingKind, string> = {
  exame: 'Exame',
  parecer: 'Parecer',
  conduta: 'Conduta',
  procedimento: 'Procedimento',
  outro: 'Outro',
}

export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: '', label: '—' },
  { value: 'F', label: 'F' },
  { value: 'M', label: 'M' },
  { value: 'outro', label: 'Outro' },
]
