import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import type { Proporcionalidade } from '../types/document'
import type { SbarResult, Section } from '../lib/generate'
import { generateSection } from '../lib/generate'
import { getStashedIntake, setStashedIntake } from '../lib/intakeStash'
import { createDocument, putDocument } from '../db/documents'
import { BackButton, PageHeader } from '../components/ui'
import { SbarForm, type SbarValues } from '../components/SbarForm'
import { useToast } from '../components/Toast'

interface RevisarState {
  seed: { leito: string; identificacao: string; proporcionalidade: Proporcionalidade }
  draft: SbarResult
}

export function RevisarScreen() {
  const navigate = useNavigate()
  const toast = useToast()
  const location = useLocation()
  // Captura o prontuário (só memória) uma vez, para o "regerar seção".
  const [intake] = useState(() => getStashedIntake())
  const state = (location.state ?? null) as RevisarState | null

  // Sem rascunho (ex.: recarregou a página) → volta para a entrada.
  if (!state) return <Navigate to="/novo" replace />

  const initial: SbarValues = {
    leito: state.seed.leito,
    identificacao: state.seed.identificacao,
    proporcionalidade: state.seed.proporcionalidade,
    s: state.draft.s,
    b: state.draft.b,
    a: state.draft.a,
    r: state.draft.r,
    camposAusentes: state.draft.camposAusentes,
  }

  async function handleSubmit(v: SbarValues) {
    await putDocument(createDocument({ ...v }))
    setStashedIntake(null) // limpa o prontuário da memória após salvar
    toast.show('Documento salvo na Biblioteca')
    navigate('/')
  }

  const onRegenerate = intake
    ? async (section: Section, current: SbarValues) =>
        generateSection(section, {
          leito: current.leito,
          identificacao: current.identificacao,
          proporcionalidade: current.proporcionalidade,
          text: intake.text,
          images: intake.images,
          pdfs: intake.pdfs,
          current: { s: current.s, b: current.b, a: current.a, r: current.r },
        })
    : undefined

  return (
    <div>
      <PageHeader title="Revisar SBAR" left={<BackButton />} />
      <div className="px-3 pt-3">
        <p className="rounded-xl bg-teal-50 p-3 text-xs text-teal-800 dark:bg-teal-500/10 dark:text-teal-200">
          Rascunho gerado por IA a partir do prontuário. Revise e ajuste antes de gerar o
          documento.{intake ? ' Toque em “Regerar” para refazer só uma seção.' : ''}
        </p>
      </div>
      <SbarForm
        initial={initial}
        submitLabel="Gerar documento"
        onSubmit={handleSubmit}
        onRegenerate={onRegenerate}
      />
    </div>
  )
}
