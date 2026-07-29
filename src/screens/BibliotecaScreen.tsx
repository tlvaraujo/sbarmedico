import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Files, Loader2, Plus, Trash2 } from 'lucide-react'
import { deleteDocument, useAllDocuments } from '../db/documents'
import { downloadBatch, downloadSingle } from '../lib/pdf'
import type { SbarDocument } from '../types/document'
import { formatDateTime } from '../lib/format'
import { Button, PageHeader } from '../components/ui'
import { useToast } from '../components/Toast'

export function BibliotecaScreen() {
  const navigate = useNavigate()
  const toast = useToast()
  const docs = useAllDocuments()
  const [busy, setBusy] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function single(d: SbarDocument) {
    setPendingId(d.id)
    try {
      await downloadSingle(d)
    } catch {
      toast.show('Falha ao gerar o PDF', 'error')
    } finally {
      setPendingId(null)
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
      />

      {docs === undefined ? null : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
            <Files className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Nenhum SBAR ainda</h2>
          <p className="mt-1 max-w-xs text-sm text-slate-500">
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

          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
            {docs.map((d, i) => (
              <li
                key={d.id}
                className="animate-enter flex items-center gap-2 p-3"
                style={{ animationDelay: `${Math.min(i * 40, 320)}ms` }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 rounded-lg bg-teal-50 px-2 py-0.5 text-sm font-bold text-teal-700">
                      {d.leito || '—'}
                    </span>
                    <span className="truncate font-semibold text-slate-800">
                      {d.identificacao || 'Sem identificação'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(d.createdAt)}</p>
                </div>
                <button
                  onClick={() => single(d)}
                  disabled={pendingId === d.id}
                  aria-label="Baixar PDF"
                  className="rounded-lg p-2 text-teal-700 transition hover:bg-teal-50 disabled:opacity-50"
                >
                  {pendingId === d.id ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Download className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={() => remove(d)}
                  aria-label="Excluir"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>

          <p className="px-1 text-center text-xs text-slate-400">
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
