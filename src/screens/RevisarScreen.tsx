import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import type { Proporcionalidade } from '../types/document'
import { PROPORCIONALIDADE_OPTIONS } from '../types/document'
import type { SbarResult } from '../lib/generate'
import { createDocument, putDocument } from '../db/documents'
import { BackButton, Button, Field, PageHeader, Select, inputClass } from '../components/ui'
import { useToast } from '../components/Toast'

interface RevisarState {
  seed: { leito: string; identificacao: string; proporcionalidade: Proporcionalidade }
  draft: SbarResult
}

const areaClass = `${inputClass} resize-y text-sm leading-snug`

export function RevisarScreen() {
  const navigate = useNavigate()
  const toast = useToast()
  const state = (useLocation().state ?? null) as RevisarState | null

  // Hooks rodam sempre; inicializam com o rascunho (ou vazio quando não há state).
  const [leito, setLeito] = useState(state?.seed.leito ?? '')
  const [identificacao, setIdentificacao] = useState(state?.seed.identificacao ?? '')
  const [prop, setProp] = useState<Proporcionalidade>(
    state?.seed.proporcionalidade ?? 'objetivo_nao_definido',
  )
  const [s, setS] = useState(state?.draft.s ?? '')
  const [b, setB] = useState(state?.draft.b ?? '')
  const [a, setA] = useState(state?.draft.a ?? '')
  const [r, setR] = useState((state?.draft.r ?? []).join('\n'))
  const [saving, setSaving] = useState(false)

  // Sem rascunho na navegação (ex.: recarregou a página) → volta para a entrada.
  if (!state) return <Navigate to="/novo" replace />

  const rItems = r
    .split('\n')
    .map((x) => x.replace(/^[•\-*]\s*/, '').trim())
    .filter(Boolean)
  const rOver = rItems.length > 5

  async function onSave() {
    setSaving(true)
    try {
      const doc = createDocument({
        leito: leito.trim(),
        identificacao: identificacao.trim(),
        proporcionalidade: prop,
        s: s.trim(),
        b: b.trim(),
        a: a.trim(),
        r: rItems.slice(0, 5),
      })
      await putDocument(doc)
      toast.show('Documento salvo na Biblioteca')
      navigate('/')
    } catch {
      toast.show('Não foi possível salvar o documento', 'error')
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="Revisar SBAR" left={<BackButton />} />

      <div className="space-y-4 p-3">
        <p className="rounded-xl bg-teal-50 p-3 text-xs text-teal-800">
          Rascunho gerado por IA a partir do prontuário. Revise e ajuste tudo antes de
          gerar o documento.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Leito">
            <input
              value={leito}
              onChange={(e) => setLeito(e.target.value)}
              maxLength={15}
              className={inputClass}
            />
          </Field>
          <Field label="Proporcionalidade">
            <Select value={prop} onChange={setProp} options={PROPORCIONALIDADE_OPTIONS} />
          </Field>
        </div>

        <Field label="Identificação do paciente">
          <input
            value={identificacao}
            onChange={(e) => setIdentificacao(e.target.value)}
            maxLength={100}
            className={inputClass}
          />
        </Field>

        <Field label="S — Situação" hint="Uma linha.">
          <textarea
            value={s}
            onChange={(e) => setS(e.target.value)}
            rows={2}
            className={areaClass}
          />
        </Field>

        <Field label="B — Breve histórico" hint="Até 5 linhas.">
          <textarea
            value={b}
            onChange={(e) => setB(e.target.value)}
            rows={5}
            className={areaClass}
          />
        </Field>

        <Field label="A — Avaliação" hint="Até 5 linhas.">
          <textarea
            value={a}
            onChange={(e) => setA(e.target.value)}
            rows={5}
            className={areaClass}
          />
        </Field>

        <Field label="R — Recomendação" hint="Um tópico por linha (até 5).">
          <textarea
            value={r}
            onChange={(e) => setR(e.target.value)}
            rows={5}
            className={areaClass}
          />
          <span
            className={`mt-1 block text-right text-xs ${rOver ? 'font-semibold text-red-600' : 'text-slate-400'}`}
          >
            {rItems.length}/5 tópicos{rOver ? ' — os excedentes serão cortados' : ''}
          </span>
        </Field>

        <Button onClick={onSave} disabled={saving} className="w-full">
          <FileText className="h-4 w-4" /> {saving ? 'Salvando…' : 'Gerar documento'}
        </Button>
      </div>
    </div>
  )
}
