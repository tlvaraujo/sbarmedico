import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { useMeta } from '../db/meta'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function InstallPrompt() {
  const [dismissed, setDismissed] = useMeta('installDismissed', false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    const onBIP = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBIP)
    if (isIOS()) setIosHint(true)
    return () => window.removeEventListener('beforeinstallprompt', onBIP)
  }, [])

  if (dismissed || isStandalone()) return null
  if (!deferred && !iosHint) return null

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setDismissed(true)
  }

  return (
    <div className="no-print fixed inset-x-0 bottom-[4.5rem] z-50 mx-auto max-w-lg px-3">
      <div className="flex items-center gap-3 rounded-2xl border border-teal-200 bg-white p-3 shadow-xl dark:border-teal-500/30 dark:bg-slate-800">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Instalar o SBAR Médico</p>
          {deferred ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">Acesso rápido e uso offline.</p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Toque em Compartilhar <Share className="inline h-3 w-3" /> → “Adicionar
              à Tela de Início”.
            </p>
          )}
        </div>
        {deferred && (
          <button
            onClick={install}
            className="shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white active:bg-teal-800"
          >
            Instalar
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dispensar"
          className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
