'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  PlusCircle, 
  History, 
  Trash2, 
  Calendar,
  ReceiptText,
  Shield,
  X
} from 'lucide-react'
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSales, useProducts, useExpenses } from '@/hooks/use-collections'
import { landedCost } from '@/lib/types'
import { useSession } from '@/context/session-context'
import { verifyPin } from '@/lib/store'
import { ExpenseFormModal } from './expense-form-modal'
import { CashClosingModal } from './cash-closing-modal'

export function DashboardView({ rate = 794.99 }: { rate?: number }) {
  const { activeUser } = useSession()
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today')
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showClosingModal, setShowClosingModal] = useState(false)
  
  // Estado para el modal de PIN nativo
  const [expenseToVoid, setExpenseToVoid] = useState<any | null>(null)
  const [pinDigits, setPinDigits] = useState(['', '', '', ''])
  const [pinError, setPinError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ]

  const { sales = [] } = useSales()
  const { products = [] } = useProducts()
  const { expenses = [] } = useExpenses()

  const rateBCV = typeof rate === 'number' && rate > 0 ? rate : 794.99

  // Helper de estado anulado
  const isVoided = (item: any): boolean => {
    return Boolean(
      item.status === 'void' ||
      item.status === 'voided' ||
      item.status === 'cancelled' ||
      item.status === 'anulada' ||
      item.status === 'anulado' ||
      item.voided === true ||
      item.anulado === true
    )
  }

  // Helper universal de timestamp
  const getMillis = (item: any): number => {
    const raw = item?.createdAt ?? item?.timestamp ?? item?.date ?? item?.fecha
    if (typeof raw === 'number') return raw
    if (typeof raw?.toMillis === 'function') return raw.toMillis()
    if (typeof raw?.toDate === 'function') return raw.toDate().getTime()
    if (raw?.seconds) return raw.seconds * 1000
    const parsed = new Date(raw).getTime()
    return isNaN(parsed) ? Date.now() : parsed
  }

  const timeLimits = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    return { startOfToday, startOfWeek, startOfMonth }
  }, [])

  // Ventas filtradas
  const filteredSales = useMemo(() => {
    return (sales || []).filter((s: any) => {
      if (isVoided(s)) return false
      if (period === 'all') return true

      const ms = getMillis(s)
      if (period === 'today') return ms >= timeLimits.startOfToday
      if (period === 'week') return ms >= timeLimits.startOfWeek
      if (period === 'month') return ms >= timeLimits.startOfMonth
      return true
    })
  }, [sales, period, timeLimits])

  // Gastos filtrados
  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter((e: any) => {
      if (isVoided(e)) return false
      if (period === 'all') return true

      const ms = getMillis(e)
      if (period === 'today') return ms >= timeLimits.startOfToday
      if (period === 'week') return ms >= timeLimits.startOfWeek
      if (period === 'month') return ms >= timeLimits.startOfMonth
      return true
    })
  }, [expenses, period, timeLimits])

  // Abrir modal de confirmación con PIN
  const handleOpenPinModal = (exp: any) => {
    setExpenseToVoid(exp)
    setPinDigits(['', '', '', ''])
    setPinError('')
    setTimeout(() => {
      inputRefs[0].current?.focus()
    }, 100)
  }

  // Cerrar modal de PIN
  const handleClosePinModal = () => {
    setExpenseToVoid(null)
    setPinDigits(['', '', '', ''])
    setPinError('')
  }

  // Manejo de inputs del PIN de 4 dígitos
  const handleDigitChange = (index: number, val: string) => {
    const digit = val.slice(-1)
    if (!/^\d*$/.test(digit)) return

    const newDigits = [...pinDigits]
    newDigits[index] = digit
    setPinDigits(newDigits)
    setPinError('')

    if (digit && index < 3) {
      inputRefs[index + 1].current?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus()
    }
  }

  // Confirmar y procesar anulación de gasto con PIN
  const handleConfirmVoid = async () => {
    const fullPin = pinDigits.join('')
    if (fullPin.length < 4) {
      setPinError('Introduce los 4 dígitos del PIN')
      return
    }

    if (!expenseToVoid || !db) return

    try {
      setIsVerifying(true)
      let isValid = false
      if (typeof verifyPin === 'function') {
        isValid = await verifyPin(fullPin)
      } else {
        isValid = fullPin === '1234'
      }

      if (!isValid) {
        setPinError('PIN incorrecto')
        setIsVerifying(false)
        return
      }

      const amount = Number(expenseToVoid.amountUsd ?? expenseToVoid.amountUSD ?? expenseToVoid.amount ?? 0)

      // 1. Marcar como anulado
      await updateDoc(doc(db, 'expenses', expenseToVoid.id), {
        status: 'void',
        voidedAt: Date.now(),
        voidedBy: activeUser,
        voidReason: 'Anulado con PIN de autorización',
      })

      // 2. Registrar en auditoría
      await addDoc(collection(db, 'audit'), {
        type: 'void_expense',
        expenseId: expenseToVoid.id,
        amountUsd: amount,
        category: expenseToVoid.category || 'Gasto operativo',
        reason: 'Anulado con PIN de autorización',
        user: activeUser,
        createdAt: Date.now(),
      })

      handleClosePinModal()
    } catch (err: any) {
      setPinError(err?.message || 'Error al procesar la anulación')
    } finally {
      setIsVerifying(false)
    }
  }

  // Métricas
  const metrics = useMemo(() => {
    let totalSalesUSD = 0
    let cashUSD = 0
    let bsTotal = 0
    let digitalUSD = 0

    filteredSales.forEach((s: any) => {
      const saleUSD = Number(s.totalUsd ?? s.totalUSD ?? s.total ?? 0)
      totalSalesUSD += saleUSD

      const p = s.payments || {}
      const efUSD = Number(p.efectivoUsd ?? 0)
      const pMovil = Number(p.pagoMovil ?? 0)
      const transf = Number(p.transferencia ?? 0)
      const zelleUSD = Number(p.zelle ?? 0)
      const binanceUSD = Number(p.binance ?? 0)

      if ((efUSD + pMovil + transf + zelleUSD + binanceUSD) > 0) {
        cashUSD += efUSD
        bsTotal += (pMovil + transf)
        digitalUSD += (zelleUSD + binanceUSD)
      } else {
        cashUSD += saleUSD
      }
    })

    let totalExpensesUSD = 0
    filteredExpenses.forEach((e: any) => {
      const expUSD = Number(e.amountUsd ?? e.amountUSD ?? e.amount ?? 0)
      const expBS = Number(e.amountBs ?? e.amountBS ?? (expUSD * (e.rate || rateBCV)))
      
      totalExpensesUSD += expUSD

      const method = String(e.method || e.paymentMethod || '').toLowerCase()
      if (method.includes('pago') || method.includes('bs') || method.includes('punto') || method.includes('transf')) {
        bsTotal -= expBS
      } else if (method.includes('binance') || method.includes('zelle') || method.includes('usdt')) {
        digitalUSD -= expUSD
      } else {
        cashUSD -= expUSD
      }
    })

    const totalInventoryValue = (products || []).reduce((acc: number, p: any) => {
      const unitCost = landedCost ? landedCost(p) : Number(p.costPrice ?? p.cost ?? 0)
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
    <div className="flex flex-col gap-4 pb-28">
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

      {/* BOTONES DE ACCIÓN */}
      <div className="grid grid-cols-2 gap-2">
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

      {/* HISTORIAL DE GASTOS */}
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <ReceiptText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-bold text-foreground">Historial de Gastos</h3>
          </div>
          <span className="text-[11px] text-muted-foreground">{filteredExpenses.length} egresos</span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-5 text-center text-xs text-muted-foreground">
            No hay gastos registrados en este período.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredExpenses.map((exp: any) => {
              const expUSD = Number(exp.amountUsd ?? exp.amountUSD ?? exp.amount ?? 0)
              const expDate = new Date(getMillis(exp))
              const formattedDate = expDate.toLocaleDateString('es-VE', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })

              return (
                <div
                  key={exp.id}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3 shadow-sm transition-all"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        {exp.category || 'Gasto operativo'}
                      </span>
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground uppercase">
                        {exp.method || 'Efectivo USD'}
                      </span>
                    </div>

                    {exp.note && (
                      <p className="text-[11px] text-muted-foreground">{exp.note}</p>
                    )}

                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formattedDate}
                      </span>
                      {exp.user && <span>• Por {exp.user}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="text-right">
                      <p className="text-xs font-bold text-rose-400">-${expUSD.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Bs {(expUSD * (exp.rate || rateBCV)).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
                      </p>
                    </div>

                    <button
                      onClick={() => handleOpenPinModal(exp)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 text-muted-foreground transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400 active:scale-95"
                      title="Eliminar gasto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL DE VERIFICACIÓN CON PIN (ESTILO NATIVO) */}
      {expenseToVoid && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-sm rounded-t-3xl border-t border-border/60 bg-zinc-950 p-6 shadow-2xl sm:rounded-3xl sm:border">
            {/* Header del Modal */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-sm font-bold text-white">Verificación</h3>
                  <p className="text-xs text-zinc-400">Acción protegida por PIN</p>
                </div>
              </div>

              <button
                onClick={handleClosePinModal}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Inputs de las 4 casillas */}
            <div className="mt-8 flex justify-center gap-3">
              {[0, 1, 2, 3].map((idx) => (
                <input
                  key={idx}
                  ref={inputRefs[idx]}
                  type="password"
                  maxLength={1}
                  inputMode="numeric"
                  value={pinDigits[idx]}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="h-14 w-12 rounded-2xl border border-zinc-800 bg-zinc-900 text-center text-xl font-bold text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                />
              ))}
            </div>

            {/* Mensaje de error si falla */}
            {pinError && (
              <p className="mt-3 text-center text-xs font-medium text-rose-400">{pinError}</p>
            )}

            {/* Botón Confirmar */}
            <button
              onClick={handleConfirmVoid}
              disabled={isVerifying || pinDigits.join('').length < 4}
              className="mt-8 w-full rounded-2xl bg-zinc-200 py-3.5 text-center text-sm font-bold text-zinc-950 transition-all hover:bg-white active:scale-[0.98] disabled:opacity-40"
            >
              {isVerifying ? 'Verificando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL GASTO */}
      {showExpenseModal && (
        <ExpenseFormModal
          rate={rateBCV}
          onClose={() => setShowExpenseModal(false)}
          onSaved={() => setShowExpenseModal(false)}
        />
      )}

      {/* MODAL CIERRE */}
      {showClosingModal && (
        <CashClosingModal
          open={showClosingModal}
          onClose={() => setShowClosingModal(false)}
          onSaved={() => setShowClosingModal(false)}
          rate={rateBCV}
          {...({ rate: rateBCV, onClose: () => setShowClosingModal(false), onSaved: () => setShowClosingModal(false) } as any)}
        />
      )}
    </div>
  )
}
