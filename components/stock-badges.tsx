'use client'

import { AlertTriangle, CalendarClock, PackageX } from 'lucide-react'
import { expiryStatus, isLowStock, type Product } from '@/lib/types'
import { shortDate } from '@/lib/format'

// Amber low-stock badge (<= 5 units).
export function LowStockBadge({ stock }: { stock: number }) {
  if (!isLowStock(stock)) return null
  const out = stock <= 0
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
        out
          ? 'bg-destructive/20 text-destructive'
          : 'bg-amber-500/20 text-amber-400'
      }`}
    >
      {out ? <PackageX className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {out ? 'Agotado' : 'Stock bajo'}
    </span>
  )
}

// Amber (<= 60d), red (<= 30d or expired) expiration badge.
export function ExpiryBadge({ expiresAt }: { expiresAt?: number }) {
  const status = expiryStatus(expiresAt)
  if (status === 'none' || status === 'ok') return null

  const red = status === 'expired' || status === 'critical'
  const label =
    status === 'expired' ? 'Vencido' : `Vence ${shortDate(expiresAt)}`

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
        red ? 'bg-destructive/20 text-destructive' : 'bg-amber-500/20 text-amber-400'
      }`}
    >
      <CalendarClock className="h-3 w-3" />
      {label}
    </span>
  )
}

// Convenience wrapper rendering all relevant warning badges for a product.
export function ProductBadges({ product }: { product: Product }) {
  return (
    <>
      <LowStockBadge stock={product.stock} />
      <ExpiryBadge expiresAt={product.expiresAt} />
    </>
  )
}
