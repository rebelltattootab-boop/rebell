'use client'

import { useState } from 'react'
import { Wallet, ArrowUpRight, ArrowDownLeft, DollarSign, CreditCard, Banknote, RefreshCcw, PlusCircle, MinusCircle } from 'lucide-react'
import { useSession } from '@/context/session-context'

interface Transaction {
  id: string
  type: 'income' | 'expense'
  description: string
  amountUSD: number
  method: 'cash_usd' | 'cash_bs' | 'pago_movil' | 'binance' | 'zelle'
  date: string
  user: string
}

export function FinanceView() {
  const { activeUser } = useSession()

  // Tasas de referencia (pueden venir del estado global)
  const rateBCV = 794.99
  const rateBinance = 931.80

  // Saldos base / acumulados por método de pago
  const [balances, setBalances] = useState({
    cashUSD: 145.00,
    cashBS: 8500.00,
    pagoMovil: 42350.00,
    binanceUSDT: 320.50,
    zelle: 0.00
  })

  // Transacciones recientes de caja
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 'tx-1',
      type: 'income',
      description: 'Venta #1042 - Agujas RL y Tinta Dynamic',
      amountUSD: 35.00,
      method: 'pago_movil',
      date: 'Hoy, 06:15 a.m.',
      user: activeUser || 'José'
    },
    {
      id: 'tx-2',
      type: 'expense',
      description: 'Pago de hielo y agua para estudio',
      amountUSD: 5.00,
      method: 'cash_bs',
      date: 'Hoy, 05:40 a.m.',
      user: activeUser || 'José'
    }
  ])

  // Cálculo de totales disponibles en USD equivalente
  const totalCashUSD = balances.cashUSD
  const totalCashBStoUSD = balances.cashBS / rateBCV
  const totalPagoMoviltoUSD = balances.pagoMovil / rateBCV
  const totalDigitalUSD = balances.binanceUSDT + balances.zelle

  const totalDisponibleUSD = totalCashUSD + totalCashBStoUSD + totalPagoMoviltoUSD + totalDigitalUSD
  const totalDisponibleBS = totalDisponibleUSD * rateBCV

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* TARJETA PRINCIPAL: SALDO TOTAL DISPONIBLE */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950/40 via-card to-card p-5 border border-emerald-500/20 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Wallet className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Dinero Total Disponible
            </span>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
            Caja Abierta
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-1">
          <div className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
            ${totalDisponibleUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs font-medium text-muted-foreground font-mono">
            ≈ Bs {totalDisponibleBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Tasa BCV)
          </div>
        </div>

        {/* Resumen rápido de Ingresos / Gastos */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border/40 pt-3">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-emerald-500/10 p-1.5 text-emerald-400">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Ingresos Hoy</p>
              <p className="text-xs font-bold text-foreground font-mono">+$35.00</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-rose-500/10 p-1.5 text-rose-400">
              <ArrowDownLeft className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Gastos Hoy</p>
              <p className="text-xs font-bold text-foreground font-mono">-$5.00</p>
            </div>
          </div>
        </div>
      </div>

      {/* DESGLOSE POR MÉTODOS DE PAGO */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Desglose por Cuentas / Métodos
        </h3>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Efectivo USD */}
          <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-3 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-medium">Efectivo USD</span>
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="mt-2">
              <p className="text-sm font-bold font-mono text-foreground">${balances.cashUSD.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">Caja física $</p>
            </div>
          </div>

          {/* Efectivo Bs */}
          <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-3 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-medium">Efectivo Bs</span>
              <Banknote className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <div className="mt-2">
              <p className="text-sm font-bold font-mono text-foreground">Bs {balances.cashBS.toLocaleString('es-VE')}</p>
              <p className="text-[10px] text-muted-foreground font-mono">≈ ${(balances.cashBS / rateBCV).toFixed(2)}</p>
            </div>
          </div>

          {/* Pago Móvil / Bancos */}
          <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-3 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-medium">Pago Móvil / Banco</span>
              <CreditCard className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="mt-2">
              <p className="text-sm font-bold font-mono text-foreground">Bs {balances.pagoMovil.toLocaleString('es-VE')}</p>
              <p className="text-[10px] text-muted-foreground font-mono">≈ ${(balances.pagoMovil / rateBCV).toFixed(2)}</p>
            </div>
          </div>

          {/* Binance USDT / Zelle */}
          <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-3 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-medium">Binance / Zelle</span>
              <DollarSign className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <div className="mt-2">
              <p className="text-sm font-bold font-mono text-foreground">${balances.binanceUSDT.toFixed(2)} USDT</p>
              <p className="text-[10px] text-muted-foreground font-mono">${balances.zelle.toFixed(2)} Zelle</p>
            </div>
          </div>
        </div>
      </div>

      {/* ACCIONES RÁPIDAS DE CAJA */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 border border-primary/20 py-2.5 px-3 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">
          <PlusCircle className="h-4 w-4" />
          Registrar Entrada
        </button>
        <button className="flex items-center justify-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 py-2.5 px-3 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors">
          <MinusCircle className="h-4 w-4" />
          Registrar Gasto
        </button>
      </div>

      {/* MOVIMIENTOS RECIENTES DE CAJA */}
      <div className="flex flex-col gap-2 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Movimientos Recientes
          </h3>
          <span className="text-[10px] text-muted-foreground">{transactions.length} registros</span>
        </div>

        <div className="flex flex-col gap-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-lg p-2 ${
                    tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {tx.type === 'income' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold">{tx.description}</span>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{tx.date}</span>
                    <span>•</span>
                    <span className="capitalize">{tx.method.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`text-xs font-mono font-bold ${
                    tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {tx.type === 'income' ? '+' : '-'}${tx.amountUSD.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
