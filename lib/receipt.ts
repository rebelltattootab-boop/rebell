import { bs, usd } from './format'
import type { RateSource, SaleItem, SalePayments } from './types'

const PAYMENT_LABELS: Record<keyof SalePayments, string> = {
  pagoMovil: 'Pago Móvil (Bs)',
  transferencia: 'Transferencia (Bs)',
  efectivoUsd: 'Efectivo USD',
  zelle: 'Zelle',
  binance: 'Binance',
}

// Whether a payment method is denominated in bolivares (vs USD).
const BS_METHODS: (keyof SalePayments)[] = ['pagoMovil', 'transferencia']

// Builds a plain-text WhatsApp receipt summarizing the sale, ready to be
// URL-encoded into a wa.me link.
export function buildReceiptText(params: {
  items: SaleItem[]
  totalUsd: number
  rate: number
  rateSource: RateSource
  payments: SalePayments
  customerName?: string
  cashier: string
}): string {
  const { items, totalUsd, rate, rateSource, payments, customerName, cashier } =
    params
  const totalBs = totalUsd * rate
  const date = new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())

  const lines: string[] = []
  lines.push('*REBEL TATTOO SUPPLY*')
  lines.push('Recibo de venta')
  lines.push(`${date}`)
  if (customerName) lines.push(`Cliente: ${customerName}`)
  lines.push(`Atendido por: ${cashier}`)
  lines.push('')
  lines.push('--------------------------------')

  for (const it of items) {
    lines.push(`${it.quantity}x ${it.name}`)
    lines.push(`   ${usd(it.unitPrice)} c/u = ${usd(it.unitPrice * it.quantity)}`)
  }

  lines.push('--------------------------------')
  lines.push(`*Total: ${usd(totalUsd)}*`)
  lines.push(`Tasa ${rateSource}: ${bs(rate)}/$`)
  lines.push(`*Total Bs: ${bs(totalBs)}*`)

  const paymentEntries = (Object.keys(payments) as (keyof SalePayments)[])
    .filter((k) => (payments[k] ?? 0) > 0)
  if (paymentEntries.length > 0) {
    lines.push('')
    lines.push('Pagos:')
    for (const k of paymentEntries) {
      const amount = payments[k] as number
      const formatted = BS_METHODS.includes(k) ? bs(amount) : usd(amount)
      lines.push(`  • ${PAYMENT_LABELS[k]}: ${formatted}`)
    }
  }

  lines.push('')
  lines.push('¡Gracias por tu compra!')
  return lines.join('\n')
}

export { PAYMENT_LABELS, BS_METHODS }
