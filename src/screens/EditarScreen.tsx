import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Loader2 } from 'lucide-react'
import { db } from '../db/db'
import { putDocument } from '../db/documents'
import { BackButton, PageHeader } from '../components/ui'
import { SbarForm, type SbarValues } from '../components/SbarForm'
import { useToast } from '../components/Toast'

export function EditarScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  // undefined = carregando · null = não encontrado · objeto = documento
  const doc = useLiveQuery(async () => (id ? ((await db.documents.get(id)) ?? null) : null), [id])

  if (doc === undefined) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 dark:text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }
  if (doc === null) return <Navigate to="/" replace />

  const found = doc // narrowed para SbarDocument (mantém o tipo dentro do closure)
  const initial: SbarValues = {
    leito: found.leito,
    identificacao: found.identificacao,
    proporcionalidade: found.proporcionalidade,
    s: found.s,
    b: found.b,
    a: found.a,
    r: found.r,
  }

  async function handleSubmit(v: SbarValues) {
    await putDocument({ ...found, ...v })
    toast.show('Alterações salvas')
    navigate('/')
  }

  return (
    <div>
      <PageHeader title="Editar SBAR" left={<BackButton />} />
      <SbarForm initial={initial} submitLabel="Salvar alterações" onSubmit={handleSubmit} />
    </div>
  )
}
