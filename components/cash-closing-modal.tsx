'use client'

import { useMemo, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { useSession } from '@/context/session-context'
import { recordCashClosing } from '@/lib/store'
import { expectedCash, rangeStart } from '@/lib/finance'
import { bs, usd } from '@/lib/format'
import type { CashCount, Sale } from '@/lib/types'

type Field = { key: keyof CashCount; label: string; currency: 'usd' | 'bs' }

const FIELDS: Field[] = [
  { key: 'efectivoUsd', label: 'Efectivo USD', currency: 'usd' },
  { key: 'bs', label: 'Pago Móvil / Transferencia', currency: 'bs' },
  { key: 'zelle', label: 'Zelle', currency: 'usd' },
]

// Cuadre de caja: declare physical counts and compare against what the system
// expected to receive today, surfacing sobrante/faltante per method.
export function CashClosingModal({
  sales,
  rate,
  onClose,
  onSaved,
}: {
  sales: Sale[]
  rate: number | null
  onClose: () => void
  onSaved: (msg: string) => void
}) {
  const { activeUser } = useSession()
  const [declared, setDeclared] = useState<Record<keyof CashCount, string>>({
    efectivoUsd: '',
    bs: '',
    zelle: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const now = useMemo(() => new Date(), [])
  const start = rangeStart('today', now)
  const end = now.getTime()

  const expected = useMemo(
    () => expectedCash(sales, start, end),
    [sales, start, end],
  )

  const fmt = (key: keyof CashCount, value: number) =>
    FIELDS.find((f) => f.key === key)?.currency === 'bs' ? bs(value) : usd(value)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!rate) {
      setError('Sin tasa BCV disponible')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const declaredCount: CashCount = {
        efectivoUsd: Number(declared.efectivoUsd) || 0,
        bs: Number(declared.bs) || 0,
        zelle: Number(declared.zelle) || 0,
      }
      await recordCashClosing({
        user: activeUser,
        rate,
        rangeStart: start,
        rangeEnd: end,
        expected,
        declared: declaredCount,
      })
      onSaved('Cierre de caja registrado')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
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
          <div>
            <h2 className="text-lg font-semibold">Cierre de caja</h2>
            <p className="text-xs text-muted-foreground">
              Turno de hoy · {activeUser}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground active:opacity-70"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={submit}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5"
        >
          <p className="text-sm text-muted-foreground text-pretty">
            Declara el conteo físico de cada método. El sistema lo compara con lo
            esperado según las ventas del día.
          </p>

          {FIELDS.map((f) => {
            const exp = expected[f.key]
            const dec = Number(declared[f.key]) || 0
            const diff = dec - exp
            const hasInput = declared[f.key] !== ''
            return (
              <div
                key={f.key}
                className="rounded-2xl border border-border bg-secondary/30 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{f.label}</span>
                  <span className="text-xs text-muted-foreground">
                    Esperado{' '}
                    <span className="font-medium text-foreground tabular-nums">
                      {fmt(f.key, exp)}
                    </span>
                  </span>
                </div>
                <div className="mt-2 flex items-center rounded-xl border border-input bg-background/60 px-3 focus-within:border-ring">
                  <span className="text-sm text-muted-foreground">
                    {f.currency === 'bs' ? 'Bs' : '$'}
                  </span>
                  <input
                    inputMode="decimal"
                    value={declared[f.key]}
                    onChange={(e) =>
                      setDeclared((p) => ({ ...p, [f.key]: e.target.value }))
                    }
                    placeholder="Conteo físico"
                    className="w-full min-w-0 bg-transparent px-2 py-2.5 text-sm outline-none"
                    aria-label={`Conteo declarado de ${f.label}`}
                  />
                </div>
                {hasInput && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Diferencia</span>
                    <span
                      className={`font-semibold tabular-nums ${
                        Math.abs(diff) < 0.01
                          ? 'text-success'
                          : diff > 0
                            ? 'text-chart-3'
                            : 'text-rose-400'
                      }`}
                    >
                      {Math.abs(diff) < 0.01
                        ? 'Cuadrado'
                        : `${diff > 0 ? 'Sobrante' : 'Faltante'} ${fmt(f.key, Math.abs(diff))}`}
                    </span>
                  </div>
                )}
              </div>
            )
          })}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={saving || !rate}
            className="flex h-13 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground active:opacity-80 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-5 w-5 animate-spin" />}
            Guardar cierre
          </button>
        </form>
      </div>
    </div>
  )
}
