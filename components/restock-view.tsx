'use client'

import { useMemo } from 'react'
import { ExternalLink, PackageCheck, ShoppingBag } from 'lucide-react'
import { useProducts } from '@/hooks/use-collections'
import { usd } from '@/lib/format'
import { isLowStock, landedCost, type Product, type Supplier } from '@/lib/types'
import { LowStockBadge } from './stock-badges'

// Supplier accent colors for quick scanning.
const SUPPLIER_STYLE: Record<Supplier, string> = {
  Alibaba: 'bg-orange-500/20 text-orange-400',
  Amazon: 'bg-sky-500/20 text-sky-400',
  'Dynamic Direct': 'bg-chart-2/20 text-chart-2',
  'Web Oficial': 'bg-chart-3/20 text-chart-3',
  Local: 'bg-secondary text-muted-foreground',
}

export function RestockView() {
  const { products, loading } = useProducts()

  const lowItems = useMemo(() => {
    return products
      .filter((p) => isLowStock(p.stock))
      .sort((a, b) => a.stock - b.stock)
  }, [products])

  // Estimated $ to restock back to ~10 units, for a quick budget signal.
  const estimatedCost = useMemo(
    () =>
      lowItems.reduce((sum, p) => {
        const need = Math.max(0, 10 - p.stock)
        return sum + need * landedCost(p)
      }, 0),
    [lowItems],
  )

  return (
    <div className="flex flex-col gap-4 pb-28">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-balance">
          Lista de Reposición
        </h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Productos por agotarse (≤ 5 u.) con enlace directo para reordenar.
        </p>
      </header>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Cargando…
        </p>
      ) : lowItems.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-2/15">
            <PackageCheck className="h-6 w-6 text-chart-2" />
          </div>
          <p className="text-sm text-muted-foreground text-pretty">
            Todo el inventario tiene stock suficiente. Nada por reponer.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
            <div>
              <div className="text-xs text-muted-foreground">Artículos por reponer</div>
              <div className="text-2xl font-semibold tabular-nums">
                {lowItems.length}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">
                Costo estimado (a 10 u.)
              </div>
              <div className="text-2xl font-semibold tabular-nums">
                {usd(estimatedCost)}
              </div>
            </div>
          </div>

          <ul className="flex flex-col gap-3">
            {lowItems.map((p) => (
              <RestockRow key={p.id} product={p} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function RestockRow({ product }: { product: Product }) {
  const label = product.groupName
    ? `${product.groupName} · ${product.variantLabel || product.sku}`
    : product.name

  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <LowStockBadge stock={product.stock} />
            {product.supplier && (
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-medium ${SUPPLIER_STYLE[product.supplier]}`}
              >
                {product.supplier}
              </span>
            )}
          </div>
          <h3 className="mt-1.5 truncate text-base font-medium">{label}</h3>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="tabular-nums">Quedan {product.stock} u.</span>
            <span>Costo {usd(landedCost(product))}</span>
          </div>
        </div>
      </div>

      {product.purchaseUrl ? (
        <a
          href={product.purchaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground active:opacity-80"
        >
          <ShoppingBag className="h-4 w-4" />
          Reordenar {product.supplier ? `en ${product.supplier}` : 'ahora'}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-2.5 text-center text-xs text-muted-foreground text-pretty">
          Sin enlace de compra. Agrégalo en el producto para reordenar directo.
        </p>
      )}
    </li>
  )
}
