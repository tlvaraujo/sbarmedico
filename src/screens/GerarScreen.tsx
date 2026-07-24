import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera,
  ChevronDown,
  Copy,
  FileText,
  Loader2,
  MessageCircle,
  Mic,
  Paperclip,
  ShieldCheck,
  Square,
  Wand2,
  X,
} from 'lucide-react'
import {
  blobToBase64,
  downscaleImage,
  generate,
  transcribe,
  type ImageInput,
  type SbarPatient,
} from '../lib/generate'
import { deidentify } from '../lib/deident'
import {
  criticalCount,
  isCritical,
  sortPatients,
  toPlainAll,
  toPlainText,
  toWhatsApp,
  toWhatsAppAll,
} from '../lib/sbarFormat'
import { copyText } from '../lib/share'
import { Button, PageHeader, inputClass } from '../components/ui'
import { Segmented } from '../components/inputs'
import { useToast } from '../components/Toast'

type Mode = 'texto' | 'audio' | 'camera' | 'arquivo'
type Status = 'idle' | 'recording' | 'transcribing' | 'generating' | 'done' | 'error'

const textareaClass = `${inputClass} min-h-[11rem] resize-y text-sm leading-snug`

function pickAudioMime(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/ogg;codecs=opus',
  ]
  const MR = window.MediaRecorder
  if (MR?.isTypeSupported) for (const m of candidates) if (MR.isTypeSupported(m)) return m
  return ''
}

function DeidNote({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  const d = useMemo(() => deidentify(text), [text])
  if (!text.trim()) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs">
      <div className="flex items-center gap-1.5 font-medium text-slate-600">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal-600" />
        {d.total > 0
          ? `${d.total} identificador(es) removidos antes de enviar (CPF/tel/e-mail)`
          : 'Nenhum CPF/telefone/e-mail detectado'}
      </div>
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="mt-1 font-medium text-teal-700"
      >
        {show ? 'Ocultar' : 'Ver'} o que será enviado
      </button>
      {show && (
        <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-slate-600">
          {d.text}
        </pre>
      )}
    </div>
  )
}

function SectionBlock({
  emoji,
  label,
  text,
  className,
  onCopy,
}: {
  emoji: string
  label: string
  text: string
  className: string
  onCopy: () => void
}) {
  if (!text.trim()) return null
  return (
    <div className={`rounded-lg p-2.5 ${className}`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-bold">
          {emoji} {label}
        </span>
        <button
          onClick={onCopy}
          aria-label={`Copiar ${label}`}
          className="rounded p-1 opacity-70 hover:opacity-100"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-snug">{text.trim()}</p>
    </div>
  )
}

function PatientResultCard({ p }: { p: SbarPatient }) {
  const toast = useToast()
  const crit = isCritical(p)
  const copy = async (t: string) => {
    const ok = await copyText(t)
    toast.show(ok ? 'Copiado' : 'Não consegui copiar', ok ? 'ok' : 'error')
  }
  return (
    <details
      open={crit}
      className={`overflow-hidden rounded-2xl border bg-white ${
        crit ? 'border-red-400' : 'border-slate-200'
      }`}
    >
      <summary
        className={`flex cursor-pointer items-center gap-2 p-3 ${crit ? 'bg-red-50' : ''}`}
      >
        {crit && <span className="text-lg leading-none">🚨</span>}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-bold text-slate-900">Leito {p.leito || '—'}</span>
          <span className="text-slate-600">{p.iniciais || 'Sem ID'}</span>
          {crit && (
            <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              CRÍTICO
            </span>
          )}
        </div>
        <ChevronDown className="section-chevron h-4 w-4 shrink-0 text-slate-400" />
      </summary>

      <div className="space-y-2 p-3 pt-0">
        {crit && (
          <div className="rounded-lg bg-red-100 p-2.5 text-sm text-red-800">
            <span className="font-bold">⚠️ ATENÇÃO: </span>
            {p.alert.trim()}
          </div>
        )}
        <SectionBlock emoji="🔵" label="Situação (S)" text={p.situation} className="bg-blue-50 text-blue-900" onCopy={() => copy(p.situation.trim())} />
        <SectionBlock emoji="🟢" label="Contexto (B)" text={p.background} className="bg-emerald-50 text-emerald-900" onCopy={() => copy(p.background.trim())} />
        <SectionBlock emoji="🟡" label="Avaliação (A)" text={p.assessment} className="bg-amber-50 text-amber-900" onCopy={() => copy(p.assessment.trim())} />
        <SectionBlock emoji="🔴" label="Recomendações (R)" text={p.recommendation} className="bg-rose-50 text-rose-900" onCopy={() => copy(p.recommendation.trim())} />
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={() => copy(toPlainText(p))}>
            <Copy className="h-4 w-4" /> Copiar
          </Button>
          <Button className="flex-1" onClick={() => copy(toWhatsApp(p))}>
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </Button>
        </div>
      </div>
    </details>
  )
}

export function GerarScreen() {
  const toast = useToast()
  const [mode, setMode] = useState<Mode>('texto')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState<SbarPatient[] | null>(null)

  // Texto / Áudio
  const [raw, setRaw] = useState('')
  const [transcript, setTranscript] = useState('')
  const [elapsed, setElapsed] = useState(0)

  // Câmera / Arquivo
  const [images, setImages] = useState<ImageInput[]>([])
  const [thumbs, setThumbs] = useState<string[]>([])
  const [pdf, setPdf] = useState<{ data: string; name: string } | null>(null)

  const camRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      thumbs.forEach((u) => URL.revokeObjectURL(u))
      if (timerRef.current) clearInterval(timerRef.current)
      if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function fail(msg: string) {
    setError(msg)
    setStatus('error')
  }

  // --- Áudio ---
  async function startRecording() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = pickAudioMime()
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data)
      }
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const type = mr.mimeType || mime || 'audio/webm'
        void handleAudioBlob(new Blob(chunksRef.current, { type }), type)
      }
      mr.start()
      recRef.current = mr
      setStatus('recording')
      setElapsed(0)
      timerRef.current = window.setInterval(() => {
        setElapsed((e) => {
          if (e + 1 >= 90) stopRecording()
          return e + 1
        })
      }, 1000)
    } catch {
      fail('Não consegui acessar o microfone. Permita o acesso e tente de novo.')
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop()
  }

  async function handleAudioBlob(blob: Blob, mime: string) {
    if (blob.size > 3_300_000) {
      fail('Áudio muito longo. Grave um trecho menor.')
      return
    }
    setStatus('transcribing')
    try {
      const text = await transcribe(await blobToBase64(blob), mime)
      setTranscript((prev) => (prev ? `${prev}\n${text}` : text))
      setStatus('idle')
    } catch (e) {
      fail(e instanceof Error ? e.message : 'Falha ao transcrever o áudio.')
    }
  }

  // --- Câmera / Arquivo ---
  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return
    setError('')
    const list = Array.from(files)
    const pdfFile = list.find((f) => f.type === 'application/pdf')
    if (pdfFile) {
      thumbs.forEach((u) => URL.revokeObjectURL(u))
      setThumbs([])
      setImages([])
      setPdf({ data: await blobToBase64(pdfFile), name: pdfFile.name })
      return
    }
    const imgFiles = list.filter((f) => f.type.startsWith('image/')).slice(0, 4)
    if (!imgFiles.length) return
    const inputs: ImageInput[] = []
    const t: string[] = []
    for (const f of imgFiles) {
      inputs.push(await downscaleImage(f))
      t.push(URL.createObjectURL(f))
    }
    thumbs.forEach((u) => URL.revokeObjectURL(u))
    setPdf(null)
    setImages(inputs)
    setThumbs(t)
  }

  function clearAttachments() {
    thumbs.forEach((u) => URL.revokeObjectURL(u))
    setThumbs([])
    setImages([])
    setPdf(null)
  }

  const canGenerate =
    (mode === 'texto' && raw.trim().length > 0) ||
    (mode === 'audio' && transcript.trim().length > 0) ||
    ((mode === 'camera' || mode === 'arquivo') && (images.length > 0 || !!pdf))

  async function onGenerate() {
    setError('')
    setStatus('generating')
    try {
      let patients: SbarPatient[]
      if (mode === 'texto') patients = await generate({ text: deidentify(raw).text })
      else if (mode === 'audio') patients = await generate({ text: deidentify(transcript).text })
      else if (pdf) patients = await generate({ pdf: { data: pdf.data } })
      else patients = await generate({ images })

      if (!patients.length) {
        fail('Não consegui identificar pacientes. Revise o conteúdo enviado.')
        return
      }
      setResult(patients)
      setStatus('done')
    } catch (e) {
      fail(e instanceof Error ? e.message : 'Falha ao gerar o SBAR.')
    }
  }

  function reset() {
    setResult(null)
    setStatus('idle')
    setError('')
  }

  // ---------- Resultado ----------
  if (status === 'done' && result) {
    const crit = criticalCount(result)
    const sorted = sortPatients(result)
    const copyAll = async (t: string) => {
      const ok = await copyText(t)
      toast.show(ok ? 'Copiado' : 'Não consegui copiar', ok ? 'ok' : 'error')
    }
    return (
      <div>
        <PageHeader
          title="Passagem de Plantão"
          subtitle={`${result.length} paciente(s) · ${crit} crítico(s)`}
          right={
            <button
              onClick={reset}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-slate-200"
            >
              Novo
            </button>
          }
        />
        <div className="space-y-3 p-3">
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => copyAll(toPlainAll(result))}>
              <Copy className="h-4 w-4" /> Copiar tudo
            </Button>
            <Button className="flex-1" onClick={() => copyAll(toWhatsAppAll(result))}>
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </Button>
          </div>
          {sorted.map((p, i) => (
            <PatientResultCard key={`${p.leito}-${p.iniciais}-${i}`} p={p} />
          ))}
          <p className="pb-4 pt-1 text-center text-xs text-slate-400">
            Rascunho gerado por IA. Confira sempre antes de usar.
          </p>
        </div>
      </div>
    )
  }

  // ---------- Entrada ----------
  const busy = status === 'generating' || status === 'transcribing'
  return (
    <div>
      <PageHeader title="Gerar SBAR" subtitle="Texto, áudio, foto ou PDF → SBAR" />
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      <div className="space-y-4 p-3">
        <Segmented
          value={mode}
          onChange={(m) => {
            setMode(m)
            setError('')
          }}
          options={[
            { value: 'texto', label: '📝 Texto' },
            { value: 'audio', label: '🎙️ Áudio' },
            { value: 'camera', label: '📷 Câmera' },
            { value: 'arquivo', label: '📎 Arquivo' },
          ]}
        />

        {mode === 'texto' && (
          <>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="Cole o texto do prontuário (pode ter vários pacientes por leito)…"
              className={textareaClass}
            />
            <DeidNote text={raw} />
          </>
        )}

        {mode === 'audio' && (
          <div className="space-y-3">
            {status === 'recording' ? (
              <button
                onClick={stopRecording}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 font-semibold text-white"
              >
                <Square className="h-4 w-4 fill-current" /> Parar ({elapsed}s)
              </button>
            ) : (
              <Button
                variant="secondary"
                className="w-full"
                onClick={startRecording}
                disabled={busy}
              >
                {status === 'transcribing' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Transcrevendo…
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" /> {transcript ? 'Gravar mais' : 'Gravar áudio'}
                  </>
                )}
              </Button>
            )}
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="A transcrição aparece aqui — pode editar antes de gerar."
              className={textareaClass}
            />
            <DeidNote text={transcript} />
          </div>
        )}

        {(mode === 'camera' || mode === 'arquivo') && (
          <div className="space-y-3">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => (mode === 'camera' ? camRef : fileRef).current?.click()}
            >
              {mode === 'camera' ? (
                <>
                  <Camera className="h-4 w-4" /> Abrir câmera
                </>
              ) : (
                <>
                  <Paperclip className="h-4 w-4" /> Escolher imagem ou PDF
                </>
              )}
            </Button>

            {pdf && (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <FileText className="h-5 w-5 shrink-0 text-teal-600" />
                <span className="min-w-0 flex-1 truncate">{pdf.name}</span>
                <button onClick={clearAttachments} aria-label="Remover" className="text-slate-400 hover:text-red-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {thumbs.map((u, i) => (
                  <img key={i} src={u} alt="" className="h-20 w-20 rounded-lg border border-slate-200 object-cover" />
                ))}
                <button
                  onClick={clearAttachments}
                  className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400"
                >
                  <X className="h-4 w-4" /> limpar
                </button>
              </div>
            )}

            <p className="text-xs text-slate-400">
              Imagem/PDF não passam por anonimização automática — o resultado é gerado com
              iniciais no lugar do nome. Confira sempre.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <Button onClick={onGenerate} disabled={!canGenerate || busy} className="w-full">
          {status === 'generating' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Gerando SBAR…
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" /> Gerar SBAR
            </>
          )}
        </Button>

        <p className="text-center text-xs text-slate-400">
          A chave da IA fica só no servidor. O app entrega um rascunho — você revisa.
        </p>
      </div>
    </div>
  )
}
