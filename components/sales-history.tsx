'use client'

import { useState } from 'react'
import { ChevronDown, User } from 'lucide-react'
import { useSession } from '@/context/session-context'
import { bs, saleDate, usd } from '@/lib/format'
import { balanceUsd, paidUsd } from '@/lib/finance'
import type { Sale } from '@/lib/types'
import { VoidSaleModal } from './void-sale-modal'

// Expandable sale history. Each card opens to reveal line-item detail, the
// customer, and payment breakdown. Voiding is gated behind the Owner PIN.
export function SalesHistory({
  sales,
  limit,
  title = 'Historial de ventas',
}: {
  sales: Sale[]
  limit?: number
  title?: string
}) {
  const { requestPin } = useSession()
  const [openId, setOpenId] = useState<string | null>(null)
  const [voiding, setVoiding] = useState<Sale | null>(null)

  const list = limit ? sales.slice(0, limit) : sales

  async function startVoid(sale: Sale) {
    const ok = await requestPin()
    if (ok) setVoiding(sale)
  }

  if (list.length === 0) {
    return (
      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
          {title}
        </h2>
        <p className="rounded-xl bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground">
          Sin ventas registradas todavía.
        </p>
      </section>
    )
  }

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
        {title}
      </h2>
      <ul className="flex flex-col gap-2">
        {list.map((s) => {
          const voided = s.status === 'void'
          const open = openId === s.id
          const units = s.items.reduce((n, i) => n + i.quantity, 0)
          const pending = !!s.credit && balanceUsd(s) > 0.009
          return (
            <li
              key={s.id}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <button
                onClick={() => setOpenId(open ? null : s.id)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left active:opacity-80"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-foreground">
                      {saleDate(s.createdAt)}
                    </span>
                    {voided && (
                      <span className="rounded-md bg-destructive/20 px-1.5 py-0.5 text-xs font-medium text-destructive">
                        Anulada
                      </span>
                    )}
                    {pending && !voided && (
                      <span className="rounded-md bg-chart-3/20 px-1.5 py-0.5 text-xs font-medium text-chart-3">
                        Crédito
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {units} u.
                    {s.customerName ? ` · ${s.customerName}` : ''}
                    {s.createdBy ? ` · ${s.createdBy}` : ''}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-right">
                    <div
                      className={`font-medium tabular-nums ${voided ? 'text-muted-foreground line-through' : ''}`}
                    >
                      {usd(s.totalUsd)}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {bs(s.totalBs)}
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {open && (
                <div className="border-t border-border px-4 py-3">
                  {/* Line items */}
                  <ul className="flex flex-col gap-1.5">
                    {s.items.map((it, idx) => (
                      <li
                        key={`${it.productId}-${idx}`}
                        className="flex items-baseline justify-between gap-3 text-sm"
                      >
                        <span className="min-w-0 truncate">
                          <span className="text-muted-foreground tabular-nums">
                            {it.quantity}×
                          </span>{' '}
                          {it.name}
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {usd(it.unitPrice * it.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Customer */}
                  {s.customerName && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      {s.customerName}
                    </div>
                  )}

                  {/* Credit balance */}
                  {s.credit && (
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-xs">
                      <span className="text-muted-foreground">
                        Abonado {usd(paidUsd(s))}
                      </span>
                      <span
                        className={
                          balanceUsd(s) > 0.009
                            ? 'font-semibold text-chart-3'
                            : 'font-semibold text-success'
                        }
                      >
                        {balanceUsd(s) > 0.009
                          ? `Debe ${usd(balanceUsd(s))}`
                          : 'Saldado'}
                      </span>
                    </div>
                  )}

                  {voided ? (
                    <p className="mt-3 text-xs text-muted-foreground text-pretty">
                      Anulada por {s.voidedBy ?? '—'}
                      {s.voidReason ? ` · ${s.voidReason}` : ''}
                    </p>
                  ) : (
                    <button
                      onClick={() => startVoid(s)}
                      className="mt-3 w-full rounded-lg bg-secondary py-2 text-xs font-medium text-secondary-foreground active:opacity-70"
                    >
                      Anular venta
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <VoidSaleModal sale={voiding} onClose={() => setVoiding(null)} />
    </section>
  )
}
