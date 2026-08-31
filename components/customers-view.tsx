'use client'

import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  AtSign,
  MessageCircle,
  Pencil,
  Store,
  UserPlus,
  Users,
} from 'lucide-react'
import { useCustomers, useProducts, useSales } from '@/hooks/use-collections'
import { bs, saleDate, usd } from '@/lib/format'
import type { Customer, Sale } from '@/lib/types'
import { CustomerFormModal } from './customer-form-modal'

type Sort = 'top' | 'frequent'

type CustomerStats = {
  customer: Customer
  totalUsd: number
  count: number
  lastAt: number
}

export function CustomersView() {
  const { customers } = useCustomers()
  const { sales } = useSales()
  const { products } = useProducts()
  const [sort, setSort] = useState<Sort>('top')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)

  // Only active sales count toward CRM spend/frequency stats.
  const activeSales = useMemo(
    () => sales.filter((s) => s.status !== 'void' && s.customerId),
    [sales],
  )

  const stats = useMemo<CustomerStats[]>(() => {
    const map = new Map<string, CustomerStats>()
    for (const c of customers) {
      map.set(c.id, { customer: c, totalUsd: 0, count: 0, lastAt: 0 })
    }
    for (const s of activeSales) {
      const entry = map.get(s.customerId as string)
      if (!entry) continue
      entry.totalUsd += s.totalUsd
      entry.count += 1
      entry.lastAt = Math.max(entry.lastAt, s.createdAt)
    }
    const list = Array.from(map.values())
    list.sort((a, b) =>
      sort === 'top' ? b.totalUsd - a.totalUsd : b.count - a.count,
    )
    return list
  }, [customers, activeSales, sort])

  const selected = customers.find((c) => c.id === selectedId) ?? null

  if (selected) {
    return (
      <>
        <CustomerDetail
          customer={selected}
          sales={sales}
          products={products}
          onBack={() => setSelectedId(null)}
          onEdit={() => {
            setEditing(selected)
            setFormOpen(true)
          }}
        />
        <CustomerFormModal
          open={formOpen}
          customer={editing}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      </>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {customers.length} registrados
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground active:opacity-80"
        >
          <UserPlus className="h-4 w-4" />
          Nuevo
        </button>
      </header>

      {/* Sort toggle */}
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            { id: 'top', label: 'Top Compradores' },
            { id: 'frequent', label: 'Frecuentes' },
          ] as { id: Sort; label: string }[]
        ).map((o) => (
          <button
            key={o.id}
            onClick={() => setSort(o.id)}
            className={`h-11 rounded-xl border text-sm font-semibold transition-colors ${
              sort === o.id
                ? 'border-primary bg-primary/15 text-foreground'
                : 'border-input bg-secondary/40 text-muted-foreground'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {customers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Users className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Aún no hay clientes registrados.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {stats.map(({ customer, totalUsd, count }, idx) => (
            <li key={customer.id}>
              <button
                onClick={() => setSelectedId(customer.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left active:opacity-80"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-sm font-bold text-secondary-foreground">
                  {idx < 3 && (sort === 'top' || sort === 'frequent')
                    ? idx + 1
                    : customer.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {customer.name}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {customer.studio ? `${customer.studio} · ` : ''}
                    {count} compra{count === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold tabular-nums">
                    {usd(totalUsd)}
                  </div>
                  <div className="text-xs text-muted-foreground">gastado</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <CustomerFormModal
        open={formOpen}
        customer={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}

function CustomerDetail({
  customer,
  sales,
  products,
  onBack,
  onEdit,
}: {
  customer: Customer
  sales: Sale[]
  products: { id: string; name: string }[]
  onBack: () => void
  onEdit: () => void
}) {
  const history = useMemo(
    () =>
      sales
        .filter((s) => s.customerId === customer.id && s.status !== 'void')
        .sort((a, b) => b.createdAt - a.createdAt),
    [sales, customer.id],
  )

  const totalSpent = history.reduce((s, x) => s + x.totalUsd, 0)

  // Aggregate quantities per product to surface favorites / most bought.
  const favorites = useMemo(() => {
    const map = new Map<string, { name: string; qty: number }>()
    for (const s of history) {
      for (const it of s.items) {
        const prev = map.get(it.productId)
        map.set(it.productId, {
          name: it.name,
          qty: (prev?.qty ?? 0) + it.quantity,
        })
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
  }, [history])

  const waLink = customer.whatsapp
    ? `https://wa.me/${customer.whatsapp}`
    : null

  return (
    <div className="flex flex-col gap-4 pb-24">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground active:opacity-70"
      >
        <ArrowLeft className="h-4 w-4" />
        Clientes
      </button>

      {/* Contact card */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-balance">
              {customer.name}
            </h1>
            {customer.studio && (
              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Store className="h-3.5 w-3.5" />
                {customer.studio}
              </div>
            )}
            {customer.instagram && (
              <a
                href={`https://instagram.com/${customer.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-2 hover:underline"
              >
                <AtSign className="h-3.5 w-3.5" />
                {customer.instagram}
              </a>
            )}
          </div>
          <button
            onClick={onEdit}
            aria-label="Editar cliente"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground active:opacity-70"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <div>
            <div className="text-lg font-semibold tabular-nums">
              {usd(totalSpent)}
            </div>
            <div className="text-xs text-muted-foreground">Total gastado</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="text-lg font-semibold tabular-nums">
              {history.length}
            </div>
            <div className="text-xs text-muted-foreground">Compras</div>
          </div>
        </div>

        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-success text-sm font-semibold text-success-foreground active:opacity-80"
          >
            <MessageCircle className="h-4 w-4" />
            Escribir por WhatsApp
          </a>
        )}
      </div>

      {/* Favorites */}
      {favorites.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            Productos favoritos
          </h2>
          <ul className="flex flex-col gap-2">
            {favorites.map((f) => (
              <li
                key={f.name}
                className="flex items-center justify-between rounded-xl bg-card/60 px-4 py-3 text-sm"
              >
                <span className="truncate">{f.name}</span>
                <span className="shrink-0 font-medium tabular-nums text-muted-foreground">
                  {f.qty} u.
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Purchase history */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
          Historial de compras
        </h2>
        {history.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin compras registradas todavía.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-border bg-card p-3.5 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {saleDate(s.createdAt)}
                  </span>
                  <span className="font-semibold">{usd(s.totalUsd)}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {s.items.map((i) => `${i.quantity}x ${i.name}`).join(' · ')}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {bs(s.totalBs)}
                  {s.rateSource ? ` · ${s.rateSource}` : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
