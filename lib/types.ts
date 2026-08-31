export const CATEGORIES = ['Tintas', 'Agujas', 'Máquinas', 'First-Aid'] as const
export type Category = (typeof CATEGORIES)[number]

// Import platforms / suppliers for reordering stock.
export const SUPPLIERS = [
  'Alibaba',
  'Amazon',
  'Dynamic Direct',
  'Web Oficial',
  'Local',
] as const
export type Supplier = (typeof SUPPLIERS)[number]

export type Product = {
  id: string
  name: string
  category: Category
  sku: string
  stock: number
  price: number // unit price in USD
  cost?: number // optional unit cost in USD (for profit calc)
  // Variant grouping — products sharing a groupName render as one accordion
  // card (e.g. "Agujas T-Rex" with sizes 0803RL, 1205RS...). variantLabel is
  // the specific configuration shown inside the accordion.
  groupName?: string
  variantLabel?: string
  // Expiration tracking (First-Aid + Inks). Stored as epoch ms (start of day).
  expiresAt?: number
  // Import / supplier tracking.
  supplier?: Supplier
  purchaseUrl?: string // direct reorder link
  // Landed cost inputs (USD): origin unit cost + prorated freight per unit.
  originCost?: number
  freightCost?: number
}

// Combined per-unit import cost (origin + prorated freight).
export function landedCost(p: Pick<Product, 'originCost' | 'freightCost' | 'cost'>): number {
  const origin = Number(p.originCost) || 0
  const freight = Number(p.freightCost) || 0
  const landed = origin + freight
  // Fall back to the manual unit cost when no landed inputs are set.
  return landed > 0 ? landed : Number(p.cost) || 0
}

// Target profit margin (%) from sale price vs landed cost. Null if incalculable.
export function profitMargin(price: number, cost: number): number | null {
  if (!price || price <= 0 || cost <= 0) return null
  return ((price - cost) / price) * 100
}

export type ExpiryStatus = 'expired' | 'critical' | 'warning' | 'ok' | 'none'

// Classify how close a product is to expiring.
export function expiryStatus(expiresAt?: number, now = Date.now()): ExpiryStatus {
  if (!expiresAt || !Number.isFinite(expiresAt)) return 'none'
  const days = Math.floor((expiresAt - now) / 86_400_000)
  if (days < 0) return 'expired'
  if (days <= 30) return 'critical'
  if (days <= 60) return 'warning'
  return 'ok'
}

export const LOW_STOCK_THRESHOLD = 5

export function isLowStock(stock: number): boolean {
  return stock <= LOW_STOCK_THRESHOLD
}

export type SaleType = 'Detal' | 'Mayor'

// Which live rate was used to price a sale in bolivares.
export type RateSource = 'BCV' | 'Binance'

export type SaleItem = {
  productId: string
  name: string
  quantity: number
  unitPrice: number // USD at time of sale
}

// Split payment captured at checkout. Bs methods are stored in bolivares,
// USD methods in dollars — the checkout reconciles both against the total.
export type SalePayments = {
  pagoMovil?: number // Bs
  transferencia?: number // Bs
  efectivoUsd?: number // USD
  zelle?: number // USD
  binance?: number // USD
}

export type PaymentKey = keyof SalePayments

// Payment methods denominated in bolivares (vs USD). Used for reconciliation.
export const BS_PAYMENT_KEYS: PaymentKey[] = ['pagoMovil', 'transferencia']

// A partial payment (abono) applied to a credit sale after checkout.
export type Abono = {
  amount: number // USD
  method: PaymentKey
  at: number
  user: ActiveUser
}

export type Sale = {
  id: string
  items: SaleItem[]
  type: SaleType
  totalUsd: number
  totalBs: number
  rate: number // rate used for Bs conversion
  rateSource?: RateSource
  payments?: SalePayments
  customerId?: string
  customerName?: string
  createdAt: number // epoch ms
  createdBy?: ActiveUser // who registered the sale
  status?: 'active' | 'void' // missing = active (legacy)
  voidedAt?: number
  voidedBy?: ActiveUser
  voidReason?: string
  // Accounts receivable (fiado). A credit sale carries a running amountPaid;
  // the outstanding balance is totalUsd - amountPaid.
  credit?: boolean
  amountPaid?: number // USD collected so far (down payment + abonos)
  abonos?: Abono[]
}

// A registered buyer (studio or artist) in the CRM.
export type Customer = {
  id: string
  name: string
  studio?: string
  whatsapp?: string // digits only, intl format preferred
  instagram?: string // handle without @
  createdAt: number
}

// Active profiles that operate the register. Every action is stamped with one.
export const ACTIVE_USERS = ['José', 'Yefferson'] as const
export type ActiveUser = (typeof ACTIVE_USERS)[number]

// Allowed reasons for a manual stock adjustment.
export const STOCK_REASONS = [
  'Conteo físico',
  'Merma/Dañado',
  'Muestra',
  'Error',
] as const
export type StockReason = (typeof STOCK_REASONS)[number]

// ── Operational expenses ─────────────────────────────────────────────────────
export const EXPENSE_CATEGORIES = [
  'Fletes / Importaciones',
  'Delivery / Envíos',
  'Servicios / Local',
  'Comisiones Bancarias',
  'Otros',
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const EXPENSE_METHODS = [
  'Efectivo USD',
  'Pago Móvil Bs',
  'Zelle',
  'Punto de Venta',
] as const
export type ExpenseMethod = (typeof EXPENSE_METHODS)[number]

export type Expense = {
  id: string
  amountUsd: number
  rate: number // BCV rate at time of entry
  amountBs: number
  category: ExpenseCategory
  method: ExpenseMethod
  note?: string
  user: ActiveUser
  createdAt: number
}

// ── Daily cash closing (cuadre de caja) ──────────────────────────────────────
export type CashCount = {
  efectivoUsd: number // USD
  bs: number // Bs (Pago Móvil + Transferencia)
  zelle: number // USD
}

export type CashClosing = {
  id: string
  createdAt: number
  user: ActiveUser
  rate: number
  rangeStart: number
  rangeEnd: number
  expected: CashCount
  declared: CashCount
}

export type AuditType = 'stock_adjustment' | 'sale_void' | 'pin_change'

// Immutable audit trail entry. Written once, never edited.
export type AuditEntry = {
  id: string
  type: AuditType
  user: ActiveUser
  createdAt: number
  // stock_adjustment
  productId?: string
  productName?: string
  previousQty?: number
  newQty?: number
  reason?: StockReason
  // sale_void
  saleId?: string
  items?: SaleItem[]
  voidReason?: string
  totalUsd?: number
}
