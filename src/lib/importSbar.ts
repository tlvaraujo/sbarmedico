import type { Patient, StabilityStatus } from '../types/patient'
import { createEmptyPatient } from '../db/patients'
import { newId } from './id'

// Formato que o proxy /api/sbar devolve (uma entrada por paciente/leito).
export interface AiPatient {
  bed: string
  initials: string
  age: string
  sex: string
  mainDiagnosis: string
  comorbidities: string[]
  allergies: string
  devices: string[]
  pending: string[]
  watchParams: string
  alertSigns: string
  stability: string
  situacao: string
  historico: string
  avaliacao: string
  recomendacao: string
  missing: string[]
}

export interface GenerateResult {
  patients: Patient[]
  missing: string[][]
}

function toPatient(a: AiPatient): Patient {
  const base = createEmptyPatient()
  const stability: StabilityStatus = (
    ['estavel', 'atencao', 'instavel'] as const
  ).includes(a.stability as StabilityStatus)
    ? (a.stability as StabilityStatus)
    : 'estavel'
  const ageStr = String(a.age ?? '').trim()
  return {
    ...base,
    bed: a.bed ?? '',
    initials: a.initials ?? '',
    age: /^\d{1,3}$/.test(ageStr) ? Number(ageStr) : null,
    sex: (['', 'F', 'M', 'outro'].includes(a.sex) ? a.sex : '') as Patient['sex'],
    mainDiagnosis: a.mainDiagnosis ?? '',
    comorbidities: Array.isArray(a.comorbidities)
      ? a.comorbidities.filter((c) => typeof c === 'string' && c.trim())
      : [],
    allergies: a.allergies?.trim() ? a.allergies.trim() : 'Nega',
    devices: (Array.isArray(a.devices) ? a.devices : [])
      .filter((d) => typeof d === 'string' && d.trim())
      .map((d) => ({ id: newId(), type: d.trim(), detail: '' })),
    pending: (Array.isArray(a.pending) ? a.pending : [])
      .filter((p) => typeof p === 'string' && p.trim())
      .map((text) => ({ id: newId(), kind: 'conduta' as const, text: text.trim(), done: false })),
    watchParams: a.watchParams ?? '',
    alertSigns: a.alertSigns ?? '',
    stability,
    sbar: {
      situacao: a.situacao ?? '',
      historico: a.historico ?? '',
      avaliacao: a.avaliacao ?? '',
      recomendacao: a.recomendacao ?? '',
    },
  }
}

export async function generateSbar(deidentifiedText: string): Promise<GenerateResult> {
  let resp: Response
  try {
    resp = await fetch('/api/sbar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: deidentifiedText }),
    })
  } catch {
    throw new Error('Sem conexão com o servidor de IA. Verifique a internet.')
  }

  if (resp.status === 404) {
    throw new Error(
      'O gerador por IA não está disponível neste endereço. Use o app publicado na Vercel.',
    )
  }
  if (!resp.ok) {
    let msg = `Erro ${resp.status}`
    try {
      const body = (await resp.json()) as { error?: string }
      if (body?.error) msg = body.error
    } catch {
      /* mantém msg genérica */
    }
    throw new Error(msg)
  }

  const data = (await resp.json()) as { patients?: AiPatient[] }
  const list = Array.isArray(data.patients) ? data.patients : []
  return {
    patients: list.map(toPatient),
    missing: list.map((p) => (Array.isArray(p.missing) ? p.missing : [])),
  }
}
