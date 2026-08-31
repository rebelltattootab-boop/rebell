'use client'

import { useMemo, useState } from 'react'
import { HandCoins, MessageCircle, Plus, Wallet } from 'lucide-react'
import { useCustomers, useSales } from '@/hooks/use-collections'
import { balanceUsd, isReceivable, paidUsd } from '@/lib/finance'
import { bs, saleDate, usd } from '@/lib/format'
import type { Customer, Sale } from '@/lib/types'
import { AbonoModal } from './abono-modal'

type Group = {
  customerId: string
  name: string
  whatsapp?: string
  sales: Sale[]
  totalPending: number
}

export function ReceivablesView({ rate }: { rate: number | null }) {
  const { sales } = useSales()
  const { customers } = useCustomers()
  const [abonoSale, setAbonoSale] = useState<Sale | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const customerById = useMemo(() => {
    const m = new Map<string, Customer>()
    for (const c of customers) m.set(c.id, c)
    return m
  }, [customers])

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>()
    for (const s of sales) {
      if (!isReceivable(s)) continue
      const id = s.customerId ?? 'sin-cliente'
      const existing = map.get(id)
      const c = s.customerId ? customerById.get(s.customerId) : undefined
      if (existing) {
        existing.sales.push(s)
        existing.totalPending += balanceUsd(s)
      } else {
        map.set(id, {
          customerId: id,
          name: s.customerName ?? 'Sin cliente',
          whatsapp: c?.whatsapp,
          sales: [s],
          totalPending: balanceUsd(s),
        })
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => b.totalPending - a.totalPending,
    )
  }, [sales, customerById])

  const grandTotal = groups.reduce((s, g) => s + g.totalPending, 0)

  function remind(g: Group) {
    const lines = [
      `Hola ${g.name}, te recordamos tu saldo pendiente con *Rebel Tattoo Supply*:`,
      '',
      ...g.sales.map(
        (s) => `• ${saleDate(s.createdAt)} — debe ${usd(balanceUsd(s))}`,
      ),
      '',
      `*Total pendiente: ${usd(g.totalPending)}*`,
      rate ? `≈ ${bs(g.totalPending * rate)}` : '',
      '',
      '¡Gracias!',
    ].filter(Boolean)
    const text = encodeURIComponent(lines.join('\n'))
    const base = g.whatsapp
      ? `https://wa.me/${g.whatsapp}?text=`
      : `https://wa.me/?text=`
    window.open(base + text, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex flex-col gap-4 pb-28">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">
          Cuentas por cobrar
        </h1>
        <p className="text-sm text-muted-foreground">
          Saldos pendientes de estudios y artistas
        </p>
      </header>

      {feedback && (
        <p className="rounded-xl border border-success/40 bg-success/10 px-4 py-2.5 text-sm text-success">
          {feedback}
        </p>
      )}

      {/* Total outstanding */}
      <div className="rounded-3xl border border-chart-3/30 bg-gradient-to-b from-chart-3/15 to-card p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wallet className="h-4 w-4" />
          Total por cobrar
        </div>
        <div className="mt-2 text-4xl font-semibold tracking-tight tabular-nums text-chart-3">
          {usd(grandTotal)}
        </div>
        {rate && (
          <div className="mt-1 text-base text-muted-foreground tabular-nums">
            {bs(grandTotal * rate)}
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
            <HandCoins className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-pretty">
            No hay cuentas pendientes. Todo está saldado.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {groups.map((g) => (
            <li
              key={g.customerId}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">{g.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {g.sales.length} venta{g.sales.length === 1 ? '' : 's'} a
                    crédito
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-semibold text-chart-3 tabular-nums">
                    {usd(g.totalPending)}
                  </div>
                  <div className="text-xs text-muted-foreground">pendiente</div>
                </div>
              </div>

              {/* Individual credit sales */}
              <ul className="mt-3 flex flex-col gap-2">
                {g.sales.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-secondary/40 px-3 py-2.5"
                  >
                    <div className="min-w-0 text-xs">
                      <div className="text-foreground">
                        {saleDate(s.createdAt)}
                      </div>
                      <div className="text-muted-foreground">
                        Total {usd(s.totalUsd)} · abonado {usd(paidUsd(s))}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-semibold text-chart-3 tabular-nums">
                        {usd(balanceUsd(s))}
                      </span>
                      <button
                        onClick={() => setAbonoSale(s)}
                        aria-label="Registrar abono"
                        className="flex h-8 items-center gap-1 rounded-lg bg-primary px-2.5 text-xs font-semibold text-primary-foreground active:opacity-80"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Abono
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => remind(g)}
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-success text-sm font-semibold text-success-foreground active:opacity-80"
              >
                <MessageCircle className="h-4 w-4" />
                Recordar por WhatsApp
              </button>
            </li>
          ))}
        </ul>
      )}

      {abonoSale && (
        <AbonoModal
          sale={abonoSale}
          rate={rate}
          onClose={() => setAbonoSale(null)}
          onSaved={(msg) => {
            setAbonoSale(null)
            setFeedback(msg)
          }}
        />
      )}
    </div>
  )
}
