'use client'

import { useState } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import { bs, usd } from '@/lib/format'
import type { Product } from '@/lib/types'

export type VariantGroup = {
  key: string
  name: string
  variants: Product[]
  minPrice: number
  totalStock: number
}

// Quick bottom-sheet size selector for a family of needle/cartridge variants.
// Lets the operator pick a specific size, choose a quantity, and drop that
// distinct line item (with its own price) into the floating cart.
export function VariantSelectorDrawer({
  group,
  rate,
  inCart,
  onClose,
  onAdd,
}: {
  group: VariantGroup
  rate: number | null
  // Quantity already in the cart per variant id, to cap against stock.
  inCart: Record<string, number>
  onClose: () => void
  onAdd: (variant: Product, quantity: number) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [qty, setQty] = useState(1)

  const selected = group.variants.find((v) => v.id === selectedId) ?? null
  const reserved = selected ? (inCart[selected.id] ?? 0) : 0
  const maxQty = selected ? Math.max(0, selected.stock - reserved) : 0

  function pick(v: Product) {
    setSelectedId(v.id)
    const reservedForV = inCart[v.id] ?? 0
    setQty(v.stock - reservedForV > 0 ? 1 : 0)
  }

  function confirm() {
    if (!selected || qty < 1) return
    onAdd(selected, qty)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-card p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Seleccionar medida - ${group.name}`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-balance">
              Seleccionar medida
            </h2>
            <p className="text-sm text-muted-foreground">{group.name}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground active:opacity-70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Grid of size pills */}
        <div className="grid grid-cols-2 gap-2">
          {group.variants.map((v) => {
            const reservedForV = inCart[v.id] ?? 0
            const disp = Math.max(0, v.stock - reservedForV)
            const soldOut = disp === 0
            const active = v.id === selectedId
            return (
              <button
                key={v.id}
                disabled={soldOut}
                onClick={() => pick(v)}
                className={`flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-colors disabled:opacity-40 ${
                  active
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-secondary/40 active:bg-secondary'
                }`}
              >
                <span className="font-mono text-sm font-semibold">
                  {v.variantLabel || v.sku || v.name}
                </span>
                <span className="text-sm font-medium">{usd(v.price)}</span>
                <span
                  className={`text-xs ${soldOut ? 'text-destructive' : 'text-muted-foreground'}`}
                >
                  {soldOut ? 'agotado' : `${disp} disp.`}
                </span>
              </button>
            )
          })}
        </div>

        {/* Quantity stepper + confirm */}
        <div className="mt-5 border-t border-border pt-5">
          {selected ? (
            <>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-mono text-sm font-semibold">
                    {selected.variantLabel || selected.sku || selected.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {usd(selected.price)}
                    {rate ? ` · ${bs(selected.price * rate)}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    aria-label="Restar cantidad"
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground active:opacity-70 disabled:opacity-40"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <span className="w-8 text-center text-lg font-semibold tabular-nums">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                    disabled={qty >= maxQty}
                    aria-label="Sumar cantidad"
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground active:opacity-70 disabled:opacity-40"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <button
                onClick={confirm}
                disabled={qty < 1}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-success text-base font-semibold text-success-foreground active:opacity-80 disabled:opacity-40"
              >
                Agregar al carrito · {usd(selected.price * qty)}
              </button>
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Elige una medida para continuar
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
