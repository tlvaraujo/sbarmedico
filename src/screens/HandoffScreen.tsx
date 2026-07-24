import { Copy, Printer, Share2 } from 'lucide-react'
import { useActivePatients } from '../db/patients'
import { useMeta } from '../db/meta'
import { buildHandoffText } from '../lib/sbar'
import { canShare, copyText, shareText } from '../lib/share'
import { Button, Field, PageHeader, inputClass } from '../components/ui'
import { useToast } from '../components/Toast'
import { nowIso } from '../lib/format'

export function HandoffScreen() {
  const toast = useToast()
  const patients = useActivePatients()
  const [shift, setShift] = useMeta('handoffShift', '')
  const [author, setAuthor] = useMeta('handoffAuthor', '')

  const text = patients
    ? buildHandoffText(patients, { shift, author, date: nowIso() })
    : ''
  const count = patients?.length ?? 0

  async function onCopy() {
    const ok = await copyText(text)
    toast.show(ok ? 'Passagem copiada' : 'Não consegui copiar', ok ? 'ok' : 'error')
  }
  async function onShare() {
    await shareText(text, 'Passagem de plantão')
  }

  return (
    <div>
      <PageHeader
        title="Passagem"
        subtitle={patients ? `${count} paciente${count === 1 ? '' : 's'}` : 'Carregando…'}
        className="no-print"
      />

      <div className="no-print space-y-4 p-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Turno">
            <input
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              placeholder="Ex.: Noturno"
              className={inputClass}
            />
          </Field>
          <Field label="Médico(a)">
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Seu nome"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={onCopy} disabled={count === 0}>
            <Copy className="h-4 w-4" /> Copiar tudo
          </Button>
          {canShare() && (
            <Button onClick={onShare} variant="secondary" disabled={count === 0}>
              <Share2 className="h-4 w-4" /> Compartilhar
            </Button>
          )}
          <Button onClick={() => window.print()} variant="secondary" disabled={count === 0}>
            <Printer className="h-4 w-4" /> Imprimir / PDF
          </Button>
        </div>

        <p className="text-xs text-slate-400">
          Ao compartilhar ou imprimir, lembre-se: o conteúdo pode conter dados
          sensíveis do paciente.
        </p>
      </div>

      <div className="px-3 pb-6">
        <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 font-sans text-sm leading-relaxed text-slate-800 print:border-0 print:p-0 print:text-[12px]">
          {count === 0 ? 'Sem pacientes ativos no plantão.' : text}
        </pre>
      </div>
    </div>
  )
}
