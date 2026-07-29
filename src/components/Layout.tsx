import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ToastProvider } from './Toast'
import { InstallPrompt } from './InstallPrompt'
import { requestPersistentStorage } from '../lib/storage'

export function Layout() {
  // Pede armazenamento persistente logo no início (melhor esforço).
  useEffect(() => {
    void requestPersistentStorage()
  }, [])

  const location = useLocation()

  return (
    <ToastProvider>
      <div className="mx-auto flex min-h-full max-w-lg flex-col">
        <main className="flex-1 pb-10">
          <div key={location.pathname} className="animate-fade">
            <Outlet />
          </div>
        </main>
        <InstallPrompt />
      </div>
    </ToastProvider>
  )
}
