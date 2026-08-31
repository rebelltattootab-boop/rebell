'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import {
  CATEGORIES,
  SUPPLIERS,
  landedCost,
  profitMargin,
  type Category,
  type Product,
  type Supplier,
} from '@/lib/types'
import { createProduct, updateProduct } from '@/lib/store'
import { fromDateInput, toDateInput, usd } from '@/lib/format'

type Props = {
  open: boolean
  onClose: () => void
  product?: Product | null
}

const empty = {
  name: '',
  category: 'Tintas' as Category,
  sku: '',
  stock: '',
  price: '',
  cost: '',
  groupName: '',
  variantLabel: '',
  expiresAt: '',
  supplier: '' as Supplier | '',
  purchaseUrl: '',
  originCost: '',
  freightCost: '',
}

// Categories that track an expiration date.
const EXPIRY_CATEGORIES: Category[] = ['First-Aid', 'Tintas']

export function ProductForm({ open, onClose, product }: Props) {
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        category: product.category,
        sku: product.sku,
        stock: String(product.stock),
        price: String(product.price),
        cost: product.cost != null ? String(product.cost) : '',
        groupName: product.groupName ?? '',
        variantLabel: product.variantLabel ?? '',
        expiresAt: toDateInput(product.expiresAt),
        supplier: product.supplier ?? '',
        purchaseUrl: product.purchaseUrl ?? '',
        originCost: product.originCost != null ? String(product.originCost) : '',
        freightCost: product.freightCost != null ? String(product.freightCost) : '',
      })
    } else {
      setForm(empty)
    }
    setError(null)
  }, [product, open])

  // Live landed cost + margin preview.
  const preview = useMemo(() => {
    const cost = landedCost({
      originCost: Number(form.originCost) || 0,
      freightCost: Number(form.freightCost) || 0,
      cost: Number(form.cost) || 0,
    })
    const margin = profitMargin(Number(form.price) || 0, cost)
    return { cost, margin }
  }, [form.originCost, form.freightCost, form.cost, form.price])

  if (!open) return null

  const showExpiry = EXPIRY_CATEGORIES.includes(form.category)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      // Only include optional fields when set — Firestore rejects undefined.
      const optional: Partial<Product> = {}
      if (form.cost !== '') optional.cost = Math.max(0, Number(form.cost))
      if (form.groupName.trim()) optional.groupName = form.groupName.trim()
      if (form.variantLabel.trim()) optional.variantLabel = form.variantLabel.trim()
      if (showExpiry && form.expiresAt) {
        const ts = fromDateInput(form.expiresAt)
        if (ts) optional.expiresAt = ts
      }
      if (form.supplier) optional.supplier = form.supplier
      if (form.purchaseUrl.trim()) optional.purchaseUrl = form.purchaseUrl.trim()
      if (form.originCost !== '') optional.originCost = Math.max(0, Number(form.originCost))
      if (form.freightCost !== '') optional.freightCost = Math.max(0, Number(form.freightCost))

      const base = {
        name: form.name.trim(),
        category: form.category,
        sku: form.sku.trim(),
        price: Math.max(0, Number(form.price) || 0),
        ...optional,
      }
      if (product) {
        // Stock is intentionally omitted — it can only change via Ajuste de Stock.
        await updateProduct(product.id, base)
      } else {
        await createProduct({
          ...base,
          stock: Math.max(0, Math.floor(Number(form.stock) || 0)),
        })
      }
      onClose()
    } catch (err) {
      setError((err as Error).message || 'No se pudo guardar el producto.')
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
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-3xl border border-border bg-card sm:rounded-3xl">
        <div className="flex items-center justify-between px-6 pb-4 pt-6">
          <h2 className="text-lg font-semibold">
            {product ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground active:opacity-70"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 overflow-y-auto px-6 pb-8"
        >
          <Field label="Nombre">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="Tinta negra 30ml"
            />
          </Field>

          <Field label="Categoría">
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setForm({ ...form, category: c })}
                  className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
                    form.category === c
                      ? 'border-primary bg-primary/15 text-foreground'
                      : 'border-input bg-secondary/40 text-muted-foreground'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>

          {/* Variant grouping */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Grupo · opcional">
              <input
                value={form.groupName}
                onChange={(e) => setForm({ ...form, groupName: e.target.value })}
                className="input"
                placeholder="Agujas T-Rex"
              />
            </Field>
            <Field label="Configuración">
              <input
                value={form.variantLabel}
                onChange={(e) => setForm({ ...form, variantLabel: e.target.value })}
                className="input"
                placeholder="0803RL"
              />
            </Field>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground text-pretty">
            Agrupa variantes (agujas, cartuchos) bajo un mismo grupo. Cada tamaño
            mantiene su SKU y stock individual.
          </p>

          <Field label="SKU">
            <input
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className="input"
              placeholder="TNT-BLK-30"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={product ? 'Stock · fijo' : 'Stock inicial'}>
              <input
                required={!product}
                disabled={!!product}
                inputMode="numeric"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="input disabled:opacity-60"
                placeholder="0"
              />
            </Field>
            <Field label="Precio venta ($)">
              <input
                required
                inputMode="decimal"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="input"
                placeholder="0.00"
              />
            </Field>
          </div>

          {product && (
            <p className="-mt-2 text-xs text-muted-foreground text-pretty">
              El stock solo se modifica desde “Ajuste de Stock” en el inventario,
              con motivo y responsable.
            </p>
          )}

          {showExpiry && (
            <Field label="Fecha de vencimiento">
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="input"
              />
            </Field>
          )}

          {/* Import / supplier */}
          <div className="rounded-2xl border border-border bg-secondary/20 p-4">
            <h3 className="mb-3 text-sm font-semibold">Importación y proveedor</h3>
            <div className="flex flex-col gap-4">
              <Field label="Plataforma / Proveedor">
                <select
                  value={form.supplier}
                  onChange={(e) =>
                    setForm({ ...form, supplier: e.target.value as Supplier | '' })
                  }
                  className="input"
                >
                  <option value="">Sin definir</option>
                  {SUPPLIERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Enlace de compra (reorden)">
                <input
                  type="url"
                  value={form.purchaseUrl}
                  onChange={(e) => setForm({ ...form, purchaseUrl: e.target.value })}
                  className="input"
                  placeholder="https://..."
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Costo origen ($)">
                  <input
                    inputMode="decimal"
                    value={form.originCost}
                    onChange={(e) => setForm({ ...form, originCost: e.target.value })}
                    className="input"
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Flete prorrateado ($)">
                  <input
                    inputMode="decimal"
                    value={form.freightCost}
                    onChange={(e) => setForm({ ...form, freightCost: e.target.value })}
                    className="input"
                    placeholder="0.00"
                  />
                </Field>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Costo real de importación
                  </div>
                  <div className="text-lg font-semibold tabular-nums">
                    {usd(preview.cost)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Margen</div>
                  <div
                    className={`text-lg font-semibold tabular-nums ${
                      preview.margin == null
                        ? 'text-muted-foreground'
                        : preview.margin >= 40
                          ? 'text-chart-2'
                          : preview.margin >= 15
                            ? 'text-amber-400'
                            : 'text-destructive'
                    }`}
                  >
                    {preview.margin == null ? '—' : `${preview.margin.toFixed(0)}%`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Field label="Costo unitario ($) · manual, opcional">
            <input
              inputMode="decimal"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
              className="input"
              placeholder="0.00"
            />
          </Field>
          <p className="-mt-2 text-xs text-muted-foreground text-pretty">
            Se usa como respaldo para el margen si no cargas costo de importación.
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-1 flex h-13 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground active:opacity-80 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-5 w-5 animate-spin" />}
            {product ? 'Guardar cambios' : 'Agregar producto'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  )
}
