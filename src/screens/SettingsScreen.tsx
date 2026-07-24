import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import {
  Archive,
  Database,
  Download,
  HardDrive,
  Info,
  Lock,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  archiveActivePatients,
  deleteAllPatients,
  deleteArchivedPatients,
  useActivePatients,
  useArchivedCount,
} from '../db/patients'
import { downloadBackup, importBackup, type ImportMode } from '../lib/backup'
import { useMeta } from '../db/meta'
import { hashPin } from '../lib/pin'
import {
  estimateStorage,
  isStoragePersisted,
  requestPersistentStorage,
} from '../lib/storage'
import { Button, PageHeader } from '../components/ui'
import { useToast } from '../components/Toast'
import { APP_DATA_VERSION } from '../db/db'

function formatBytes(n: number): string {
  if (!n) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)))
  return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`
}

function Card({
  title,
  icon,
  children,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
        {icon}
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-teal-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? 'left-[1.375rem]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )
}

export function SettingsScreen() {
  const toast = useToast()
  const active = useActivePatients()
  const archivedCount = useArchivedCount()
  const activeCount = active?.length ?? 0

  const [showFullName, setShowFullName] = useMeta('showFullName', false)
  const [autoExport, setAutoExport] = useMeta('autoExportOnArchive', true)
  const [pinHash, setPinHash] = useMeta('pinHash', '')

  const fileRef = useRef<HTMLInputElement>(null)
  const modeRef = useRef<ImportMode>('merge')

  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null)

  useEffect(() => {
    void isStoragePersisted().then(setPersisted)
    void estimateStorage().then(setUsage)
  }, [])

  function pickImport(mode: ImportMode) {
    modeRef.current = mode
    fileRef.current?.click()
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget
    const file = input.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const res = await importBackup(text, modeRef.current)
      toast.show(
        `${res.imported} paciente(s) ${res.mode === 'replace' ? 'restaurado(s)' : 'mesclado(s)'}`,
      )
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Falha ao importar', 'error')
    } finally {
      input.value = ''
    }
  }

  async function exportar() {
    await downloadBackup()
    toast.show('Backup exportado')
  }

  async function encerrar() {
    if (activeCount === 0) {
      toast.show('Nenhum paciente ativo')
      return
    }
    if (
      !window.confirm(
        `Encerrar o plantão vai ARQUIVAR ${activeCount} paciente(s) ativo(s). Eles saem da lista, mas ficam guardados. Continuar?`,
      )
    )
      return
    if (autoExport) await downloadBackup()
    const n = await archiveActivePatients()
    toast.show(`${n} paciente(s) arquivado(s)`)
  }

  async function limparArquivados() {
    if (
      !window.confirm(`Excluir ${archivedCount} paciente(s) arquivado(s) permanentemente?`)
    )
      return
    const n = await deleteArchivedPatients()
    toast.show(`${n} arquivado(s) excluído(s)`)
  }

  async function apagarTudo() {
    if (
      !window.confirm(
        'Isto apaga TODOS os pacientes (ativos e arquivados) deste aparelho. Não dá para desfazer. Continuar?',
      )
    )
      return
    await deleteAllPatients()
    toast.show('Todos os dados foram apagados')
  }

  async function proteger() {
    const ok = await requestPersistentStorage()
    const now = ok || (await isStoragePersisted())
    setPersisted(now)
    toast.show(
      now
        ? 'Dados protegidos neste aparelho'
        : 'O navegador não confirmou a proteção',
      now ? 'ok' : 'error',
    )
  }

  async function definirPin() {
    const a = window.prompt('Crie um PIN (mínimo 4 dígitos):')
    if (a == null) return
    const pin = a.trim()
    if (pin.length < 4) {
      toast.show('PIN muito curto (mín. 4)', 'error')
      return
    }
    const b = window.prompt('Confirme o PIN:')
    if (b == null) return
    if (pin !== b.trim()) {
      toast.show('Os PINs não coincidem', 'error')
      return
    }
    setPinHash(await hashPin(pin))
    toast.show('PIN definido')
  }

  function removerPin() {
    setPinHash('')
    toast.show('PIN removido')
  }

  return (
    <div>
      <PageHeader title="Ajustes" />
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        onChange={onFile}
        className="hidden"
      />

      <div className="space-y-4 p-3">
        <Card title="Backup dos dados" icon={<Database className="h-4 w-4 text-teal-600" />}>
          <p className="text-xs text-slate-500">
            Os dados ficam só neste aparelho. Exporte um backup antes de trocar de
            celular ou reinstalar.
          </p>
          <Button onClick={exportar} className="w-full">
            <Download className="h-4 w-4" /> Exportar backup (.json)
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => pickImport('merge')}>
              <Upload className="h-4 w-4" /> Mesclar
            </Button>
            <Button variant="secondary" onClick={() => pickImport('replace')}>
              <Upload className="h-4 w-4" /> Substituir
            </Button>
          </div>
        </Card>

        <Card title="Plantão" icon={<Archive className="h-4 w-4 text-teal-600" />}>
          <Toggle
            checked={autoExport}
            onChange={setAutoExport}
            label="Baixar backup antes de encerrar"
            hint="Segurança extra ao arquivar o plantão."
          />
          <Button variant="secondary" onClick={encerrar} className="w-full">
            <Archive className="h-4 w-4" /> Encerrar plantão (arquivar ativos)
          </Button>
          {archivedCount > 0 && (
            <Button variant="ghost" onClick={limparArquivados} className="w-full text-red-600">
              <Trash2 className="h-4 w-4" /> Excluir arquivados ({archivedCount})
            </Button>
          )}
        </Card>

        <Card
          title="Privacidade"
          icon={<ShieldCheck className="h-4 w-4 text-teal-600" />}
        >
          <Toggle
            checked={showFullName}
            onChange={setShowFullName}
            label="Mostrar campo de nome completo"
            hint="Desligado por padrão (LGPD / sigilo). Iniciais + leito bastam."
          />
          <p className="text-xs text-slate-500">
            Nenhum dado de paciente sai do aparelho — não há nuvem nem servidor.
          </p>
        </Card>

        <Card title="Trava por PIN" icon={<Lock className="h-4 w-4 text-teal-600" />}>
          <p className="text-xs text-slate-500">
            Dissuasão simples ao abrir o app. Não substitui o bloqueio de tela e os
            dados não são criptografados. Sem recuperação: se esquecer, só apagando os
            dados.
          </p>
          {pinHash ? (
            <Button variant="secondary" onClick={removerPin} className="w-full">
              <Lock className="h-4 w-4" /> Remover PIN
            </Button>
          ) : (
            <Button variant="secondary" onClick={definirPin} className="w-full">
              <Lock className="h-4 w-4" /> Definir PIN
            </Button>
          )}
        </Card>

        <Card
          title="Armazenamento"
          icon={<HardDrive className="h-4 w-4 text-teal-600" />}
        >
          <p className="text-sm text-slate-700">
            Proteção do navegador:{' '}
            <strong className={persisted ? 'text-emerald-600' : 'text-amber-600'}>
              {persisted === null ? '…' : persisted ? 'ativa' : 'inativa'}
            </strong>
          </p>
          {usage && (
            <p className="text-xs text-slate-500">
              Uso: {formatBytes(usage.usage)}
              {usage.quota ? ` de ${formatBytes(usage.quota)}` : ''}
            </p>
          )}
          {!persisted && (
            <Button variant="secondary" onClick={proteger} className="w-full">
              <ShieldCheck className="h-4 w-4" /> Proteger dados neste aparelho
            </Button>
          )}
        </Card>

        <Card title="Sobre" icon={<Info className="h-4 w-4 text-teal-600" />}>
          <p className="text-xs text-slate-500">
            SBAR Médico — versão de dados {APP_DATA_VERSION}. Ferramenta de apoio à
            passagem de plantão. Sempre revise o conteúdo antes de usar; o app não
            toma decisões clínicas.
          </p>
          <button
            onClick={apagarTudo}
            className="text-xs font-medium text-red-600 hover:underline"
          >
            Apagar todos os dados deste aparelho
          </button>
        </Card>
      </div>
    </div>
  )
}
