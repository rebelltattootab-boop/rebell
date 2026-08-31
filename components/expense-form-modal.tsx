'use client'

import { useMemo, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { useSession } from '@/context/session-context'
import { registerExpense } from '@/lib/store'
import { bs } from '@/lib/format'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_METHODS,
  type ExpenseCategory,
  type ExpenseMethod,
} from '@/lib/types'

// Captures an operational expense in USD with a live Bs conversion, a category,
// a payment method, an optional note, and the active-user stamp.
export function ExpenseFormModal({
  rate,
  onClose,
  onSaved,
}: {
  rate: number | null
  onClose: () => void
  onSaved: (msg: string) => void
}) {
  const { activeUser } = useSession()
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>(
    EXPENSE_CATEGORIES[0],
  )
  const [method, setMethod] = useState<ExpenseMethod>(EXPENSE_METHODS[0])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amountUsd = Number(amount) || 0
  const amountBs = useMemo(
    () => (rate ? amountUsd * rate : null),
    [amountUsd, rate],
  )

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (amountUsd <= 0) {
      setError('Ingresa un monto válido')
      return
    }
    if (!rate) {
      setError('Sin tasa BCV disponible')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await registerExpense({
        amountUsd,
        rate,
        category,
        method,
        note,
        user: activeUser,
      })
      onSaved(`Gasto registrado · $${amountUsd.toFixed(2)}`)
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
          <h2 className="text-lg font-semibold">Registrar gasto</h2>
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
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5"
        >
          {/* Amount */}
          <div>
            <label className="text-sm font-medium" htmlFor="expense-amount">
              Monto en dólares
            </label>
            <div className="mt-2 flex items-center rounded-xl border border-input bg-secondary/40 px-4 focus-within:border-ring">
              <span className="text-lg text-muted-foreground">$</span>
              <input
                id="expense-amount"
                inputMode="decimal"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full min-w-0 bg-transparent px-2 py-3 text-lg outline-none"
              />
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground tabular-nums">
              {amountBs !== null
                ? `≈ ${bs(amountBs)}`
                : 'Tasa BCV no disponible'}
            </p>
          </div>

          {/* Category */}
          <div>
            <span className="text-sm font-medium">Categoría</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXPENSE_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    category === c
                      ? 'border-primary bg-primary/15 text-foreground'
                      : 'border-input bg-secondary/40 text-muted-foreground'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div>
            <span className="text-sm font-medium">Método de pago</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {EXPENSE_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    method === m
                      ? 'border-primary bg-primary/15 text-foreground'
                      : 'border-input bg-secondary/40 text-muted-foreground'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Descripción (opcional)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="input h-auto resize-none py-3"
              placeholder="Ej: Flete DHL pedido agujas"
            />
          </label>

          <div className="rounded-xl bg-secondary/40 px-4 py-2.5 text-xs text-muted-foreground">
            Registrado por{' '}
            <span className="font-medium text-foreground">{activeUser}</span>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="flex h-13 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground active:opacity-80 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-5 w-5 animate-spin" />}
            Guardar gasto
          </button>
        </form>
      </div>
    </div>
  )
}
