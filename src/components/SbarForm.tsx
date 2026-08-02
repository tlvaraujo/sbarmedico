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
  b: string[]
  a: string[]
  r: string[]
  camposAusentes: string[]
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
  const [bText, setBText] = useState(initial.b.join('\n'))
  const [aText, setAText] = useState(initial.a.join('\n'))
  const [rText, setRText] = useState(initial.r.join('\n'))
  const [camposText, setCamposText] = useState(initial.camposAusentes.join('\n'))
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState<Section | null>(null)

  function values(): SbarValues {
    return {
      leito: leito.trim(),
      identificacao: identificacao.trim(),
      proporcionalidade: prop,
      s: s.trim(),
      b: parseBullets(bText),
      a: parseBullets(aText),
      r: parseBullets(rText),
      camposAusentes: parseBullets(camposText),
    }
  }

  async function regen(section: Section) {
    if (!onRegenerate) return
    setRegenerating(section)
    try {
      const result = await onRegenerate(section, values())
      if (section === 's') {
        setS(typeof result === 'string' ? result : (result[0] ?? ''))
      } else {
        const joined = (Array.isArray(result) ? result : [result]).join('\n')
        if (section === 'b') setBText(joined)
        else if (section === 'a') setAText(joined)
        else if (section === 'r') setRText(joined)
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
  const countFooter = (t: string) => {
    const n = parseBullets(t).length
    return (
      <span className="mt-1 block text-right text-xs text-slate-400 dark:text-slate-500">
        {n} tópico{n === 1 ? '' : 's'}
      </span>
    )
  }

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

      <Area label="S — Situação" hint="Uma linha — só o problema principal." value={s} onChange={setS} rows={2} {...regenProps('s')} />
      <Area
        label="B — Background"
        hint="Um tópico por linha: terapias em curso (com o dia), comorbidade que muda conduta, dispositivos."
        value={bText}
        onChange={setBText}
        rows={4}
        {...regenProps('b')}
        footer={countFooter(bText)}
      />
      <Area
        label="A — Avaliação"
        hint="Um tópico por linha — problema: status — o que se espera."
        value={aText}
        onChange={setAText}
        rows={4}
        {...regenProps('a')}
        footer={countFooter(aText)}
      />
      <Area
        label="R — Recomendação"
        hint="Um por linha: pendências da janela (com dia) e condutas “Se X: Y”."
        value={rText}
        onChange={setRText}
        rows={5}
        {...regenProps('r')}
        footer={countFooter(rText)}
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
        <span className="mb-1.5 block text-[13px] font-semibold text-amber-800 dark:text-amber-300">
          Não registrado no prontuário
        </span>
        <textarea
          value={camposText}
          onChange={(e) => setCamposText(e.target.value)}
          rows={2}
          placeholder="Itens críticos ausentes (um por linha)"
          className={`${inputClass} resize-y text-sm`}
        />
        <span className="mt-1 block text-xs text-amber-700 dark:text-amber-400/80">
          Ex.: proporcionalidade terapêutica não registrada; sem plano p/ deterioração.
        </span>
      </div>

      <Button onClick={submit} disabled={saving || busy} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        {saving ? 'Salvando…' : submitLabel}
      </Button>
    </div>
  )
}
