import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Files, Loader2, Pencil, Plus, Share2, Trash2 } from 'lucide-react'
import { deleteDocument, useAllDocuments } from '../db/documents'
import { downloadBatch, downloadSingle, sharePdf } from '../lib/pdf'
import type { SbarDocument } from '../types/document'
import { formatDateTime } from '../lib/format'
import { Button, PageHeader, ThemeToggle } from '../components/ui'
import { useToast } from '../components/Toast'

function RowAction({
  icon: Icon,
  label,
  onClick,
  busy,
  tone = 'default',
}: {
  icon: typeof Download
  label: string
  onClick: () => void
  busy?: boolean
  tone?: 'default' | 'teal' | 'danger'
}) {
  const tones = {
    default:
      'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
    teal: 'text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-500/10',
    danger:
      'text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400',
  }
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-50 ${tones[tone]}`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </button>
  )
}

export function BibliotecaScreen() {
  const navigate = useNavigate()
  const toast = useToast()
  const docs = useAllDocuments()
  const [busy, setBusy] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [sharingId, setSharingId] = useState<string | null>(null)

  async function download(d: SbarDocument) {
    setDownloadingId(d.id)
    try {
      await downloadSingle(d)
    } catch {
      toast.show('Falha ao gerar o PDF', 'error')
    } finally {
      setDownloadingId(null)
    }
  }

  async function share(d: SbarDocument) {
    setSharingId(d.id)
    try {
      const r = await sharePdf(d)
      if (r === 'downloaded') toast.show('Compartilhamento indisponível — PDF baixado')
    } catch {
      toast.show('Falha ao compartilhar', 'error')
    } finally {
      setSharingId(null)
    }
  }

  async function batch() {
    if (!docs?.length) return
    setBusy(true)
    try {
      await downloadBatch(docs)
    } catch {
      toast.show('Falha ao gerar o PDF', 'error')
    } finally {
      setBusy(false)
    }
  }

  function remove(d: SbarDocument) {
    if (window.confirm(`Excluir o SBAR do leito ${d.leito || '—'}?`)) {
      void deleteDocument(d.id).then(() => toast.show('Documento excluído'))
    }
  }

  const count = docs?.length ?? 0

  return (
    <div>
      <PageHeader
        title="Biblioteca"
        subtitle={count > 0 ? `${count} SBAR${count > 1 ? 's' : ''}` : 'Seus SBARs gerados'}
        right={<ThemeToggle />}
      />

      {docs === undefined ? null : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300">
            <Files className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Nenhum SBAR ainda</h2>
          <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">
            Gere seu primeiro SBAR a partir do prontuário do paciente.
          </p>
          <Button className="mt-6" onClick={() => navigate('/novo')}>
            <Plus className="h-4 w-4" /> Novo SBAR
          </Button>
        </div>
      ) : (
        <div className="space-y-3 p-3">
          <Button variant="secondary" className="w-full" onClick={batch} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Files className="h-4 w-4" />}
            Baixar todos em um PDF
          </Button>

          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 dark:divide-slate-800 dark:bg-slate-900 dark:ring-white/10">
            {docs.map((d, i) => (
              <li
                key={d.id}
                className="animate-enter p-3"
                style={{ animationDelay: `${Math.min(i * 40, 320)}ms` }}
              >
                <div className="flex items-center gap-2">
                  <span className="shrink-0 rounded-lg bg-teal-50 px-2 py-0.5 text-sm font-bold text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
                    {d.leito || '—'}
                  </span>
                  <span className="truncate font-semibold text-slate-800 dark:text-slate-100">
                    {d.identificacao || 'Sem identificação'}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  {formatDateTime(d.createdAt)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <RowAction
                    icon={Share2}
                    label="Compartilhar"
                    tone="teal"
                    busy={sharingId === d.id}
                    onClick={() => share(d)}
                  />
                  <RowAction
                    icon={Download}
                    label="Baixar"
                    busy={downloadingId === d.id}
                    onClick={() => download(d)}
                  />
                  <RowAction icon={Pencil} label="Editar" onClick={() => navigate(`/editar/${d.id}`)} />
                  <div className="flex-1" />
                  <RowAction icon={Trash2} label="Excluir" tone="danger" onClick={() => remove(d)} />
                </div>
              </li>
            ))}
          </ul>

          <p className="px-1 text-center text-xs text-slate-400 dark:text-slate-500">
            Os documentos ficam só neste aparelho. Baixe (individual ou em lote) para
            guardar ou compartilhar.
          </p>
        </div>
      )}

      {docs && docs.length > 0 && (
        <button
          onClick={() => navigate('/novo')}
          className="fixed bottom-6 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-teal-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-950/25 transition-all hover:bg-teal-700 active:scale-[.97]"
        >
          <Plus className="h-5 w-5" /> Novo SBAR
        </button>
      )}
    </div>
  )
}
