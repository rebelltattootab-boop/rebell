'use client'

import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { useSession } from '@/context/session-context'
import { addAbono } from '@/lib/store'
import { balanceUsd } from '@/lib/finance'
import { bs, usd } from '@/lib/format'
import type { PaymentKey, Sale } from '@/lib/types'

const METHODS: { key: PaymentKey; label: string }[] = [
  { key: 'efectivoUsd', label: 'Efectivo USD' },
  { key: 'pagoMovil', label: 'Pago Móvil' },
  { key: 'zelle', label: 'Zelle' },
]

// Records a partial payment against a credit sale, reducing its balance.
export function AbonoModal({
  sale,
  rate,
  onClose,
  onSaved,
}: {
  sale: Sale
  rate: number | null
  onClose: () => void
  onSaved: (msg: string) => void
}) {
  const { activeUser } = useSession()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentKey>('efectivoUsd')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const balance = balanceUsd(sale)
  const amountUsd = Number(amount) || 0
  const isBs = method === 'pagoMovil'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (amountUsd <= 0) {
      setError('Ingresa un monto válido')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await addAbono({ sale, amount: amountUsd, method, user: activeUser })
      onSaved(`Abono de ${usd(amountUsd)} registrado`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-border bg-card p-6 pb-8 sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Registrar abono</h2>
            {sale.customerName && (
              <p className="text-xs text-muted-foreground">{sale.customerName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground active:opacity-70"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-secondary/30 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Saldo pendiente</span>
          <span className="font-semibold text-chart-3 tabular-nums">
            {usd(balance)}
          </span>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium" htmlFor="abono-amount">
              Monto del abono (USD)
            </label>
            <div className="mt-2 flex items-center rounded-xl border border-input bg-secondary/40 px-4 focus-within:border-ring">
              <span className="text-lg text-muted-foreground">$</span>
              <input
                id="abono-amount"
                inputMode="decimal"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full min-w-0 bg-transparent px-2 py-3 text-lg outline-none"
              />
            </div>
            {isBs && rate && amountUsd > 0 && (
              <p className="mt-1.5 text-sm text-muted-foreground tabular-nums">
                ≈ {bs(amountUsd * rate)}
              </p>
            )}
            {amountUsd > balance + 0.009 && (
              <p className="mt-1.5 text-xs text-chart-3">
                Excede el saldo; se aplicará solo {usd(balance)}.
              </p>
            )}
          </div>

          <div>
            <span className="text-sm font-medium">Método</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMethod(m.key)}
                  className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors ${
                    method === m.key
                      ? 'border-primary bg-primary/15 text-foreground'
                      : 'border-input bg-secondary/40 text-muted-foreground'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-1 flex h-13 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground active:opacity-80 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-5 w-5 animate-spin" />}
            Guardar abono
          </button>
        </form>
      </div>
    </div>
  )
}
