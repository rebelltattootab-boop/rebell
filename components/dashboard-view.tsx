'use client'

import { useState, useMemo } from 'react'
import { Wallet, TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react'
import { useSales, useProducts } from '@/hooks/use-collections'

export function DashboardView({ rate = 794.99 }: { rate?: number }) {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today')

  const { sales = [] } = useSales()
  const { products = [] } = useProducts()

  const rateBCV = typeof rate === 'number' && rate > 0 ? rate : 794.99

  // Filtrar ventas según el período seleccionado
  const filteredSales = useMemo(() => {
    const now = new Date()
    const todayStr = now.toDateString()

    return (sales || []).filter((s: any) => {
      // Ignorar anuladas
      if (s.status === 'cancelled' || s.voided || s.anulada || s.anulado) return false
      if (period === 'all') return true

      const rawDate = s.timestamp || s.createdAt || s.date || s.fecha
      const saleDate = rawDate ? new Date(rawDate) : new Date()

      if (period === 'today') {
        return saleDate.toDateString() === todayStr
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

  // Métricas financieras calculadas
  const metrics = useMemo(() => {
    let totalSalesUSD = 0
    let cashUSD = 0
    let bsTotal = 0
    let digitalUSD = 0

    filteredSales.forEach((s: any) => {
      // Tomar el monto en USD de cualquier posible clave
      const amountUSD = Number(s.totalUSD ?? s.total ?? s.amount ?? s.monto ?? 0)
      totalSalesUSD += amountUSD

      const method = String(s.paymentMethod || s.method || s.metodo || '').toLowerCase()
      if (method.includes('bs') || method.includes('pago') || method.includes('movil') || method.includes('transf')) {
        const amountBS = Number(s.totalBS ?? s.montoBS ?? (amountUSD * rateBCV))
        bsTotal += amountBS
      } else if (method.includes('binance') || method.includes('zelle') || method.includes('usdt')) {
        digitalUSD += amountUSD
      } else {
        cashUSD += amountUSD
      }
    })

    // Valor total del inventario
    const totalInventoryValue = (products || []).reduce((acc: number, p: any) => {
      const cost = Number(p.costPrice ?? p.cost ?? p.price ?? 0)
      const stock = Number(p.stock ?? 0)
      return acc + (cost * stock)
    }, 0)

    const totalDisponibleUSD = cashUSD + (bsTotal / rateBCV) + digitalUSD
    const totalDisponibleBs = totalDisponibleUSD * rateBCV

    return {
      totalSalesUSD,
      cashUSD,
      bsTotal,
      digitalUSD,
      totalDisponibleUSD,
      totalDisponibleBs,
      totalInventoryValue,
      salesCount: filteredSales.length
    }
  }, [filteredSales, products, rateBCV])

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
          <span className="text-2xl font-black font-mono tracking-tight text-foreground">
            ${metrics.totalDisponibleUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs font-medium font-mono text-muted-foreground">
            ≈ Bs {metrics.totalDisponibleBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Desglose de métodos */}
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/40 pt-3 text-[11px]">
          <div>
            <p className="text-[10px] text-muted-foreground">Efectivo $</p>
            <p className="font-mono font-bold text-foreground">${metrics.cashUSD.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Bs (Caja + Banco)</p>
            <p className="font-mono font-bold text-foreground">Bs {metrics.bsTotal.toLocaleString('es-VE')}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">USDT / Digital</p>
            <p className="font-mono font-bold text-foreground">${metrics.digitalUSD.toFixed(2)}</p>
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
            <p className="text-lg font-bold font-mono text-foreground">${metrics.totalSalesUSD.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground font-mono">
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
            <p className="text-lg font-bold font-mono text-rose-400">$0.00</p>
            <p className="text-[11px] text-muted-foreground font-mono">Bs 0,00</p>
          </div>
        </div>

        {/* Ganancia Neta Real */}
        <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-3">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium text-muted-foreground">Ganancia Neta Real</span>
          </div>
          <div className="mt-2">
            <p className="text-lg font-bold font-mono text-emerald-400">${metrics.totalSalesUSD.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground font-mono">
              Bs {(metrics.totalSalesUSD * rateBCV).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
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
            <p className="text-lg font-bold font-mono text-foreground">${metrics.totalInventoryValue.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground font-mono">
              Bs {(metrics.totalInventoryValue * rateBCV).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">A costo landed</p>
          </div>
        </div>
      </div>
    </div>
  )
}
