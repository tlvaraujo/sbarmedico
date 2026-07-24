import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  Loader2,
  RotateCcw,
  Save,
  ShieldCheck,
  TriangleAlert,
  Wand2,
} from 'lucide-react'
import { deidentify } from '../lib/deident'
import { generateSbar, type GenerateResult } from '../lib/importSbar'
import { putPatient } from '../db/patients'
import { buildSbarText } from '../lib/sbar'
import { STABILITY_BADGE, STABILITY_LABEL } from '../lib/labels'
import { BackButton, Button, PageHeader, inputClass } from '../components/ui'
import { useToast } from '../components/Toast'

const textareaClass = `${inputClass} min-h-[12rem] resize-y font-mono text-sm leading-snug`

export function ImportScreen() {
  const navigate = useNavigate()
  const toast = useToast()
  const [raw, setRaw] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [error, setError] = useState('')

  const deid = useMemo(() => deidentify(raw), [raw])

  async function onGenerate() {
    setStatus('loading')
    setError('')
    try {
      const r = await generateSbar(deid.text)
      if (r.patients.length === 0) {
        setError('Não consegui identificar pacientes no texto. Revise o conteúdo.')
        setStatus('error')
        return
      }
      setResult(r)
      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao gerar.')
      setStatus('error')
    }
  }

  async function onSaveAll() {
    if (!result) return
    for (const p of result.patients) await putPatient(p)
    toast.show(`${result.patients.length} paciente(s) importado(s)`)
    navigate('/')
  }

  function reset() {
    setResult(null)
    setStatus('idle')
    setError('')
  }

  if (status === 'done' && result) {
    return (
      <div>
        <PageHeader title="Revisar importação" left={<BackButton />} />
        <div className="space-y-4 p-3">
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
            <strong>{result.patients.length} paciente(s)</strong> gerado(s). Revise e
            ajuste após salvar — o app entrega um rascunho, você é quem confere.
          </div>

          {result.patients.map((p, i) => {
            const miss = result.missing[i] ?? []
            return (
              <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`rounded-lg px-2 py-0.5 text-sm font-bold ${STABILITY_BADGE[p.stability]}`}
                  >
                    Leito {p.bed || '—'}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {p.initials || 'Sem ID'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {STABILITY_LABEL[p.stability]}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-2.5 font-sans text-[13px] leading-relaxed text-slate-700">
                  {buildSbarText(p, 'compact')}
                </pre>
                {miss.length > 0 && (
                  <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                    <div className="mb-1 flex items-center gap-1 font-semibold">
                      <TriangleAlert className="h-3.5 w-3.5" /> Confirmar:
                    </div>
                    <ul className="list-inside list-disc space-y-0.5">
                      {miss.map((m, j) => (
                        <li key={j}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex gap-2 pb-4">
            <Button onClick={onSaveAll} className="flex-1">
              <Save className="h-4 w-4" /> Salvar {result.patients.length} na lista
            </Button>
            <Button variant="secondary" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> Recomeçar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Importar prontuário" left={<BackButton />} />
      <div className="space-y-4 p-3">
        <p className="text-sm text-slate-600">
          Cole o texto bruto do prontuário (pode ter vários pacientes por leito). A IA
          resume na metodologia <strong>SBAR</strong> e você revisa antes de salvar.
        </p>

        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Cole aqui o texto do prontuário…"
          className={textareaClass}
        />

        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <div className="flex items-center gap-2 font-medium text-slate-700">
            <ShieldCheck className="h-4 w-4 shrink-0 text-teal-600" />
            {deid.total > 0
              ? `${deid.total} identificador(es) serão removidos antes de enviar`
              : 'Nenhum identificador estruturado detectado'}
          </div>
          {deid.total > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              {deid.counts.map((c) => `${c.name} (${c.count})`).join(' · ')}
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-teal-700"
          >
            {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPreview ? 'Ocultar' : 'Ver'} o que será enviado
          </button>
          {showPreview && (
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
              {deid.text || '(vazio)'}
            </pre>
          )}
        </div>

        <p className="text-xs text-slate-400">
          O texto vai para o Claude (Anthropic) para ser resumido — a chave da API fica só
          no servidor. Nomes soltos podem não ser removidos automaticamente; confira a
          prévia. Sempre revise o resultado.
        </p>

        {status === 'error' && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <Button
          onClick={onGenerate}
          disabled={!deid.text.trim() || status === 'loading'}
          className="w-full"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Gerando SBAR…
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" /> Gerar SBAR
            </>
          )}
        </Button>
        {status === 'loading' && (
          <p className="text-center text-xs text-slate-400">Pode levar alguns segundos.</p>
        )}
      </div>
    </div>
  )
}
