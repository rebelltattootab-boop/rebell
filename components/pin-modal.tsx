'use client'

import { useRef, useState } from 'react'
import { Loader2, ShieldCheck, X } from 'lucide-react'
import { verifyPin } from '@/lib/store'

// Modal that gates sensitive actions behind the 4-digit owner PIN.
export function PinModal({ onResult }: { onResult: (ok: boolean) => void }) {
  const [digits, setDigits] = useState<string[]>(['', '', '', ''])
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  function setDigit(i: number, value: string) {
    const clean = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = clean
    setDigits(next)
    setError(null)
    if (clean && i < 3) inputs.current[i + 1]?.focus()
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  async function submit() {
    const pin = digits.join('')
    if (pin.length !== 4) {
      setError('Ingresa los 4 dígitos')
      return
    }
    setChecking(true)
    try {
      const ok = await verifyPin(pin)
      if (ok) {
        onResult(true)
      } else {
        setError('PIN incorrecto')
        setDigits(['', '', '', ''])
        inputs.current[0]?.focus()
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        aria-label="Cancelar"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => onResult(false)}
      />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-border bg-card p-6 pb-8 sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <h2 className="text-lg font-semibold">Verificación</h2>
              <p className="text-xs text-muted-foreground">
                Acción protegida por PIN
              </p>
            </div>
          </div>
          <button
            onClick={() => onResult(false)}
            aria-label="Cancelar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground active:opacity-70"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex justify-center gap-3">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el
              }}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              inputMode="numeric"
              type="password"
              autoFocus={i === 0}
              maxLength={1}
              aria-label={`Dígito ${i + 1}`}
              className="h-16 w-14 rounded-2xl border border-input bg-secondary/40 text-center text-2xl font-semibold tabular-nums outline-none focus:border-primary"
            />
          ))}
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-destructive">{error}</p>
        )}

        <button
          onClick={submit}
          disabled={checking}
          className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground active:opacity-80 disabled:opacity-50"
        >
          {checking && <Loader2 className="h-5 w-5 animate-spin" />}
          Confirmar
        </button>
      </div>
    </div>
  )
}
