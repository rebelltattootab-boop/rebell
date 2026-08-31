export function usd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

export function bs(value: number): string {
  const formatted = new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
  return `Bs ${formatted}`
}

export function saleDate(epochMs: number): string {
  if (!Number.isFinite(epochMs)) return '—'
  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(epochMs))
}

// Day-only date (used for expiration dates).
export function shortDate(epochMs?: number): string {
  if (!epochMs || !Number.isFinite(epochMs)) return '—'
  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(epochMs))
}

// Convert epoch ms -> "YYYY-MM-DD" for <input type="date"> (local time).
export function toDateInput(epochMs?: number): string {
  if (!epochMs || !Number.isFinite(epochMs)) return ''
  const d = new Date(epochMs)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// Convert "YYYY-MM-DD" -> epoch ms at local start of day, or undefined.
export function fromDateInput(value: string): number | undefined {
  if (!value) return undefined
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d).getTime()
}
