'use client'

import { useState, useMemo } from 'react'
import { Wallet, TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react'
import { useSales, useProducts, useExpenses } from '@/hooks/use-collections'
import { useRates } from '@/hooks/use-rates'
import { usd, bs } from '@/lib/format'

export function DashboardView() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today')

  const { rates } = useRates()
  const { sales = [] } = useSales()
  const { products = [] } = useProducts()
  const { expenses = [] } = useExpenses?.() || { expenses: [] }

  const rateBCV = rates?.bcv || 794.99

  // Filtrar según el período seleccionado
  const filteredSales = useMemo(() => {
    const now = new Date()
    return sales.filter((s: any) => {
      if (s.status === 'cancelled' || s.voided || s.anulada) return false
      const saleDate = new Date(s.timestamp || s.createdAt || s.date || Date.now())

      if (period === 'today') {
        return saleDate.toDateString() === now.toDateString()
      }
      if (period === 'week') {
        const weekAgo = new Date(now)
        weekAgo.setDate(now.getDate() - 7)
        return saleDate >= weekAgo
      }
      if (period === 'month') {
        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear()
      }
      return true
    })
  }, [sales, period])

  // Desglose financiero real
  const financialMetrics = useMemo(() => {
    let totalSalesUSD = 0
    let cashUSD = 0
    let bsTotal = 0
    let digitalUSD = 0

    filteredSales.forEach((s: any) => {
      const amountUSD = Number(s.totalUSD || s.total || 0)
      totalSalesUSD += amountUSD

      const method = s.paymentMethod || s.method || ''
      if (method === 'cash_usd' || (!method && s.currency === 'USD')) {
        cashUSD += amountUSD
      } else if (method === 'pago_movil' || method === 'cash_bs' || s.currency === 'BS') {
        bsTotal += Number(s.totalBS || amountUSD * rateBCV)
      } else if (method === 'binance' || method === 'zelle') {
        digitalUSD += amountUSD
      } else {
        cashUSD += amountUSD
      }
    })

    let totalExpensesUSD = 0
    expenses.forEach((e: any) => {
      const expAmount = Number(e.amountUSD || e.amount || 0)
      totalExpensesUSD += expAmount

      const method = e.paymentMethod || e.method || ''
      if (method === 'cash_usd') cashUSD -= expAmount
      else if (method === 'pago_movil' || method === 'cash_bs') bsTotal -= Number(e.amountBS || expAmount * rateBCV)
      else if (method === 'binance' || method === 'zelle') digitalUSD -= expAmount
      else cashUSD -= expAmount
    })

    const totalInventoryValue = products.reduce((acc: number, p: any) => {
      const cost = Number(p.costPrice || p.cost || p.price || 0)
      const stock = Number(p.stock || 0)
      return acc + (cost * stock)
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
  }, [filteredSales, expenses, products, rateBCV])

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Título de la sección */}
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-bold text-foreground">Panel financiero</h2>
        <p className="text-xs text-muted-foreground font-mono">Tasa BCV: Bs {rateBCV.toFixed(2)} / $</p>
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

      {/* TARJETA DESTACADA: DINERO DISPONIBLE EN CAJA REAL */}
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
          <span className="text-2xl font-black font-mono tracking-tight text-foreground">
            ${financialMetrics.totalDisponibleUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs font-medium font-mono text-muted-foreground">
            ≈ Bs {financialMetrics.totalDisponibleBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Desglose real por métodos */}
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/40 pt-3 text-[11px]">
          <div>
            <p className="text-[10px] text-muted-foreground">Efectivo $</p>
            <p className="font-mono font-bold text-foreground">${financialMetrics.cashUSD.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Bs (Caja + Banco)</p>
            <p className="font-mono font-bold text-foreground">Bs {financialMetrics.bsTotal.toLocaleString('es-VE')}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">USDT / Digital</p>
            <p className="font-mono font-bold text-foreground">${financialMetrics.digitalUSD.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* MÉTRICAS DE VENTAS Y GASTOS */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Ventas Totales */}
        <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium">Ventas Totales</span>
          </div>
          <div className="mt-2">
            <p className="text-lg font-bold font-mono text-foreground">${financialMetrics.totalSalesUSD.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground font-mono">
              Bs {(financialMetrics.totalSalesUSD * rateBCV).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">{financialMetrics.salesCount} ventas</p>
          </div>
        </div>

        {/* Gastos Operativos */}
        <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-3">
          <div className="flex items-center gap-1.5 text-rose-400">
            <TrendingDown className="h-4 w-4" />
            <span className="text-xs font-medium text-muted-foreground">Gastos Operativos</span>
          </div>
          <div className="mt-2">
            <p className="text-lg font-bold font-mono text-rose-400">${financialMetrics.totalExpensesUSD.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground font-mono">
              Bs {(financialMetrics.totalExpensesUSD * rateBCV).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
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
            <p className={`text-lg font-bold font-mono ${financialMetrics.gananciaNeta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${financialMetrics.gananciaNeta.toFixed(2)}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              Bs {(financialMetrics.gananciaNeta * rateBCV).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
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
            <p className="text-lg font-bold font-mono text-foreground">${financialMetrics.totalInventoryValue.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground font-mono">
              Bs {(financialMetrics.totalInventoryValue * rateBCV).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">A costo landed</p>
          </div>
        </div>
      </div>
    </div>
  )
}
