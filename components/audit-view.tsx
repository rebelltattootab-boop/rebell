'use client'

import { ArrowRight, KeyRound, Package, ScrollText, XCircle } from 'lucide-react'
import { useAudit } from '@/hooks/use-collections'
import { saleDate, usd } from '@/lib/format'
import type { AuditEntry } from '@/lib/types'

export function AuditView() {
  const { entries, loading } = useAudit()

  return (
    <div className="flex flex-col gap-4 pb-28">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Auditoría</h1>
        <p className="text-sm text-muted-foreground">
          Registro inmutable de cambios · solo lectura
        </p>
      </header>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Cargando registro…
        </p>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
            <ScrollText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-pretty">
            Aún no hay eventos registrados.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((e) => (
            <AuditCard key={e.id} entry={e} />
          ))}
        </ul>
      )}
    </div>
  )
}

function AuditCard({ entry }: { entry: AuditEntry }) {
  const meta = CONFIG[entry.type]
  const Icon = meta.icon

  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{meta.title}</span>
            <span className="shrink-0 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {entry.user}
            </span>
          </div>

          {entry.type === 'stock_adjustment' && (
            <div className="mt-1">
              <p className="truncate text-sm">{entry.productName}</p>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <span className="tabular-nums text-muted-foreground">
                  {entry.previousQty}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-semibold tabular-nums">{entry.newQty}</span>
                <span className="ml-1 rounded-md bg-secondary px-2 py-0.5 text-xs">
                  {entry.reason}
                </span>
              </div>
            </div>
          )}

          {entry.type === 'sale_void' && (
            <div className="mt-1 text-sm">
              <p>
                Venta anulada · {usd(entry.totalUsd ?? 0)} ·{' '}
                {(entry.items ?? []).reduce((n, i) => n + i.quantity, 0)} u.
                devueltas
              </p>
              {entry.voidReason && (
                <p className="mt-0.5 text-muted-foreground text-pretty">
                  {entry.voidReason}
                </p>
              )}
            </div>
          )}

          {entry.type === 'pin_change' && (
            <p className="mt-1 text-sm text-muted-foreground">
              El PIN maestro fue modificado.
            </p>
          )}

          <p className="mt-2 text-xs text-muted-foreground">
            {saleDate(entry.createdAt)}
          </p>
        </div>
      </div>
    </li>
  )
}

const CONFIG: Record<
  AuditEntry['type'],
  { title: string; icon: typeof Package; tone: string }
> = {
  stock_adjustment: {
    title: 'Ajuste de stock',
    icon: Package,
    tone: 'bg-chart-2/20 text-chart-2',
  },
  sale_void: {
    title: 'Venta anulada',
    icon: XCircle,
    tone: 'bg-destructive/20 text-destructive',
  },
  pin_change: {
    title: 'Cambio de PIN',
    icon: KeyRound,
    tone: 'bg-primary/20 text-primary',
  },
}
