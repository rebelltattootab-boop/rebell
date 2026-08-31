import { landedCost, type Expense, type Product, type Sale } from './types'

// ── CSV primitives ────────────────────────────────────────────────────────────
// Escape a single cell per RFC 4180: wrap in quotes when it contains a comma,
// quote, or newline, and double any embedded quotes.
function cell(value: unknown): string {
  const s = value == null ? '' : String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCSV(rows: (string | number)[][]): string {
  // Prepend a UTF-8 BOM so Excel opens accented Spanish text correctly.
  return '\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n')
}

// ── Download helper ─────────────────────────────────────────────────────────
export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on the next tick so the download has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Timestamp suffix like 2026-08-30_1435 for filenames.
export function stamp(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}_${p(
    now.getHours(),
  )}${p(now.getMinutes())}`
}

const money = (n: number) => (Number(n) || 0).toFixed(2)
const dateStr = (ms: number) =>
  Number.isFinite(ms) ? new Date(ms).toLocaleString('es-VE') : ''

// Human-readable summary of a sale's payment methods.
const PAYMENT_LABELS: Record<string, string> = {
  pagoMovil: 'Pago Móvil',
  transferencia: 'Transferencia',
  efectivoUsd: 'Efectivo USD',
  zelle: 'Zelle',
  binance: 'Binance',
}

export function paymentSummary(sale: Sale): string {
  if (sale.credit && (sale.amountPaid ?? 0) < sale.totalUsd) {
    const used = Object.entries(sale.payments ?? {})
      .filter(([, v]) => (Number(v) || 0) > 0)
      .map(([k]) => PAYMENT_LABELS[k] ?? k)
    return used.length ? `Crédito (${used.join(' + ')})` : 'Crédito / Pendiente'
  }
  const used = Object.entries(sale.payments ?? {})
    .filter(([, v]) => (Number(v) || 0) > 0)
    .map(([k]) => PAYMENT_LABELS[k] ?? k)
  return used.length ? used.join(' + ') : '—'
}

// ── Sheet builders ────────────────────────────────────────────────────────────
export function inventoryCSV(products: Product[]): string {
  const rows: (string | number)[][] = [
    ['Producto', 'Categoría', 'Variante', 'Stock', 'Costo Importación ($)', 'Precio Venta ($)'],
  ]
  for (const p of products) {
    rows.push([
      p.name,
      p.category,
      p.variantLabel ?? '',
      p.stock,
      money(landedCost(p)),
      money(p.price),
    ])
  }
  return toCSV(rows)
}

export function salesCSV(sales: Sale[]): string {
  const rows: (string | number)[][] = [
    ['Fecha', 'Artículos', 'Total $', 'Total Bs', 'Método de Pago', 'Cliente', 'Responsable', 'Estado'],
  ]
  for (const s of sales) {
    const items = s.items
      .map((i) => `${i.quantity}x ${i.name}`)
      .join(' | ')
    rows.push([
      dateStr(s.createdAt),
      items,
      money(s.totalUsd),
      money(s.totalBs),
      paymentSummary(s),
      s.customerName ?? '',
      s.createdBy ?? '',
      s.status === 'void' ? 'Anulada' : 'Activa',
    ])
  }
  return toCSV(rows)
}

export function expensesCSV(expenses: Expense[]): string {
  const rows: (string | number)[][] = [
    ['Fecha', 'Categoría', 'Monto $', 'Monto Bs', 'Método', 'Usuario', 'Nota'],
  ]
  for (const e of expenses) {
    rows.push([
      dateStr(e.createdAt),
      e.category,
      money(e.amountUsd),
      money(e.amountBs),
      e.method,
      e.user,
      e.note ?? '',
    ])
  }
  return toCSV(rows)
}
