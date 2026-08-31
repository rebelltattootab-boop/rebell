'use client'

import { useMemo, useState } from 'react'
import {
  ChevronDown,
  Layers,
  Minus,
  Package,
  Pencil,
  Plus,
  Search,
} from 'lucide-react'
import { useProducts } from '@/hooks/use-collections'
import { useSession } from '@/context/session-context'
import { bs, usd } from '@/lib/format'
import {
  CATEGORIES,
  isLowStock,
  type Category,
  type Product,
} from '@/lib/types'
import { ProductForm } from './product-form'
import { StockAdjustModal } from './stock-adjust-modal'
import { ProductBadges } from './stock-badges'
import { RestockView } from './restock-view'
import { SegmentedPills } from './segmented-pills'

const FILTERS = ['Todos', ...CATEGORIES] as const

type InvSub = 'catalog' | 'restock'

type Group = {
  key: string
  name: string
  category: Category
  variants: Product[]
  totalStock: number
  hasWarning: boolean
}

export function InventoryView({ rate }: { rate: number | null }) {
  const { products, loading } = useProducts()
  const { requestPin } = useSession()
  const [sub, setSub] = useState<InvSub>('catalog')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Todos')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  // Stock adjustment modal state — the only path to changing stock.
  const [adjust, setAdjust] = useState<{ product: Product; proposed: number } | null>(
    null,
  )

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesFilter = filter === 'Todos' || p.category === filter
      const q = search.toLowerCase()
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.groupName?.toLowerCase().includes(q) ?? false) ||
        (p.variantLabel?.toLowerCase().includes(q) ?? false)
      return matchesFilter && matchesSearch
    })
  }, [products, filter, search])

  // Split into variant groups (2+ sharing groupName) and standalone products.
  const { groups, singles } = useMemo(() => {
    const byGroup = new Map<string, Product[]>()
    const loose: Product[] = []
    for (const p of filtered) {
      if (p.groupName?.trim()) {
        const key = p.groupName.trim()
        byGroup.set(key, [...(byGroup.get(key) ?? []), p])
      } else {
        loose.push(p)
      }
    }
    const groups: Group[] = []
    for (const [key, variants] of byGroup) {
      if (variants.length === 1) {
        // A lone "grouped" product behaves like a standalone card.
        loose.push(variants[0])
        continue
      }
      const sorted = [...variants].sort((a, b) =>
        (a.variantLabel ?? a.name).localeCompare(b.variantLabel ?? b.name),
      )
      groups.push({
        key,
        name: key,
        category: sorted[0].category,
        variants: sorted,
        totalStock: sorted.reduce((n, v) => n + v.stock, 0),
        hasWarning: sorted.some(
          (v) => isLowStock(v.stock) || v.expiresAt != null,
        ),
      })
    }
    groups.sort((a, b) => a.name.localeCompare(b.name))
    return { groups, singles: loose }
  }, [filtered])

  function openNew() {
    setEditing(null)
    setFormOpen(true)
  }

  // Editing a product can change its price — a sensitive action, gate with PIN.
  async function openEdit(p: Product) {
    const ok = await requestPin()
    if (!ok) return
    setEditing(p)
    setFormOpen(true)
  }

  function openAdjust(product: Product, proposed: number) {
    setAdjust({ product, proposed })
  }

  const isEmpty = !loading && groups.length === 0 && singles.length === 0

  return (
    <div className="flex flex-col gap-4 pb-28">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Inventario</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} productos registrados
          </p>
        </div>
      </header>

      <SegmentedPills
        ariaLabel="Sección de inventario"
        value={sub}
        onChange={setSub}
        options={[
          { id: 'catalog', label: 'Catálogo' },
          { id: 'restock', label: 'Por Reponer' },
        ]}
      />

      {sub === 'restock' ? (
        <RestockView />
      ) : (
        <>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, grupo o SKU"
          className="input pl-11"
        />
      </div>

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Cargando inventario…
        </p>
      ) : isEmpty ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-pretty">
            {products.length === 0
              ? 'Aún no hay productos. Agrega el primero.'
              : 'Ningún producto coincide con la búsqueda.'}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {groups.map((g) => (
            <VariantGroupCard
              key={g.key}
              group={g}
              rate={rate}
              onEdit={openEdit}
              onAdjust={openAdjust}
            />
          ))}
          {singles.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              rate={rate}
              onEdit={() => openEdit(p)}
              onAdjust={openAdjust}
            />
          ))}
        </ul>
      )}

      <button
        onClick={openNew}
        aria-label="Agregar producto"
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:opacity-80"
      >
        <Plus className="h-7 w-7" />
      </button>
        </>
      )}

      <ProductForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editing}
      />

      <StockAdjustModal
        product={adjust?.product ?? null}
        proposed={adjust?.proposed ?? 0}
        onClose={() => setAdjust(null)}
      />
    </div>
  )
}

const CATEGORY_LABEL: Record<Category, string> = {
  Tintas: 'bg-chart-1/20 text-chart-1',
  Agujas: 'bg-chart-2/20 text-chart-2',
  Máquinas: 'bg-chart-3/20 text-chart-3',
  'First-Aid': 'bg-accent text-accent-foreground',
}

// Small +/- adjustment control shared by cards and variant rows.
function StockStepper({
  product,
  onAdjust,
}: {
  product: Product
  onAdjust: (product: Product, proposed: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onAdjust(product, product.stock - 1)}
        aria-label={`Restar stock de ${product.name}`}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground active:opacity-70"
      >
        <Minus className="h-5 w-5" />
      </button>
      <button
        onClick={() => onAdjust(product, product.stock + 1)}
        aria-label={`Sumar stock de ${product.name}`}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground active:opacity-70"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  )
}

// Collapsible accordion for a family of variants (e.g. needle sizes).
function VariantGroupCard({
  group,
  rate,
  onEdit,
  onAdjust,
}: {
  group: Group
  rate: number | null
  onEdit: (product: Product) => void
  onAdjust: (product: Product, proposed: number) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left active:bg-secondary/30"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
          <Layers className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-medium ${CATEGORY_LABEL[group.category]}`}
            >
              {group.category}
            </span>
            {group.hasWarning && (
              <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden />
            )}
          </div>
          <h3 className="mt-1 truncate text-base font-medium">{group.name}</h3>
          <p className="text-xs text-muted-foreground">
            {group.variants.length} configuraciones · {group.totalStock} u. en total
          </p>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <ul className="divide-y divide-border border-t border-border">
          {group.variants.map((v) => (
            <li key={v.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">
                    {v.variantLabel || v.sku || v.name}
                  </span>
                  <ProductBadges product={v} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  {v.sku && <span className="font-mono">{v.sku}</span>}
                  <span className="rounded-md bg-secondary px-1.5 py-0.5 font-medium text-foreground">
                    {usd(v.price)}
                  </span>
                  {rate && (
                    <span className="rounded-md bg-secondary px-1.5 py-0.5">
                      {bs(v.price * rate)}
                    </span>
                  )}
                  <button
                    onClick={() => onEdit(v)}
                    className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                    aria-label={`Editar precio y datos de ${v.name}`}
                  >
                    <Pencil className="h-3 w-3" /> editar precio
                  </button>
                </div>
              </div>
              <button
                onClick={() => onAdjust(v, v.stock)}
                className="flex flex-col items-center rounded-lg px-2 active:opacity-70"
                aria-label={`Ajustar stock de ${v.name}`}
              >
                <span
                  className={`text-lg font-semibold tabular-nums ${isLowStock(v.stock) ? 'text-amber-400' : ''}`}
                >
                  {v.stock}
                </span>
                <span className="text-[10px] text-muted-foreground">stock</span>
              </button>
              <StockStepper product={v} onAdjust={onAdjust} />
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function ProductCard({
  product,
  rate,
  onEdit,
  onAdjust,
}: {
  product: Product
  rate: number | null
  onEdit: () => void
  onAdjust: (product: Product, proposed: number) => void
}) {
  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-medium ${CATEGORY_LABEL[product.category]}`}
            >
              {product.category}
            </span>
            {product.sku && (
              <span className="font-mono text-xs text-muted-foreground">
                {product.sku}
              </span>
            )}
            <ProductBadges product={product} />
          </div>
          <h3 className="mt-1.5 truncate text-base font-medium">{product.name}</h3>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-semibold">{usd(product.price)}</span>
            {rate && (
              <span className="text-sm text-muted-foreground">
                {bs(product.price * rate)}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onEdit}
          aria-label={`Editar ${product.name}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground active:opacity-70"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => onAdjust(product, product.stock)}
          className="flex flex-col items-start rounded-lg text-left active:opacity-70"
          aria-label={`Ajustar stock de ${product.name}`}
        >
          <span className="text-xs text-muted-foreground">Stock · tocar para ajustar</span>
          <span
            className={`text-lg font-semibold tabular-nums ${isLowStock(product.stock) ? 'text-amber-400' : ''}`}
          >
            {product.stock}
          </span>
        </button>
        <StockStepper product={product} onAdjust={onAdjust} />
      </div>
    </li>
  )
}
