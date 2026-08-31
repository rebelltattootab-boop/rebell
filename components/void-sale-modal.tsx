'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { voidSale } from '@/lib/store'
import { useSession } from '@/context/session-context'
import { usd } from '@/lib/format'
import type { Sale } from '@/lib/types'

type Props = {
  sale: Sale | null
  onClose: () => void
}

// Reason capture for an already-PIN-verified sale void. Voiding returns every
// item to inventory and records an immutable audit entry.
export function VoidSaleModal({ sale, onClose }: Props) {
  const { activeUser } = useSession()
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sale) {
      setReason('')
      setError(null)
    }
  }, [sale])

  if (!sale) return null

  const units = sale.items.reduce((n, i) => n + i.quantity, 0)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) {
      setError('Indica el motivo de la anulación')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await voidSale({ sale: sale!, reason: reason.trim(), user: activeUser })
      onClose()
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
          <h2 className="text-lg font-semibold">Anular venta</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground active:opacity-70"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{usd(sale.totalUsd)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Artículos</span>
              <span>{units} u. regresan al inventario</span>
            </div>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Motivo de la anulación</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="Ej: Cliente devolvió el producto"
            />
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-1 flex h-13 items-center justify-center gap-2 rounded-xl bg-destructive text-base font-semibold text-destructive-foreground active:opacity-80 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-5 w-5 animate-spin" />}
            Confirmar anulación
          </button>
        </form>
      </div>
    </div>
  )
}
