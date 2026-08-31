'use client'

import { useState, useMemo } from 'react'
import { Wallet, TrendingUp, TrendingDown, DollarSign, Package, PlusCircle, History } from 'lucide-react'
import { useSales, useProducts, useExpenses } from '@/hooks/use-collections'
import { landedCost } from '@/lib/types'
import { ExpenseFormModal } from './expense-form-modal'
import { CashClosingModal } from './cash-closing-modal'

export function DashboardView({ rate = 794.99 }: { rate?: number }) {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today')
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showClosingModal, setShowClosingModal] = useState(false)

  const { sales = [] } = useSales()
  const { products = [] } = useProducts()
  const { expenses = [] } = useExpenses()

  const rateBCV = typeof rate === 'number' && rate > 0 ? rate : 794.99

  // Helper para detectar anuladas
  const isSaleVoided = (s: any): boolean => {
    return Boolean(
      s.voided === true ||
      s.isVoided === true ||
      s.anulado === true ||
      s.anulada === true ||
      s.voidedAt ||
      s.anuladoAt ||
      s.voidReason ||
      s.status === 'voided' ||
      s.status === 'cancelled' ||
      s.status === 'anulada' ||
      s.status === 'anulado'
    )
  }

  // Helper de timestamp
  const getTimestamp = (item: any): number => {
    const raw = item?.timestamp ?? item?.createdAt ?? item?.date ?? item?.fecha
    if (!raw) return Date.now()
    if (typeof raw === 'number') return raw
    if (raw?.toMillis) return raw.toMillis()
    if (raw?.toDate) return raw.toDate().getTime()
    const parsed = new Date(raw).getTime()
    return isNaN(parsed) ? Date.now() : parsed
  }

  // Filtrar ventas por período
  const filteredSales = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

    return (sales || []).filter((s: any) => {
      if (isSaleVoided(s)) return false
      if (period === 'all') return true

      const ts = getTimestamp(s)
      if (period === 'today') return ts >= startOfToday
      if (period === 'week') return ts >= startOfWeek
      if (period === 'month') return ts >= startOfMonth
      return true
    })
  }, [sales, period])

  // Filtrar gastos por período
  const filteredExpenses = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

    return (expenses || []).filter((e: any) => {
      if (isSaleVoided(e)) return false
      if (period === 'all') return true

      const ts = getTimestamp(e)
      if (period === 'today') return ts >= startOfToday
      if (period === 'week') return ts >= startOfWeek
      if (period === 'month') return ts >= startOfMonth
      return true
    })
  }, [expenses, period])

  // Métricas financieras calculadas
  const metrics = useMemo(() => {
    let totalSalesUSD = 0
    let cashUSD = 0
    let bsTotal = 0
    let digitalUSD = 0

    filteredSales.forEach((s: any) => {
      let saleTotalUSD = Number(s.totalUSD ?? s.total ?? s.subtotal ?? 0)
      
      if (!saleTotalUSD && Array.isArray(s.items)) {
        saleTotalUSD = s.items.reduce((acc: number, it: any) => {
          return acc + (Number(it.unitPrice || it.price || 0) * Number(it.quantity || 1))
        }, 0)
      }
      totalSalesUSD += saleTotalUSD

      const p = s.payments || s.payment || {}
      const efUSD = Number(p.efectivoUsd ?? s.efectivoUsd ?? 0)
      const pMovil = Number(p.pagoMovil ?? s.pagoMovil ?? 0)
      const transf = Number(p.transferencia ?? s.transferencia ?? 0)
      const zelleUSD = Number(p.zelle ?? s.zelle ?? 0)
      const binanceUSD = Number(p.binance ?? s.binance ?? 0)

      const hasExplicitPayments = (efUSD + pMovil + transf + zelleUSD + binanceUSD) > 0

      if (hasExplicitPayments) {
        cashUSD += efUSD
        bsTotal += (pMovil + transf)
        digitalUSD += (zelleUSD + binanceUSD)
      } else {
        const method = String(s.paymentMethod || s.method || '').toLowerCase()
        if (method.includes('bs') || method.includes('pago') || method.includes('movil') || method.includes('transf')) {
          bsTotal += Number(s.totalBS ?? s.montoBS ?? (saleTotalUSD * rateBCV))
        } else if (method.includes('binance') || method.includes('zelle') || method.includes('usdt')) {
          digitalUSD += saleTotalUSD
        } else {
          cashUSD += saleTotalUSD
        }
      }
    })

    let totalExpensesUSD = 0
    filteredExpenses.forEach((e: any) => {
      const expUSD = Number(e.amountUSD ?? e.amount ?? e.monto ?? e.totalUSD ?? 0)
      totalExpensesUSD += expUSD

      const method = String(e.paymentMethod || e.method || '').toLowerCase()
      if (method.includes('bs') || method.includes('pago') || method.includes('movil')) {
        const expBS = Number(e.amountBS ?? e.montoBS ?? (expUSD * rateBCV))
        bsTotal -= expBS
      } else if (method.includes('binance') || method.includes('zelle') || method.includes('usdt')) {
        digitalUSD -= expUSD
      } else {
        cashUSD -= expUSD
      }
    })

    const totalInventoryValue = (products || []).reduce((acc: number, p: any) => {
      const unitCost = landedCost ? landedCost(p) : Number(p.costPrice ?? p.cost ?? p.price ?? 0)
      const stock = Number(p.stock ?? 0)
      return acc + (unitCost * stock)
    }, 0)

    const totalDisponibleUSD = cashUSD + (bsTotal / rateBCV) + digitalUSD
    const totalDisponibleBs = totalDisponibleUSD * rateBCV
    const gananciaNeta = totalSalesUSD - totalExpensesUSD

    return {
      totalSalesUSD,
      totalExpensesUSD,
      gananciaNeta,
      cashUSD: Math.max(0, cashUSD),
      bsTotal: Math.max(0, bsTotal),
      digitalUSD: Math.max(0, digitalUSD),
      totalDisponibleUSD: Math.max(0, totalDisponibleUSD),
      totalDisponibleBs: Math.max(0, totalDisponibleBs),
      totalInventoryValue,
      salesCount: filteredSales.length
    }
  }, [filteredSales, filteredExpenses, products, rateBCV])

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Encabezado */}
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-bold text-foreground">Panel financiero</h2>
        <p className="text-xs text-muted-foreground">Tasa BCV: Bs {rateBCV.toFixed(2)} / $</p>
      </div>

      {/* Selector de período */}
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-secondary/50 p-1">
        {[
          { id: 'today', label: 'Hoy' },
          { id: 'week', label: 'Esta Semana' },
          { id: 'month', label: 'Este Mes' },
          { id: 'all', label: 'Histórico' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setPeriod(item.id as any)}
            className={`rounded-lg py-1.5 text-center text-xs font-medium transition-colors ${
              period === item.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* TARJETA DESTACADA: DINERO DISPONIBLE */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-card to-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Wallet className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Saldo Actual Disponible
            </span>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            Caja Activa
          </span>
        </div>

        <div className="mt-3 flex flex-col">
          <span className="text-2xl font-bold tracking-tight text-foreground">
            ${metrics.totalDisponibleUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            ≈ Bs {metrics.totalDisponibleBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Desglose real por métodos */}
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/40 pt-3 text-[11px]">
          <div>
            <p className="text-[10px] text-muted-foreground">Efectivo $</p>
            <p className="font-semibold text-foreground">${metrics.cashUSD.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Bs (Caja + Banco)</p>
            <p className="font-semibold text-foreground">Bs {metrics.bsTotal.toLocaleString('es-VE')}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">USDT / Digital</p>
            <p className="font-semibold text-foreground">${metrics.digitalUSD.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* 4 TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Ventas Totales */}
        <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium">Ventas Totales</span>
          </div>
          <div className="mt-2">
            <p className="text-lg font-bold text-foreground">${metrics.totalSalesUSD.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground">
              Bs {(metrics.totalSalesUSD * rateBCV).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">{metrics.salesCount} ventas</p>
          </div>
        </div>

        {/* Gastos Operativos */}
        <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-3">
          <div className="flex items-center gap-1.5 text-rose-400">
            <TrendingDown className="h-4 w-4" />
            <span className="text-xs font-medium text-muted-foreground">Gastos Operativos</span>
          </div>
          <div className="mt-2">
            <p className="text-lg font-bold text-rose-400">${metrics.totalExpensesUSD.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground">
              Bs {(metrics.totalExpensesUSD * rateBCV).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Ganancia Neta Real */}
        <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-3">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium text-muted-foreground">Ganancia Neta Real</span>
          </div>
          <div className="mt-2">
            <p className={`text-lg font-bold ${metrics.gananciaNeta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${metrics.gananciaNeta.toFixed(2)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Bs {(metrics.gananciaNeta * rateBCV).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">Margen – gastos</p>
          </div>
        </div>

        {/* Valor del Inventario */}
        <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Package className="h-4 w-4" />
            <span className="text-xs font-medium">Valor del Inventario</span>
          </div>
          <div className="mt-2">
            <p className="text-lg font-bold text-foreground">${metrics.totalInventoryValue.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground">
              Bs {(metrics.totalInventoryValue * rateBCV).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">A costo landed</p>
          </div>
        </div>
      </div>

      {/* BOTONES DE ACCIÓN: REGISTRAR GASTO Y CIERRE DE CAJA */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          onClick={() => setShowExpenseModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2.5 px-3 text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-500/20 active:scale-[0.98]"
        >
          <PlusCircle className="h-4 w-4" />
          Registrar Gasto
        </button>

        <button
          onClick={() => setShowClosingModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-secondary/60 py-2.5 px-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary active:scale-[0.98]"
        >
          <History className="h-4 w-4" />
          Cierre de Caja
        </button>
      </div>

      {/* MODALES CONECTADOS */}
      {showExpenseModal && (
        <ExpenseFormModal
          open={showExpenseModal}
          onClose={() => setShowExpenseModal(false)}
          rate={rateBCV}
        />
      )}

      {showClosingModal && (
        <CashClosingModal
          open={showClosingModal}
          onClose={() => setShowClosingModal(false)}
          rate={rateBCV}
        />
      )}
    </div>
  )
}
