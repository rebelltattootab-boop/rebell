'use client'

import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type {
  AuditEntry,
  CashClosing,
  Customer,
  Expense,
  Product,
  Sale,
} from '@/lib/types'

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }
    const q = query(collection(db, 'products'), orderBy('name'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setProducts(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product),
        )
        setLoading(false)
      },
      (err) => {
        console.log('[v0] products subscription error:', err.message)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [])

  return { products, loading }
}

export function useSales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }
    const q = query(collection(db, 'sales'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSales(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Sale))
        setLoading(false)
      },
      (err) => {
        console.log('[v0] sales subscription error:', err.message)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [])

  return { sales, loading }
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }
    const q = query(collection(db, 'customers'), orderBy('name'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCustomers(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer),
        )
        setLoading(false)
      },
      (err) => {
        console.log('[v0] customers subscription error:', err.message)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [])

  return { customers, loading }
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }
    const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setExpenses(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense),
        )
        setLoading(false)
      },
      (err) => {
        console.log('[v0] expenses subscription error:', err.message)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [])

  return { expenses, loading }
}

export function useCashClosings() {
  const [closings, setClosings] = useState<CashClosing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }
    const q = query(collection(db, 'closings'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setClosings(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CashClosing),
        )
        setLoading(false)
      },
      (err) => {
        console.log('[v0] closings subscription error:', err.message)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [])

  return { closings, loading }
}

export function useAudit() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }
    const q = query(collection(db, 'audit'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setEntries(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AuditEntry),
        )
        setLoading(false)
      },
      (err) => {
        console.log('[v0] audit subscription error:', err.message)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [])

  return { entries, loading }
}
