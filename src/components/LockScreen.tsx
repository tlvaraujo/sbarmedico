import { useState } from 'react'
import type { FormEvent } from 'react'
import { verifyPin } from '../lib/pin'
import { deleteAllPatients } from '../db/patients'
import { setMeta } from '../db/meta'

export function LockScreen({
  pinHash,
  onUnlock,
}: {
  pinHash: string
  onUnlock: () => void
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (await verifyPin(pin, pinHash)) onUnlock()
    else {
      setError(true)
      setPin('')
    }
  }

  async function reset() {
    if (
      !window.confirm(
        'Isto vai APAGAR todos os dados deste aparelho e remover o PIN. Use apenas se esqueceu o PIN. Continuar?',
      )
    )
      return
    await deleteAllPatients()
    await setMeta('pinHash', '')
    onUnlock()
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 pt-safe">
      <img src="./icon.svg" alt="" className="h-16 w-16 rounded-2xl" />
      <div className="text-center">
        <h1 className="text-lg font-bold text-slate-800">SBAR Médico</h1>
        <p className="text-sm text-slate-500">Digite seu PIN para desbloquear</p>
      </div>
      <form onSubmit={submit} className="w-full max-w-xs space-y-3">
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => {
            setPin(e.target.value)
            setError(false)
          }}
          placeholder="••••"
          className={`w-full rounded-xl border bg-white px-4 py-3 text-center text-2xl tracking-widest outline-none focus:ring-2 focus:ring-teal-500/20 ${
            error ? 'border-red-400' : 'border-slate-300 focus:border-teal-500'
          }`}
        />
        {error && <p className="text-center text-sm text-red-600">PIN incorreto</p>}
        <button
          type="submit"
          className="w-full rounded-xl bg-teal-600 py-3 font-semibold text-white active:bg-teal-800"
        >
          Desbloquear
        </button>
      </form>
      <button
        onClick={reset}
        className="text-xs text-slate-400 hover:text-red-600"
      >
        Esqueci o PIN (apagar dados e recomeçar)
      </button>
    </div>
  )
}
