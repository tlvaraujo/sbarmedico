import { useNavigate, useParams } from 'react-router-dom'
import { Copy, Pencil, Share2 } from 'lucide-react'
import { usePatient } from '../db/patients'
import { useMeta } from '../db/meta'
import { buildSbarText, type SbarFormat } from '../lib/sbar'
import { canShare, copyText, shareText } from '../lib/share'
import { BackButton, Button, PageHeader } from '../components/ui'
import { Segmented } from '../components/inputs'
import { useToast } from '../components/Toast'

export function SbarPreview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const patient = usePatient(id)
  const [fmt, setFmt] = useMeta<SbarFormat>('sbarFormat', 'full')

  if (!patient) {
    return (
      <div>
        <PageHeader title="SBAR" left={<BackButton />} />
        <p className="p-6 text-center text-sm text-slate-500">Carregando…</p>
      </div>
    )
  }

  const text = buildSbarText(patient, fmt)

  async function onCopy() {
    const ok = await copyText(text)
    toast.show(ok ? 'SBAR copiado' : 'Não consegui copiar', ok ? 'ok' : 'error')
  }
  async function onShare() {
    const ok = await shareText(text, `SBAR — Leito ${patient!.bed}`)
    if (!ok && !canShare()) {
      const copied = await copyText(text)
      if (copied) toast.show('Compartilhamento indisponível — copiei o texto')
    }
  }

  return (
    <div>
      <PageHeader
        title={`SBAR — Leito ${patient.bed || '—'}`}
        subtitle={patient.initials || 'Sem ID'}
        left={<BackButton />}
        right={
          <button
            onClick={() => navigate(`/paciente/${patient.id}`)}
            aria-label="Editar"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-200"
          >
            <Pencil className="h-5 w-5" />
          </button>
        }
      />

      <div className="space-y-4 p-3">
        <Segmented
          value={fmt}
          onChange={setFmt}
          options={[
            { value: 'full', label: 'Completo' },
            { value: 'compact', label: 'Compacto' },
          ]}
        />

        <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 font-sans text-[15px] leading-relaxed text-slate-800">
          {text}
        </pre>

        <div className="flex gap-2">
          <Button onClick={onCopy} className="flex-1">
            <Copy className="h-4 w-4" /> Copiar
          </Button>
          {canShare() && (
            <Button onClick={onShare} variant="secondary" className="flex-1">
              <Share2 className="h-4 w-4" /> Compartilhar
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-slate-400">
          Confira sempre antes de usar. Ao compartilhar, o texto pode conter dados
          sensíveis do paciente.
        </p>
      </div>
    </div>
  )
}
