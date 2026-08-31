'use client'

import { useState, useMemo } from 'react'
import { Wallet, TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react'

export function DashboardView() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today')

  // Tasas de referencia
  const rateBCV = 794.99
  const rateBinance = 930.80

  // Recuperar transacciones reales guardadas en la app (LocalStorage)
  const financialData = useMemo(() => {
    if (typeof window === 'undefined') {
      return { totalSalesUSD: 0, totalExpensesUSD: 0, cashUSD: 0, bsTotal: 0, digitalUSD: 0, salesCount: 0 }
    }

    try {
      const salesRaw = localStorage.getItem('rebell_sales') || '[]'
      const expensesRaw = localStorage.getItem('rebell_expenses') || '[]'

      const sales = JSON.parse(salesRaw)
      const expenses = JSON.parse(expensesRaw)

      let totalSales = 0
      let cashUSD = 0
      let bsTotal = 0
      let digitalUSD = 0

      sales.forEach((s: any) => {
        const amount = Number(s.totalUSD || s.total || 0)
        totalSales += amount

        // Desglose por método de pago
        if (s.paymentMethod === 'cash_usd' || s.method === 'cash_usd' || s.currency === 'USD') {
          cashUSD += amount
        } else if (s.paymentMethod === 'pago_movil' || s.paymentMethod === 'cash_bs' || s.currency === 'BS') {
          bsTotal += Number(s.totalBS || amount * rateBCV)
        } else if (s.paymentMethod === 'binance' || s.paymentMethod === 'zelle') {
          digitalUSD += amount
        } else {
          cashUSD += amount
        }
      })

      let totalExpenses = 0
      expenses.forEach((e: any) => {
        const amount = Number(e.amountUSD || e.amount || 0)
        totalExpenses += amount

        if (e.paymentMethod === 'cash_usd' || e.currency === 'USD') {
          cashUSD -= amount
        } else if (e.paymentMethod === 'pago_movil' || e.paymentMethod === 'cash_bs' || e.currency === 'BS') {
          bsTotal -= Number(e.amountBS || amount * rateBCV)
        } else if (e.paymentMethod === 'binance' || e.paymentMethod === 'zelle') {
          digitalUSD -= amount
        } else {
          cashUSD -= amount
        }
      })

      return {
        totalSalesUSD: totalSales,
        totalExpensesUSD: totalExpenses,
        cashUSD: Math.max(0, cashUSD),
        bsTotal: Math.max(0, bsTotal),
        digitalUSD: Math.max(0, digitalUSD),
        salesCount: sales.length,
      }
    } catch {
      return { totalSalesUSD: 0, totalExpensesUSD: 0, cashUSD: 0, bsTotal: 0, digitalUSD: 0, salesCount: 0 }
    }
  }, [rateBCV])

  // Cálculo del disponible real sumando cajas
  const totalDisponibleUSD = financialData.cashUSD + (financialData.bsTotal / rateBCV) + financialData.digitalUSD
  const totalDisponibleBs = totalDisponibleUSD * rateBCV
  const gananciaNeta = financialData.totalSalesUSD - financialData.totalExpensesUSD

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
            ${totalDisponibleUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs font-medium font-mono text-muted-foreground">
            ≈ Bs {totalDisponibleBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Desglose real */}
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/40 pt-3 text-[11px]">
          <div>
            <p className="text-[10px] text-muted-foreground">Efectivo $</p>
            <p className="font-mono font-bold text-foreground">${financialData.cashUSD.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Bs (Caja + Banco)</p>
            <p className="font-mono font-bold text-foreground">Bs {financialData.bsTotal.toLocaleString('es-VE')}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">USDT / Digital</p>
            <p className="font-mono font-bold text-foreground">${financialData.digitalUSD.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* MÉTRICAS DE VENTAS Y GASTOS (4 Tarjetas) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Ventas Totales */}
        <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium">Ventas Totales</span>
          </div>
          <div className="mt-2">
            <p className="text-lg font-bold font-mono text-foreground">${financialData.totalSalesUSD.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground font-mono">
              Bs {(financialData.totalSalesUSD * rateBCV).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">{financialData.salesCount} ventas</p>
          </div>
        </div>

        {/* Gastos Operativos */}
        <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-3">
          <div className="flex items-center gap-1.5 text-rose-400">
            <TrendingDown className="h-4 w-4" />
            <span className="text-xs font-medium text-muted-foreground">Gastos Operativos</span>
          </div>
          <div className="mt-2">
            <p className="text-lg font-bold font-mono text-rose-400">${financialData.totalExpensesUSD.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground font-mono">
              Bs {(financialData.totalExpensesUSD * rateBCV).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
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
            <p className={`text-lg font-bold font-mono ${gananciaNeta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${gananciaNeta.toFixed(2)}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              Bs {(gananciaNeta * rateBCV).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
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
            <p className="text-lg font-bold font-mono text-foreground">$1,703.35</p>
            <p className="text-[11px] text-muted-foreground font-mono">Bs 1.354.149,11</p>
            <p className="mt-1 text-[10px] text-muted-foreground">A costo landed</p>
          </div>
        </div>
      </div>
    </div>
  )
}
