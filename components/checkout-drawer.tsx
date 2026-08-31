'use client'

import { useMemo, useState } from 'react'
import {
  Check,
  Loader2,
  MessageCircle,
  Search,
  UserPlus,
  X,
} from 'lucide-react'
import type { RatesValue } from '@/hooks/use-rates'
import { useSession } from '@/context/session-context'
import { registerSale } from '@/lib/store'
import { bs, usd } from '@/lib/format'
import { buildReceiptText } from '@/lib/receipt'
import type { Customer, Product, RateSource, SalePayments } from '@/lib/types'
import { CustomerFormModal } from './customer-form-modal'

type CartLine = { product: Product; quantity: number }

type PaymentKey = keyof SalePayments

const BS_FIELDS: { key: PaymentKey; label: string }[] = [
  { key: 'pagoMovil', label: 'Pago Móvil' },
  { key: 'transferencia', label: 'Transferencia' },
]
const USD_FIELDS: { key: PaymentKey; label: string }[] = [
  { key: 'efectivoUsd', label: 'Efectivo USD' },
  { key: 'zelle', label: 'Zelle' },
  { key: 'binance', label: 'Binance' },
]

export function CheckoutDrawer({
  lines,
  rates,
  customers,
  onClose,
  onComplete,
}: {
  lines: CartLine[]
  rates: RatesValue
  customers: Customer[]
  onClose: () => void
  onComplete: (msg: string) => void
}) {
  const { activeUser } = useSession()
  const [credit, setCredit] = useState(false)
  const [rateSource, setRateSource] = useState<RateSource>('BCV')
  const [amounts, setAmounts] = useState<Record<PaymentKey, string>>({
    pagoMovil: '',
    transferencia: '',
    efectivoUsd: '',
    zelle: '',
    binance: '',
  })
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [search, setSearch] = useState('')
  const [newCustomerOpen, setNewCustomerOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rate = rates.rateFor(rateSource)
  const totalUsd = lines.reduce((s, l) => s + l.product.price * l.quantity, 0)
  const totalBs = rate ? totalUsd * rate : null

  // Reconcile split payments back to USD for a running balance.
  const paidUsd = useMemo(() => {
    if (!rate) return 0
    const bsPaid =
      (Number(amounts.pagoMovil) || 0) + (Number(amounts.transferencia) || 0)
    const usdPaid =
      (Number(amounts.efectivoUsd) || 0) +
      (Number(amounts.zelle) || 0) +
      (Number(amounts.binance) || 0)
    return usdPaid + bsPaid / rate
  }, [amounts, rate])

  const remaining = totalUsd - paidUsd

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return []
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.studio?.toLowerCase().includes(term),
      )
      .slice(0, 5)
  }, [customers, search])

  function collectPayments(): SalePayments {
    const out: SalePayments = {}
    for (const k of Object.keys(amounts) as PaymentKey[]) {
      const v = Number(amounts[k])
      if (Number.isFinite(v) && v > 0) out[k] = v
    }
    return out
  }

  function handleReceipt() {
    if (!rate) return
    const text = buildReceiptText({
      items: lines.map((l) => ({
        productId: l.product.id,
        name: l.product.name,
        quantity: l.quantity,
        unitPrice: l.product.price,
      })),
      totalUsd,
      rate,
      rateSource,
      payments: collectPayments(),
      customerName: customer?.name,
      cashier: activeUser,
    })
    const base = customer?.whatsapp
      ? `https://wa.me/${customer.whatsapp}?text=`
      : 'https://wa.me/?text='
    const url = base + encodeURIComponent(text)
    // Always open in a new tab so it works inside the preview iframe too.
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function handleConfirm() {
    if (!rate || lines.length === 0) return
    if (credit && !customer) {
      setError('Asigna un cliente para la venta a crédito')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const { totalUsd: t, balanceUsd } = await registerSale({
        items: lines.map((l) => ({
          productId: l.product.id,
          name: l.product.name,
          quantity: l.quantity,
          unitPrice: l.product.price,
        })),
        type: 'Detal',
        rate,
        user: activeUser,
        rateSource,
        payments: collectPayments(),
        customer: customer ? { id: customer.id, name: customer.name } : null,
        credit,
        amountPaid: credit ? paidUsd : undefined,
      })
      onComplete(
        credit && balanceUsd > 0.009
          ? `Crédito registrado · debe ${usd(balanceUsd)}`
          : `Venta registrada · ${usd(t)}`,
      )
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-border bg-card sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Cobrar</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground active:opacity-70"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Total */}
          <div className="rounded-2xl border border-border bg-secondary/30 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">
                {lines.reduce((n, l) => n + l.quantity, 0)} productos
              </span>
              <span className="text-2xl font-semibold">{usd(totalUsd)}</span>
            </div>
            <div className="mt-1 text-right font-mono text-sm text-muted-foreground">
              {totalBs !== null ? bs(totalBs) : 'Sin tasa'}
            </div>
          </div>

          {/* Sale type: cash vs credit */}
          <div className="mt-5">
            <span className="text-sm font-medium">Tipo de venta</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(
                [
                  { value: false, label: 'Contado', hint: 'Pago completo' },
                  { value: true, label: 'Crédito / Pendiente', hint: 'Fiado' },
                ] as { value: boolean; label: string; hint: string }[]
              ).map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setCredit(o.value)}
                  className={`flex flex-col items-start rounded-xl border px-4 py-2.5 text-left transition-colors ${
                    credit === o.value
                      ? 'border-primary bg-primary/15'
                      : 'border-input bg-secondary/40'
                  }`}
                >
                  <span className="text-sm font-semibold">{o.label}</span>
                  <span className="text-xs text-muted-foreground">{o.hint}</span>
                </button>
              ))}
            </div>
            {credit && !customer && (
              <p className="mt-2 text-xs text-chart-3">
                Asigna un cliente para registrar la venta a crédito.
              </p>
            )}
          </div>

          {/* Rate toggle */}
          <div className="mt-5">
            <span className="text-sm font-medium">Tasa de cambio</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(['BCV', 'Binance'] as RateSource[]).map((s) => {
                const r = rates.rateFor(s)
                return (
                  <button
                    key={s}
                    onClick={() => setRateSource(s)}
                    className={`flex flex-col items-start rounded-xl border px-4 py-2.5 text-left transition-colors ${
                      rateSource === s
                        ? 'border-primary bg-primary/15'
                        : 'border-input bg-secondary/40'
                    }`}
                  >
                    <span className="text-sm font-semibold">
                      {s === 'BCV' ? 'BCV' : 'Binance P2P'}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {r ? bs(r) : '—'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Customer assignment */}
          <div className="mt-5">
            <span className="text-sm font-medium">Cliente (opcional)</span>
            {customer ? (
              <div className="mt-2 flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{customer.name}</div>
                  {customer.studio && (
                    <div className="truncate text-xs text-muted-foreground">
                      {customer.studio}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setCustomer(null)}
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <div className="mt-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar cliente…"
                    className="input pl-9"
                    aria-label="Buscar cliente"
                  />
                </div>
                {matches.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {matches.map((c) => (
                      <li key={c.id}>
                        <button
                          onClick={() => {
                            setCustomer(c)
                            setSearch('')
                          }}
                          className="flex w-full items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-left text-sm active:opacity-70"
                        >
                          <span className="truncate">{c.name}</span>
                          {c.studio && (
                            <span className="ml-2 truncate text-xs text-muted-foreground">
                              {c.studio}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  onClick={() => setNewCustomerOpen(true)}
                  className="mt-2 flex items-center gap-1.5 text-sm font-medium text-primary active:opacity-70"
                >
                  <UserPlus className="h-4 w-4" />
                  Nuevo Cliente
                </button>
              </div>
            )}
          </div>

          {/* Split payments */}
          <div className="mt-5">
            <span className="text-sm font-medium">
              {credit ? 'Abono inicial (opcional)' : 'Pago dividido'}
            </span>
            <div className="mt-2 flex flex-col gap-3">
              <div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Bolívares
                </span>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {BS_FIELDS.map((f) => (
                    <PaymentInput
                      key={f.key}
                      label={f.label}
                      prefix="Bs"
                      value={amounts[f.key]}
                      onChange={(v) => setAmounts((p) => ({ ...p, [f.key]: v }))}
                    />
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Dólares
                </span>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {USD_FIELDS.map((f) => (
                    <PaymentInput
                      key={f.key}
                      label={f.label}
                      prefix="$"
                      value={amounts[f.key]}
                      onChange={(v) => setAmounts((p) => ({ ...p, [f.key]: v }))}
                    />
                  ))}
                </div>
              </div>
            </div>

            {(paidUsd > 0 || credit) && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-secondary/40 px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">
                  {credit ? 'Abonado' : 'Pagado'} {usd(paidUsd)}
                </span>
                <span
                  className={
                    Math.abs(remaining) < 0.01
                      ? 'font-medium text-success'
                      : remaining > 0
                        ? 'font-medium text-chart-3'
                        : 'font-medium text-primary'
                  }
                >
                  {Math.abs(remaining) < 0.01
                    ? credit
                      ? 'Saldado'
                      : 'Cuadrado'
                    : remaining > 0
                      ? credit
                        ? `Queda debiendo ${usd(remaining)}`
                        : `Faltan ${usd(remaining)}`
                      : `Vuelto ${usd(-remaining)}`}
                </span>
              </div>
            )}
          </div>

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 border-t border-border px-6 py-4">
          <button
            onClick={handleReceipt}
            disabled={!rate}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-success text-base font-semibold text-success-foreground active:opacity-80 disabled:opacity-50"
          >
            <MessageCircle className="h-5 w-5" />
            Generar Recibo WhatsApp
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || !rate || (credit && !customer)}
            className="flex h-13 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground active:opacity-80 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-5 w-5" />
            )}
            {credit ? 'Registrar crédito' : 'Confirmar venta'}
          </button>
        </div>
      </div>

      <CustomerFormModal
        open={newCustomerOpen}
        initialName={search}
        onClose={() => setNewCustomerOpen(false)}
        onCreated={(result) => {
          // The realtime customers list will include it shortly; select now.
          setCustomer({
            id: result.id,
            name: result.name,
            createdAt: Date.now(),
          })
          setSearch('')
        }}
      />
    </div>
  )
}

function PaymentInput({
  label,
  prefix,
  value,
  onChange,
}: {
  label: string
  prefix: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center rounded-xl border border-input bg-secondary/40 px-2.5 focus-within:border-ring">
        <span className="text-xs text-muted-foreground">{prefix}</span>
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-full min-w-0 bg-transparent px-1.5 py-2.5 text-sm outline-none"
        />
      </div>
    </label>
  )
}
