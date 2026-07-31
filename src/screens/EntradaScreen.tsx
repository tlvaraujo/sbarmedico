import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  ShieldAlert,
  Wand2,
  X,
} from 'lucide-react'
import type { Proporcionalidade } from '../types/document'
import { PROPORCIONALIDADE_OPTIONS } from '../types/document'
import { buildIntake } from '../lib/intake'
import { generate } from '../lib/generate'
import { setStashedIntake } from '../lib/intakeStash'
import { newId } from '../lib/id'
import { BackButton, Button, Field, PageHeader, Select, inputClass } from '../components/ui'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'

interface Attach {
  id: string
  file: File
  url?: string
}

const textareaClass = `${inputClass} min-h-[8rem] resize-y text-sm leading-snug`

function UploadButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Camera
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white py-3 text-xs font-medium text-slate-600 shadow-sm transition hover:border-teal-300 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-teal-500/50 dark:hover:text-teal-300"
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  )
}

export function EntradaScreen() {
  const navigate = useNavigate()
  const toast = useToast()

  const [leito, setLeito] = useState('')
  const [identificacao, setIdentificacao] = useState('')
  const [prop, setProp] = useState<Proporcionalidade>('objetivo_nao_definido')
  const [pasted, setPasted] = useState('')
  const [attachments, setAttachments] = useState<Attach[]>([])
  const [instrucoes, setInstrucoes] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const camRef = useRef<HTMLInputElement>(null)
  const galRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      attachments.forEach((a) => a.url && URL.revokeObjectURL(a.url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function addFiles(list: FileList | null) {
    if (!list?.length) return
    setError('')
    const add: Attach[] = Array.from(list).map((file) => ({
      id: newId(),
      file,
      url: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }))
    setAttachments((a) => [...a, ...add])
  }

  function removeAttach(id: string) {
    setAttachments((a) => {
      const t = a.find((x) => x.id === id)
      if (t?.url) URL.revokeObjectURL(t.url)
      return a.filter((x) => x.id !== id)
    })
  }

  const canGenerate =
    leito.trim().length > 0 && (attachments.length > 0 || pasted.trim().length > 0)

  async function onGenerate() {
    if (!leito.trim()) {
      setError('Informe o leito.')
      return
    }
    if (!attachments.length && !pasted.trim()) {
      setError('Envie o prontuário (foto, imagem, arquivo ou texto).')
      return
    }
    setError('')
    setLoading(true)
    try {
      const intake = await buildIntake(
        attachments.map((a) => a.file),
        pasted,
      )
      if (intake.skipped.length) {
        toast.show(`Não suportado: ${intake.skipped.join(', ')} — envie PDF ou DOCX`, 'error')
      }
      if (!intake.text && !intake.images.length && !intake.pdfs.length) {
        setError('Não consegui ler o prontuário enviado. Tente outro formato.')
        setLoading(false)
        return
      }
      // Guarda o prontuário só em memória para permitir "regerar seção" na revisão.
      setStashedIntake({ text: intake.text, images: intake.images, pdfs: intake.pdfs })
      const draft = await generate({
        leito: leito.trim(),
        identificacao: identificacao.trim(),
        proporcionalidade: prop,
        text: intake.text,
        images: intake.images,
        pdfs: intake.pdfs,
      })
      navigate('/revisar', {
        state: {
          seed: { leito: leito.trim(), identificacao: identificacao.trim(), proporcionalidade: prop },
          draft,
        },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao gerar o SBAR.')
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Novo SBAR"
        left={<BackButton />}
        right={
          <button
            onClick={() => setInstrucoes(true)}
            aria-label="Instruções"
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/5"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        }
      />

      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => addFiles(e.target.files)} />
      <input ref={galRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />

      <div className="space-y-4 p-3">
        <Field label="Leito">
          <input
            value={leito}
            onChange={(e) => setLeito(e.target.value)}
            maxLength={15}
            placeholder="7B14"
            autoFocus
            className={inputClass}
          />
        </Field>

        <Field label="Identificação do paciente" hint="Iniciais + idade + tempo de internação.">
          <input
            value={identificacao}
            onChange={(e) => setIdentificacao(e.target.value)}
            maxLength={100}
            placeholder="R.R.R — 32a — 50 dias internado"
            className={inputClass}
          />
          <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Em conformidade com a LGPD, utilize apenas as iniciais. Não insira nome
              completo, CPF, nº de prontuário ou dado identificável.
            </span>
          </div>
        </Field>

        <Field label="Proporcionalidade terapêutica">
          <Select value={prop} onChange={setProp} options={PROPORCIONALIDADE_OPTIONS} />
        </Field>

        <Field label="Prontuário" hint="Envie o prontuário completo (pode ter várias páginas).">
          <div className="grid grid-cols-3 gap-2">
            <UploadButton icon={Camera} label="Foto" onClick={() => camRef.current?.click()} />
            <UploadButton icon={ImageIcon} label="Galeria" onClick={() => galRef.current?.click()} />
            <UploadButton icon={Paperclip} label="Arquivo" onClick={() => fileRef.current?.click()} />
          </div>

          {attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {attachments.map((att) =>
                att.url ? (
                  <div key={att.id} className="relative">
                    <img src={att.url} alt="" className="h-16 w-16 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />
                    <button
                      onClick={() => removeAttach(att.id)}
                      aria-label="Remover"
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-slate-900 p-0.5 text-white dark:bg-slate-100 dark:text-slate-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    key={att.id}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
                    <span className="max-w-[8rem] truncate">{att.file.name}</span>
                    <button onClick={() => removeAttach(att.id)} aria-label="Remover" className="text-slate-400 hover:text-red-600 dark:text-slate-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ),
              )}
            </div>
          )}

          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="…ou cole aqui o texto do prontuário"
            className={`${textareaClass} mt-2`}
          />
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Imagens/PDF não são anonimizados automaticamente — o resultado usa iniciais.
            Confira sempre.
          </p>
        </Field>

        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <Button onClick={onGenerate} disabled={!canGenerate || loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Gerando SBAR…
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" /> Gerar SBAR
            </>
          )}
        </Button>
        {loading && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            Pode levar alguns segundos.
          </p>
        )}
      </div>

      <Modal open={instrucoes} onClose={() => setInstrucoes(false)} title="Como preencher">
        <div className="space-y-3">
          <div>
            <strong className="text-slate-800 dark:text-slate-100">Leito</strong> — no formato do seu
            hospital. Ex.: <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">7B14</code>.
          </div>
          <div>
            <strong className="text-slate-800 dark:text-slate-100">Identificação</strong> — iniciais,
            idade e tempo de internação. Ex.: <em>R.R.R — 32a — 50 dias</em> (para “Renata Rocha
            Ramalho, 32 anos”). <strong>Nunca</strong> use nome completo, CPF ou nº de
            prontuário (LGPD).
          </div>
          <div>
            <strong className="text-slate-800 dark:text-slate-100">Proporcionalidade terapêutica</strong> —
            Suporte invasivo · Suporte não invasivo individualizado · Objetivo não definido.
          </div>
          <div>
            <strong className="text-slate-800 dark:text-slate-100">Prontuário</strong> — envie o
            prontuário completo por <em>foto</em>, <em>galeria</em>, <em>arquivo</em> (PDF/DOCX/TXT) ou
            <em> colando o texto</em>. Pode enviar várias páginas de uma vez. A IA usa só o
            que está no prontuário — nunca inventa; o que faltar vira “não informado no
            prontuário”.
          </div>
        </div>
      </Modal>
    </div>
  )
}
