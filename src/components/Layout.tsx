import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { TabBar } from './TabBar'
import { ToastProvider } from './Toast'
import { InstallPrompt } from './InstallPrompt'
import { LockScreen } from './LockScreen'
import { requestPersistentStorage } from '../lib/storage'

export function Layout() {
  // Pede armazenamento persistente logo no início (melhor esforço).
  useEffect(() => {
    void requestPersistentStorage()
  }, [])

  const pinRow = useLiveQuery(() => db.meta.get('pinHash'), [])
  const pinHash = (pinRow?.value as string) || ''
  const [unlocked, setUnlocked] = useState(false)
  const location = useLocation()

  if (pinHash && !unlocked) {
    return (
      <ToastProvider>
        <div className="mx-auto min-h-full max-w-lg">
          <LockScreen pinHash={pinHash} onUnlock={() => setUnlocked(true)} />
        </div>
      </ToastProvider>
    )
  }

  return (
    <ToastProvider>
      <div className="mx-auto flex min-h-full max-w-lg flex-col">
        <main className="flex-1 pb-24">
          <div key={location.pathname} className="animate-fade">
            <Outlet />
          </div>
        </main>
        <TabBar />
        <InstallPrompt />
      </div>
    </ToastProvider>
  )
}
