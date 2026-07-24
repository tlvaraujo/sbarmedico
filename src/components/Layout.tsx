import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
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

  return (
    <ToastProvider>
      {pinHash && !unlocked ? (
        <div className="mx-auto min-h-full max-w-lg bg-slate-100">
          <LockScreen pinHash={pinHash} onUnlock={() => setUnlocked(true)} />
        </div>
      ) : (
        <div className="mx-auto flex min-h-full max-w-lg flex-col bg-slate-100">
          <main className="flex-1 pb-24">
            <Outlet />
          </main>
          <TabBar />
          <InstallPrompt />
        </div>
      )}
    </ToastProvider>
  )
}
