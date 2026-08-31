'use client'

import { useMemo, useState } from 'react'
import { Layers, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { useCustomers, useProducts, useSales } from '@/hooks/use-collections'
import type { RatesValue } from '@/hooks/use-rates'
import { bs, usd } from '@/lib/format'
import type { Product } from '@/lib/types'
import { CheckoutDrawer } from './checkout-drawer'
import { SalesHistory } from './sales-history'
import {
  VariantSelectorDrawer,
  type VariantGroup,
} from './variant-selector-drawer'

type CartLine = { product: Product; quantity: number }

export function SalesView({ rates }: { rates: RatesValue }) {
  const { products } = useProducts()
  const { sales } = useSales()
  const { customers } = useCustomers()
  const [cart, setCart] = useState<Record<string, number>>({})
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  // Which variant family's quick selector is open (by group key).
  const [selectorGroup, setSelectorGroup] = useState<VariantGroup | null>(null)

  // BCV is the default reference rate for on-screen Bs previews.
  const rate = rates.bcv

  const lines: CartLine[] = useMemo(() => {
    return Object.entries(cart)
      .map(([id, quantity]) => {
        const product = products.find((p) => p.id === id)
        return product ? { product, quantity } : null
      })
      .filter((x): x is CartLine => x !== null)
  }, [cart, products])

  const totalUsd = lines.reduce((s, l) => s + l.product.price * l.quantity, 0)
  const totalUnits = lines.reduce((n, l) => n + l.quantity, 0)

  function setQty(product: Product, next: number) {
    setCart((prev) => {
      const clamped = Math.max(0, Math.min(next, product.stock))
      const copy = { ...prev }
      if (clamped === 0) delete copy[product.id]
      else copy[product.id] = clamped
      return copy
    })
  }

  // Add a specific variant to the cart, stacking on any existing quantity.
  function addVariant(variant: Product, quantity: number) {
    setQty(variant, (cart[variant.id] ?? 0) + quantity)
  }

  const available = products.filter((p) => p.stock > 0)

  // Split sellable products into variant families (2+ sharing groupName) and
  // standalone products. Families render as one card with a size selector.
  const { groups, singles } = useMemo(() => {
    const byGroup = new Map<string, Product[]>()
    const loose: Product[] = []
    for (const p of available) {
      if (p.groupName?.trim()) {
        const key = p.groupName.trim()
        byGroup.set(key, [...(byGroup.get(key) ?? []), p])
      } else {
        loose.push(p)
      }
    }
    const groups: VariantGroup[] = []
    for (const [key, variants] of byGroup) {
      if (variants.length === 1) {
        loose.push(variants[0])
        continue
      }
      const sorted = [...variants].sort((a, b) =>
        (a.variantLabel ?? a.name).localeCompare(b.variantLabel ?? b.name),
      )
      groups.push({
        key,
        name: key,
        variants: sorted,
        minPrice: Math.min(...sorted.map((v) => v.price)),
        totalStock: sorted.reduce((n, v) => n + v.stock, 0),
      })
    }
    groups.sort((a, b) => a.name.localeCompare(b.name))
    return { groups, singles: loose }
  }, [available])

  return (
    <div className="flex flex-col gap-4 pb-40">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Ventas rápidas</h1>
        <p className="text-sm text-muted-foreground">
          Selecciona productos y cobra al detal
        </p>
      </header>

      {feedback && (
        <p className="rounded-xl border border-success/40 bg-success/10 px-4 py-2.5 text-sm text-success">
          {feedback}
        </p>
      )}

      {groups.length === 0 && singles.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No hay productos con stock disponible.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {/* Variant families — one card that opens the size selector */}
          {groups.map((g) => {
            const inCartUnits = g.variants.reduce(
              (n, v) => n + (cart[v.id] ?? 0),
              0,
            )
            return (
              <li
                key={g.key}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 ring-1 ring-indigo-500/25">
                    <Layers className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-medium">{g.name}</h3>
                      <span className="shrink-0 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[11px] font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-500/25">
                        {g.variants.length} medidas
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-lg font-bold text-white">
                        {usd(g.minPrice)}
                      </span>
                      <span className="text-sm text-zinc-400">
                        {rate ? bs(g.minPrice * rate) : ''}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · {g.totalStock} disp.
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectorGroup(g)}
                  className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-secondary px-4 text-sm font-medium text-secondary-foreground active:opacity-70"
                >
                  <Plus className="h-4 w-4" />
                  {inCartUnits > 0 ? `Añadir · ${inCartUnits}` : 'Añadir'}
                </button>
              </li>
            )
          })}

          {/* Standalone products */}
          {singles.map((p) => {
            const qty = cart[p.id] ?? 0
            return (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5"
              >
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-medium">{p.name}</h3>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-white">
                      {usd(p.price)}
                    </span>
                    {rate && (
                      <span className="text-sm text-zinc-400">
                        {bs(p.price * rate)}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      · {p.stock} disp.
                    </span>
                  </div>
                </div>
                {qty === 0 ? (
                  <button
                    onClick={() => setQty(p, 1)}
                    className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-secondary px-4 text-sm font-medium text-secondary-foreground active:opacity-70"
                  >
                    <Plus className="h-4 w-4" />
                    Añadir
                  </button>
                ) : (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => setQty(p, qty - 1)}
                      aria-label="Restar"
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground active:opacity-70"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center text-base font-semibold tabular-nums">
                      {qty}
                    </span>
                    <button
                      onClick={() => setQty(p, qty + 1)}
                      disabled={qty >= p.stock}
                      aria-label="Sumar"
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground active:opacity-70 disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {sales.length > 0 && (
        <div className="mt-2">
          <SalesHistory sales={sales} limit={8} title="Últimas ventas" />
        </div>
      )}

      {/* Floating cart bar */}
      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-30 mx-auto max-w-md px-5">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 pl-4 shadow-xl shadow-black/40">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShoppingCart className="h-5 w-5" />
              <button
                onClick={() => setCart({})}
                aria-label="Vaciar carrito"
                className="active:opacity-70"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-sm font-medium">
                {totalUnits} producto{totalUnits === 1 ? '' : 's'}
              </div>
              <div className="text-xs text-muted-foreground">
                {usd(totalUsd)}
                {rate ? ` · ${bs(totalUsd * rate)}` : ''}
              </div>
            </div>
            <button
              onClick={() => setCheckoutOpen(true)}
              className="flex h-12 shrink-0 items-center gap-2 rounded-xl bg-emerald-500 px-6 text-base font-bold text-white shadow-lg shadow-emerald-500/30 active:opacity-80"
            >
              Cobrar
            </button>
          </div>
        </div>
      )}

      {checkoutOpen && (
        <CheckoutDrawer
          lines={lines}
          rates={rates}
          customers={customers}
          onClose={() => setCheckoutOpen(false)}
          onComplete={(msg) => {
            setCart({})
            setCheckoutOpen(false)
            setFeedback(msg)
          }}
        />
      )}

      {selectorGroup && (
        <VariantSelectorDrawer
          group={selectorGroup}
          rate={rate}
          inCart={cart}
          onClose={() => setSelectorGroup(null)}
          onAdd={addVariant}
        />
      )}
    </div>
  )
}
