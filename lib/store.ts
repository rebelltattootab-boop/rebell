import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import type {
  Abono,
  ActiveUser,
  CashCount,
  Customer,
  ExpenseCategory,
  ExpenseMethod,
  PaymentKey,
  Product,
  RateSource,
  Sale,
  SaleItem,
  SalePayments,
  SaleType,
  StockReason,
} from './types'

function requireDb() {
  if (!db) throw new Error('Firebase no está configurado')
  return db
}

export async function createProduct(data: Omit<Product, 'id'>) {
  await addDoc(collection(requireDb(), 'products'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export async function updateProduct(id: string, data: Partial<Omit<Product, 'id'>>) {
  await updateDoc(doc(requireDb(), 'products', id), data)
}

export async function deleteProduct(id: string) {
  await deleteDoc(doc(requireDb(), 'products', id))
}

// Manual stock adjustment. Sets stock to an absolute value and writes an
// immutable audit entry in the same transaction. Direct stock edits elsewhere
// are disallowed — every change must pass through here with a reason + user.
export async function adjustStockTo(params: {
  product: Pick<Product, 'id' | 'name'>
  newStock: number
  reason: StockReason
  user: ActiveUser
}) {
  const database = requireDb()
  const { product, newStock, reason, user } = params
  const clamped = Math.max(0, Math.floor(newStock))
  const ref = doc(database, 'products', product.id)
  await runTransaction(database, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Producto no encontrado')
    const previousQty = Number(snap.data().stock ?? 0)
    tx.update(ref, { stock: clamped })
    const auditRef = doc(collection(database, 'audit'))
    tx.set(auditRef, {
      type: 'stock_adjustment',
      productId: product.id,
      productName: product.name,
      previousQty,
      newQty: clamped,
      reason,
      user,
      createdAt: Date.now(),
    })
  })
}

// Anula una venta: devuelve el stock de cada artículo y deja registro inmutable.
export async function voidSale(params: {
  sale: Sale
  reason: string
  user: ActiveUser
}) {
  const database = requireDb()
  const { sale, reason, user } = params
  const saleRef = doc(database, 'sales', sale.id)
  await runTransaction(database, async (tx) => {
    const saleSnap = await tx.get(saleRef)
    if (!saleSnap.exists()) throw new Error('Venta no encontrada')
    if (saleSnap.data().status === 'void') {
      throw new Error('La venta ya fue anulada')
    }

    const refs = sale.items.map((i) => doc(database, 'products', i.productId))
    const snaps = await Promise.all(refs.map((r) => tx.get(r)))

    snaps.forEach((snap, idx) => {
      if (snap.exists()) {
        const current = Number(snap.data().stock ?? 0)
        tx.update(refs[idx], { stock: current + sale.items[idx].quantity })
      }
    })

    tx.update(saleRef, {
      status: 'void',
      voidedAt: Date.now(),
      voidedBy: user,
      voidReason: reason,
    })

    const auditRef = doc(collection(database, 'audit'))
    tx.set(auditRef, {
      type: 'sale_void',
      saleId: sale.id,
      items: sale.items,
      voidReason: reason,
      totalUsd: sale.totalUsd,
      user,
      createdAt: Date.now(),
    })
  })
}

// ── Owner PIN (stored at settings/owner, default 1234) ──────────────────────
const PIN_DEFAULT = '1234'

export async function getOwnerPin(): Promise<string> {
  const snap = await getDoc(doc(requireDb(), 'settings', 'owner'))
  return snap.exists() ? String(snap.data().pin ?? PIN_DEFAULT) : PIN_DEFAULT
}

export async function verifyPin(pin: string): Promise<boolean> {
  return pin === (await getOwnerPin())
}

export async function updateOwnerPin(
  oldPin: string,
  newPin: string,
  user: ActiveUser,
) {
  if (!/^\d{4}$/.test(newPin)) {
    throw new Error('El nuevo PIN debe tener 4 dígitos')
  }
  const database = requireDb()
  const current = await getOwnerPin()
  if (oldPin !== current) throw new Error('El PIN actual es incorrecto')
  await setDoc(doc(database, 'settings', 'owner'), { pin: newPin }, { merge: true })
  await addDoc(collection(database, 'audit'), {
    type: 'pin_change',
    user,
    createdAt: Date.now(),
  })
}

// Records a sale and atomically decrements stock for every line item.
export async function registerSale(params: {
  items: SaleItem[]
  type: SaleType
  rate: number
  user: ActiveUser
  rateSource?: RateSource
  payments?: SalePayments
  customer?: { id: string; name: string } | null
  credit?: boolean
  amountPaid?: number // USD already collected (down payment) for credit sales
}) {
  const database = requireDb()
  const { items, type, rate, user, rateSource, payments, customer, credit } =
    params
  const totalUsd = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const totalBs = totalUsd * rate
  // For credit sales, amountPaid is the down payment; cash sales are paid in full.
  const amountPaid = credit
    ? Math.min(totalUsd, Math.max(0, Number(params.amountPaid) || 0))
    : totalUsd

  await runTransaction(database, async (tx) => {
    // First read all products, then write (Firestore requires reads before writes).
    const refs = items.map((i) => doc(database, 'products', i.productId))
    const snaps = await Promise.all(refs.map((r) => tx.get(r)))

    snaps.forEach((snap, idx) => {
      const item = items[idx]
      if (!snap.exists()) throw new Error(`Producto ${item.name} no existe`)
      const current = Number(snap.data().stock ?? 0)
      if (current < item.quantity) {
        throw new Error(`Stock insuficiente para ${item.name}`)
      }
    })

    snaps.forEach((snap, idx) => {
      if (!snap.exists()) return
      const item = items[idx]
      const current = Number(snap.data().stock ?? 0)
      tx.update(refs[idx], { stock: current - item.quantity })
    })

    const saleRef = doc(collection(database, 'sales'))
    // Firestore rejects undefined — only include optional fields when present.
    const saleDoc: Omit<Sale, 'id'> = {
      items,
      type,
      totalUsd,
      totalBs,
      rate,
      createdAt: Date.now(),
      createdBy: user,
      status: 'active',
      ...(rateSource ? { rateSource } : {}),
      ...(payments ? { payments } : {}),
      ...(customer ? { customerId: customer.id, customerName: customer.name } : {}),
      ...(credit ? { credit: true, amountPaid, abonos: [] } : {}),
    }
    tx.set(saleRef, saleDoc)
  })

  return { totalUsd, totalBs, balanceUsd: totalUsd - amountPaid }
}

// Records a partial payment (abono) against a credit sale, advancing amountPaid.
export async function addAbono(params: {
  sale: Pick<Sale, 'id' | 'totalUsd'>
  amount: number // USD
  method: PaymentKey
  user: ActiveUser
}) {
  const database = requireDb()
  const { sale, amount, method, user } = params
  const clean = Math.max(0, Number(amount) || 0)
  if (clean <= 0) throw new Error('El abono debe ser mayor a cero')
  const ref = doc(database, 'sales', sale.id)
  await runTransaction(database, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Venta no encontrada')
    const data = snap.data()
    if (!data.credit) throw new Error('La venta no es a crédito')
    const total = Number(data.totalUsd ?? 0)
    const already = Number(data.amountPaid ?? 0)
    const applied = Math.min(clean, total - already)
    if (applied <= 0) throw new Error('La cuenta ya está saldada')
    const abono: Abono = { amount: applied, method, at: Date.now(), user }
    tx.update(ref, {
      amountPaid: increment(applied),
      abonos: arrayUnion(abono),
    })
  })
}

// ── Operational expenses ──────────────────────────────────────────────────────
export async function registerExpense(params: {
  amountUsd: number
  rate: number
  category: ExpenseCategory
  method: ExpenseMethod
  note?: string
  user: ActiveUser
}) {
  const { amountUsd, rate, category, method, note, user } = params
  const amount = Math.max(0, Number(amountUsd) || 0)
  if (amount <= 0) throw new Error('El monto debe ser mayor a cero')
  await addDoc(collection(requireDb(), 'expenses'), {
    amountUsd: amount,
    rate,
    amountBs: amount * rate,
    category,
    method,
    ...(note?.trim() ? { note: note.trim() } : {}),
    user,
    createdAt: Date.now(),
  })
}

// ── Daily cash closing (cuadre de caja) ───────────────────────────────────────
export async function recordCashClosing(params: {
  user: ActiveUser
  rate: number
  rangeStart: number
  rangeEnd: number
  expected: CashCount
  declared: CashCount
}) {
  await addDoc(collection(requireDb(), 'closings'), {
    ...params,
    createdAt: Date.now(),
  })
}

// ── Customers (CRM) ─────────────────────────────────────────────────────────
export async function createCustomer(
  data: Omit<Customer, 'id' | 'createdAt'>,
): Promise<{ id: string; name: string }> {
  const clean = {
    name: data.name.trim(),
    ...(data.studio?.trim() ? { studio: data.studio.trim() } : {}),
    ...(data.whatsapp?.trim() ? { whatsapp: data.whatsapp.replace(/\D/g, '') } : {}),
    ...(data.instagram?.trim()
      ? { instagram: data.instagram.trim().replace(/^@/, '') }
      : {}),
    createdAt: Date.now(),
  }
  const ref = await addDoc(collection(requireDb(), 'customers'), clean)
  return { id: ref.id, name: clean.name }
}

export async function updateCustomer(
  id: string,
  data: Partial<Omit<Customer, 'id' | 'createdAt'>>,
) {
  await updateDoc(doc(requireDb(), 'customers', id), data)
}

export async function getProduct(id: string) {
  const snap = await getDoc(doc(requireDb(), 'products', id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Product) : null
}
