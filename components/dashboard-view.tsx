'use client'

import { useMemo, useState } from 'react'
import {
  Boxes,
  Coins,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import {
  useExpenses,
  useProducts,
  useSales,
} from '@/hooks/use-collections'
import { bs, saleDate, usd } from '@/lib/format'
import {
  RANGE_OPTIONS,
  grossMargin,
  inRange,
  inventoryValue,
  isActive,
  totalExpenses,
  type RangeKey,
} from '@/lib/finance'
import { ExpenseFormModal } from './expense-form-modal'
import { CashClosingModal } from './cash-closing-modal'

export function DashboardView({ rate }: { rate: number | null }) {
  const { products } = useProducts()
  const { sales } = useSales()
  const { expenses } = useExpenses()
  const [range, setRange] = useState<RangeKey>('today')
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [closingOpen, setClosingOpen] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const metrics = useMemo(() => {
    const now = new Date()
    const rangedSales = sales.filter(
      (s) => isActive(s) && inRange(s.createdAt, range, now),
    )
    const rangedExpenses = expenses.filter((e) => inRange(e.createdAt, range, now))

    const grossSales = rangedSales.reduce((s, sale) => s + sale.totalUsd, 0)
    const expensesUsd = totalExpenses(rangedExpenses)
    const margin = grossMargin(rangedSales, products)
    const netProfit = margin - expensesUsd

    return {
      grossSales,
      expensesUsd,
      netProfit,
      inventory: inventoryValue(products),
      count: rangedSales.length,
    }
  }, [sales, expenses, products, range])

  // Recent expenses are shown regardless of range so the log stays visible.
  const recentExpenses = expenses.slice(0, 6)

  return (
    <div className="flex flex-col gap-5 pb-28">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Panel financiero</h1>
        <p className="text-sm text-muted-foreground">
          {rate ? `Tasa BCV: ${bs(rate)} / $` : 'Cargando tasa BCV…'}
        </p>
      </header>

      {feedback && (
        <p className="rounded-xl border border-success/40 bg-success/10 px-4 py-2.5 text-sm text-success">
          {feedback}
        </p>
      )}

      {/* Range filter */}
      <div
        role="tablist"
        aria-label="Rango de tiempo"
        className="grid grid-cols-4 gap-1 rounded-xl bg-secondary/60 p-1"
      >
        {RANGE_OPTIONS.map((o) => {
          const active = range === o.id
          return (
            <button
              key={o.id}
              role="tab"
              aria-selected={active}
              onClick={() => setRange(o.id)}
              className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          icon={<Wallet className="h-4 w-4" />}
          label="Ventas Totales"
          valueUsd={metrics.grossSales}
          rate={rate}
          hint={`${metrics.count} ventas`}
        />
        <KpiCard
          icon={<TrendingDown className="h-4 w-4" />}
          label="Gastos Operativos"
          valueUsd={metrics.expensesUsd}
          rate={rate}
          valueClass="text-rose-400"
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Ganancia Neta Real"
          valueUsd={metrics.netProfit}
          rate={rate}
          valueClass="text-emerald-500"
          hint="Margen − gastos"
        />
        <KpiCard
          icon={<Boxes className="h-4 w-4" />}
          label="Valor del Inventario"
          valueUsd={metrics.inventory}
          rate={rate}
          hint="A costo landed"
        />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setExpenseOpen(true)}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground active:opacity-80"
        >
          <Receipt className="h-4 w-4" />
          Registrar Gasto
        </button>
        <button
          onClick={() => setClosingOpen(true)}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold active:opacity-80"
        >
          <Coins className="h-4 w-4" />
          Cierre de Caja
        </button>
      </div>

      {/* Recent expenses */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
          Gastos recientes
        </h2>
        {recentExpenses.length === 0 ? (
          <p className="rounded-xl bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground">
            Aún no hay gastos registrados.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentExpenses.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">
                      {e.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {e.method}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {e.note ? `${e.note} · ` : ''}
                    {saleDate(e.createdAt)} · {e.user}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold text-rose-400 tabular-nums">
                    -{usd(e.amountUsd)}
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {bs(e.amountBs)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {expenseOpen && (
        <ExpenseFormModal
          rate={rate}
          onClose={() => setExpenseOpen(false)}
          onSaved={(msg) => {
            setExpenseOpen(false)
            setFeedback(msg)
          }}
        />
      )}

      {closingOpen && (
        <CashClosingModal
          sales={sales}
          rate={rate}
          onClose={() => setClosingOpen(false)}
          onSaved={(msg) => {
            setClosingOpen(false)
            setFeedback(msg)
          }}
        />
      )}
    </div>
  )
}

function KpiCard({
  icon,
  label,
  valueUsd,
  rate,
  valueClass,
  hint,
}: {
  icon: React.ReactNode
  label: string
  valueUsd: number
  rate: number | null
  valueClass?: string
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div
        className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${valueClass ?? ''}`}
      >
        {usd(valueUsd)}
      </div>
      {rate && (
        <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
          {bs(valueUsd * rate)}
        </div>
      )}
      {hint && (
        <div className="mt-1.5 text-[11px] text-muted-foreground">{hint}</div>
      )}
    </div>
  )
}
