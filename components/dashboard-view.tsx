'use client'

import { useState } from 'react'
import { Wallet, TrendingUp, TrendingDown, DollarSign, Package, ArrowUpRight, ArrowDownLeft, Banknote, CreditCard } from 'lucide-react'

export function DashboardView() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today')

  const rateBCV = 794.99
  const rateBinance = 931.50

  // Saldos disponibles en caja
  const cashUSD = 145.00
  const cashBs = 8500.00
  const bancoBs = 42350.00
  const digitalUSDT = 320.50

  // Cálculo total disponible
  const totalDisponibleUSD = cashUSD + (cashBs / rateBCV) + (bancoBs / rateBCV) + digitalUSDT
  const totalDisponibleBs = totalDisponibleUSD * rateBCV

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

      {/* TARJETA DESTACADA: DINERO DISPONIBLE / SALDO ACTUAL */}
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

        {/* Desglose rápido */}
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/40 pt-3 text-[11px]">
          <div>
            <p className="text-[10px] text-muted-foreground">Efectivo $</p>
            <p className="font-mono font-bold text-foreground">${cashUSD.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Bs (Caja + Banco)</p>
            <p className="font-mono font-bold text-foreground">Bs {((cashBs + bancoBs)).toLocaleString('es-VE')}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">USDT / Digital</p>
            <p className="font-mono font-bold text-foreground">${digitalUSDT.toFixed(2)}</p>
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
            <p className="text-lg font-bold font-mono text-foreground">$0.00</p>
            <p className="text-[11px] text-muted-foreground font-mono">Bs 0,00</p>
            <p className="mt-1 text-[10px] text-muted-foreground">0 ventas</p>
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
            <p className="text-lg font-bold font-mono text-emerald-400">$0.00</p>
            <p className="text-[11px] text-muted-foreground font-mono">Bs 0,00</p>
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
