import {
  BS_PAYMENT_KEYS,
  landedCost,
  type CashCount,
  type Expense,
  type PaymentKey,
  type Product,
  type Sale,
} from './types'

// ── Time ranges ──────────────────────────────────────────────────────────────
export type RangeKey = 'today' | 'week' | 'month' | 'all'

export const RANGE_OPTIONS: { id: RangeKey; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Esta Semana' },
  { id: 'month', label: 'Este Mes' },
  { id: 'all', label: 'Histórico' },
]

// Epoch ms marking the start of the given range (local time). 0 for 'all'.
export function rangeStart(range: RangeKey, now = new Date()): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  switch (range) {
    case 'today':
      return d.getTime()
    case 'week': {
      // Week starts Monday (ISO-ish, matches VE business week).
      const day = (d.getDay() + 6) % 7
      d.setDate(d.getDate() - day)
      return d.getTime()
    }
    case 'month':
      d.setDate(1)
      return d.getTime()
    case 'all':
    default:
      return 0
  }
}

export function inRange(epochMs: number, range: RangeKey, now = new Date()): boolean {
  return epochMs >= rangeStart(range, now)
}

// ── Sale money helpers ────────────────────────────────────────────────────────
export function isActive(s: Sale): boolean {
  return s.status !== 'void'
}

// USD collected so far on a sale (full total for cash sales, amountPaid for credit).
export function paidUsd(s: Sale): number {
  if (s.credit) return Number(s.amountPaid) || 0
  return s.totalUsd
}

// Outstanding USD balance (only meaningful for credit sales).
export function balanceUsd(s: Sale): number {
  return Math.max(0, s.totalUsd - paidUsd(s))
}

export function isReceivable(s: Sale): boolean {
  return isActive(s) && !!s.credit && balanceUsd(s) > 0.009
}

// Gross margin (revenue - landed COGS) for a set of sales.
export function grossMargin(sales: Sale[], products: Product[]): number {
  const costOf = (id: string) => {
    const p = products.find((x) => x.id === id)
    return p ? landedCost(p) : 0
  }
  return sales.reduce((total, sale) => {
    const m = sale.items.reduce(
      (sum, it) => sum + (it.unitPrice - costOf(it.productId)) * it.quantity,
      0,
    )
    return total + m
  }, 0)
}

// Inventory asset value at landed cost.
export function inventoryValue(products: Product[]): number {
  return products.reduce((s, p) => s + landedCost(p) * p.stock, 0)
}

// ── Cash reconciliation ───────────────────────────────────────────────────────
// Expected physical counts from money actually received in the window:
// down payments/full payments on sales plus later abonos. Bs methods roll into
// `bs`; efectivo USD and Zelle stay in USD. Binance/PdV are excluded from the till.
export function expectedCash(sales: Sale[], start: number, end: number): CashCount {
  const acc: CashCount = { efectivoUsd: 0, bs: 0, zelle: 0 }

  const addPayment = (key: PaymentKey, amount: number) => {
    if (!amount) return
    if (key === 'efectivoUsd') acc.efectivoUsd += amount
    else if (key === 'zelle') acc.zelle += amount
    else if (BS_PAYMENT_KEYS.includes(key)) acc.bs += amount
    // binance is intentionally ignored for the physical count
  }

  for (const s of sales) {
    if (!isActive(s)) continue
    // Down payment / full payment collected at checkout time.
    if (s.createdAt >= start && s.createdAt <= end && s.payments) {
      for (const k of Object.keys(s.payments) as PaymentKey[]) {
        addPayment(k, Number(s.payments[k]) || 0)
      }
    }
    // Abonos collected within the window (can post-date the sale).
    for (const a of s.abonos ?? []) {
      if (a.at >= start && a.at <= end) {
        const amount =
          a.method && BS_PAYMENT_KEYS.includes(a.method)
            ? a.amount * s.rate
            : a.amount
        addPayment(a.method, amount)
      }
    }
  }
  return acc
}

// Total operational expenses (USD) in a set.
export function totalExpenses(expenses: Expense[]): number {
  return expenses.reduce((s, e) => s + (Number(e.amountUsd) || 0), 0)
}
