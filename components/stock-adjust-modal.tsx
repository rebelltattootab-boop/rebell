'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Loader2, Minus, Plus, X } from 'lucide-react'
import { adjustStockTo } from '@/lib/store'
import { useSession } from '@/context/session-context'
import { ACTIVE_USERS, STOCK_REASONS, type Product, type StockReason } from '@/lib/types'

type Props = {
  product: Product | null
  // Proposed starting value for the new stock (e.g. current +/- 1).
  proposed: number
  onClose: () => void
}

// Mandatory modal for any manual stock change. Stock can never be edited
// directly — it always flows through here with a reason + responsible user.
export function StockAdjustModal({ product, proposed, onClose }: Props) {
  const { activeUser } = useSession()
  const [newStock, setNewStock] = useState('0')
  const [reason, setReason] = useState<StockReason>('Conteo físico')
  const [responsible, setResponsible] = useState(activeUser)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (product) {
      setNewStock(String(Math.max(0, proposed)))
      setResponsible(activeUser)
      setReason('Conteo físico')
      setError(null)
    }
  }, [product, proposed, activeUser])

  if (!product) return null

  const target = Math.max(0, Math.floor(Number(newStock) || 0))
  const delta = target - product.stock

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await adjustStockTo({
        product: { id: product!.id, name: product!.name },
        newStock: target,
        reason,
        user: responsible,
      })
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
          <h2 className="text-lg font-semibold">Ajuste de Stock</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground active:opacity-70"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-secondary/30 p-4">
            <div className="text-xs text-muted-foreground">Producto</div>
            <div className="mt-0.5 font-medium">{product.name}</div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-4 py-3">
              <span className="text-xs text-muted-foreground">Actual</span>
              <span className="text-2xl font-semibold tabular-nums">
                {product.stock}
              </span>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="flex flex-1 flex-col items-center rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3">
              <span className="text-xs text-muted-foreground">Nuevo</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNewStock(String(Math.max(0, target - 1)))}
                  aria-label="Restar"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground active:opacity-70"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  inputMode="numeric"
                  aria-label="Nuevo stock"
                  className="w-16 bg-transparent text-center text-2xl font-semibold tabular-nums outline-none"
                />
                <button
                  type="button"
                  onClick={() => setNewStock(String(target + 1))}
                  aria-label="Sumar"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground active:opacity-70"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {delta !== 0 && (
            <p className="text-center text-sm text-muted-foreground">
              {delta > 0 ? `Entrada de +${delta}` : `Salida de ${delta}`} unidades
            </p>
          )}

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Motivo</span>
            <div className="grid grid-cols-2 gap-2">
              {STOCK_REASONS.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setReason(r)}
                  className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
                    reason === r
                      ? 'border-primary bg-primary/15 text-foreground'
                      : 'border-input bg-secondary/40 text-muted-foreground'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Responsable</span>
            <div className="grid grid-cols-2 gap-2">
              {ACTIVE_USERS.map((u) => (
                <button
                  type="button"
                  key={u}
                  onClick={() => setResponsible(u)}
                  className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
                    responsible === u
                      ? 'border-primary bg-primary/15 text-foreground'
                      : 'border-input bg-secondary/40 text-muted-foreground'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={saving || delta === 0}
            className="mt-1 flex h-13 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground active:opacity-80 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-5 w-5 animate-spin" />}
            Confirmar ajuste
          </button>
        </form>
      </div>
    </div>
  )
}
