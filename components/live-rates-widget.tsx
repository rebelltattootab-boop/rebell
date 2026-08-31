'use client'

import { useState } from 'react'
import { Check, Pencil, RefreshCw, X } from 'lucide-react'
import type { RatesValue } from '@/hooks/use-rates'
import { bs } from '@/lib/format'
import type { RateSource } from '@/lib/types'

// Header widget showing both live rates with a spread badge, a refresh button,
// and tap-to-override editing for when a feed is offline.
export function LiveRatesWidget({ rates }: { rates: RatesValue }) {
  const { spread, isLoading, refresh } = rates

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Tasas del día
        </span>
        <div className="flex items-center gap-2">
          {spread !== null && (
            <span
              className="rounded-full bg-chart-3/15 px-2 py-0.5 font-mono text-xs font-semibold text-chart-3"
              title="Diferencial Binance vs BCV"
            >
              +{spread.toFixed(1)}% spread
            </span>
          )}
          <button
            onClick={refresh}
            aria-label="Actualizar tasas"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground active:opacity-70"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <RateCell
          label="Tasa BCV"
          source="BCV"
          value={rates.bcv}
          isManual={rates.manual.BCV !== undefined}
          error={rates.bcvError}
          onSet={(v) => rates.setManual('BCV', v)}
        />
        <RateCell
          label="Binance P2P"
          source="Binance"
          value={rates.binance}
          isManual={rates.manual.Binance !== undefined}
          error={rates.binanceError}
          onSet={(v) => rates.setManual('Binance', v)}
        />
      </div>
    </div>
  )
}

function RateCell({
  label,
  source,
  value,
  isManual,
  error,
  onSet,
}: {
  label: string
  source: RateSource
  value: number | null
  isManual: boolean
  error: boolean
  onSet: (value: number | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function save() {
    const parsed = Number(draft.replace(',', '.'))
    if (Number.isFinite(parsed) && parsed > 0) onSet(parsed)
    setEditing(false)
    setDraft('')
  }

  const accent = source === 'Binance' ? 'text-chart-3' : 'text-foreground'

  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {isManual ? (
          <span className="rounded bg-primary/15 px-1.5 text-[10px] font-medium text-primary">
            manual
          </span>
        ) : error ? (
          <span className="rounded bg-destructive/15 px-1.5 text-[10px] font-medium text-destructive">
            offline
          </span>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-1 flex items-center gap-1">
          <input
            autoFocus
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) save()
              if (e.key === 'Escape') setEditing(false)
            }}
            placeholder={value ? String(value) : '0.00'}
            className="w-full min-w-0 rounded-lg border border-input bg-background px-2 py-1 font-mono text-sm outline-none focus:border-ring"
            aria-label={`Editar ${label}`}
          />
          <button
            onClick={save}
            aria-label="Guardar"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground active:opacity-70"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setEditing(false)}
            aria-label="Cancelar"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground active:opacity-70"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            setDraft(value ? String(value) : '')
            setEditing(true)
          }}
          className="mt-0.5 flex w-full items-center justify-between gap-1 active:opacity-70"
        >
          <span className={`font-mono text-base font-semibold tabular-nums ${accent}`}>
            {value ? bs(value) : '—'}
          </span>
          <Pencil className="h-3 w-3 shrink-0 text-muted-foreground" />
        </button>
      )}

      {isManual && !editing && (
        <button
          onClick={() => onSet(null)}
          className="mt-1 text-[10px] text-muted-foreground underline-offset-2 hover:underline"
        >
          Usar tasa automática
        </button>
      )}
    </div>
  )
}
