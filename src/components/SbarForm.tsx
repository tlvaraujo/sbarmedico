import { useState } from 'react'
import type { ReactNode } from 'react'
import { FileText, Loader2, RefreshCw } from 'lucide-react'
import type { Proporcionalidade } from '../types/document'
import { PROPORCIONALIDADE_OPTIONS } from '../types/document'
import type { Section } from '../lib/generate'
import { Button, Field, Select, inputClass } from './ui'
import { useToast } from './Toast'

export interface SbarValues {
  leito: string
  identificacao: string
  proporcionalidade: Proporcionalidade
  s: string
  b: string
  a: string
  r: string[]
}

const areaClass = `${inputClass} resize-y text-sm leading-snug`

function parseBullets(text: string): string[] {
  return text
    .split('\n')
    .map((x) => x.replace(/^[•\-*]\s*/, '').trim())
    .filter(Boolean)
}

function Area({
  label,
  hint,
  value,
  onChange,
  rows,
  onRegen,
  regenBusy,
  regenDisabled,
  footer,
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  rows: number
  onRegen?: () => void
  regenBusy?: boolean
  regenDisabled?: boolean
  footer?: ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{label}</span>
        {onRegen && (
          <button
            type="button"
            onClick={onRegen}
            disabled={regenDisabled}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-teal-700 transition hover:bg-teal-50 disabled:opacity-50 dark:text-teal-300 dark:hover:bg-teal-500/10"
          >
            {regenBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Regerar
          </button>
        )}
      </div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className={areaClass} />
      {hint && <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">{hint}</span>}
      {footer}
    </div>
  )
}

export function SbarForm({
  initial,
  submitLabel,
  onSubmit,
  onRegenerate,
}: {
  initial: SbarValues
  submitLabel: string
  onSubmit: (values: SbarValues) => Promise<void> | void
  /** Só na revisão: regenera uma seção a partir do prontuário (ausente → sem botões). */
  onRegenerate?: (section: Section, current: SbarValues) => Promise<string | string[]>
}) {
  const toast = useToast()
  const [leito, setLeito] = useState(initial.leito)
  const [identificacao, setIdentificacao] = useState(initial.identificacao)
  const [prop, setProp] = useState<Proporcionalidade>(initial.proporcionalidade)
  const [s, setS] = useState(initial.s)
  const [b, setB] = useState(initial.b)
  const [a, setA] = useState(initial.a)
  const [rText, setRText] = useState(initial.r.join('\n'))
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState<Section | null>(null)

  const rItems = parseBullets(rText)
  const rOver = rItems.length > 5

  function values(): SbarValues {
    return {
      leito: leito.trim(),
      identificacao: identificacao.trim(),
      proporcionalidade: prop,
      s: s.trim(),
      b: b.trim(),
      a: a.trim(),
      r: rItems.slice(0, 5),
    }
  }

  async function regen(section: Section) {
    if (!onRegenerate) return
    setRegenerating(section)
    try {
      const result = await onRegenerate(section, values())
      if (section === 'r') {
        setRText((Array.isArray(result) ? result : []).join('\n'))
      } else {
        const text = Array.isArray(result) ? result.join(' ') : result
        if (section === 's') setS(text)
        else if (section === 'b') setB(text)
        else if (section === 'a') setA(text)
      }
      toast.show('Seção regerada')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Falha ao regerar a seção', 'error')
    } finally {
      setRegenerating(null)
    }
  }

  async function submit() {
    setSaving(true)
    try {
      await onSubmit(values())
      // Em caso de sucesso a tela normalmente navega e desmonta este componente.
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Não foi possível salvar', 'error')
      setSaving(false)
    }
  }

  const busy = !!regenerating
  const regenProps = (section: Section) =>
    onRegenerate
      ? { onRegen: () => regen(section), regenBusy: regenerating === section, regenDisabled: busy }
      : {}

  return (
    <div className="space-y-4 p-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Leito">
          <input value={leito} onChange={(e) => setLeito(e.target.value)} maxLength={15} className={inputClass} />
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

      <Area label="S — Situação" hint="Uma linha." value={s} onChange={setS} rows={2} {...regenProps('s')} />
      <Area label="B — Breve histórico" hint="Até 5 linhas." value={b} onChange={setB} rows={5} {...regenProps('b')} />
      <Area label="A — Avaliação" hint="Até 5 linhas." value={a} onChange={setA} rows={5} {...regenProps('a')} />
      <Area
        label="R — Recomendação"
        hint="Um tópico por linha (até 5)."
        value={rText}
        onChange={setRText}
        rows={5}
        {...regenProps('r')}
        footer={
          <span
            className={`mt-1 block text-right text-xs ${rOver ? 'font-semibold text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}
          >
            {rItems.length}/5 tópicos{rOver ? ' — os excedentes serão cortados' : ''}
          </span>
        }
      />

      <Button onClick={submit} disabled={saving || busy} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        {saving ? 'Salvando…' : submitLabel}
      </Button>
    </div>
  )
}
