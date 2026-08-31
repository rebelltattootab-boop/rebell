'use client'

import { useState, useMemo } from 'react'
import { 
  ShieldCheck, 
  Search, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Key, 
  Calendar,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react'
import { useAudit } from '@/hooks/use-collections'

export function AuditView() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  const { entries = [], loading } = useAudit()

  // Helper de parseo de fecha universal
  const getMillis = (item: any): number => {
    const raw = item?.createdAt ?? item?.timestamp ?? item?.date ?? item?.fecha
    if (typeof raw === 'number') return raw
    if (typeof raw?.toMillis === 'function') return raw.toMillis()
    if (typeof raw?.toDate === 'function') return raw.toDate().getTime()
    if (raw?.seconds) return raw.seconds * 1000
    const parsed = new Date(raw).getTime()
    return isNaN(parsed) ? Date.now() : parsed
  }

  // Filtrado de auditoría
  const filteredEntries = useMemo(() => {
    return (entries || []).filter((entry: any) => {
      // 1. Filtro por categoría / botón
      const t = String(entry.type || '').toLowerCase()
      if (filterType === 'sales' && !t.includes('sale') && !t.includes('venta')) return false
      if (filterType === 'expenses' && !t.includes('expense') && !t.includes('gasto')) return false
      if (filterType === 'credit' && !t.includes('credit') && !t.includes('abono') && !t.includes('fiado')) return false
      if (filterType === 'system' && (t.includes('sale') || t.includes('expense') || t.includes('abono'))) return false

      // 2. Filtro por buscador de texto
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const user = String(entry.user || entry.createdBy || '').toLowerCase()
        const reason = String(entry.reason || entry.details || entry.category || '').toLowerCase()
        const typeStr = t
        const match = user.includes(query) || reason.includes(query) || typeStr.includes(query)
        if (!match) return false
      }

      return true
    })
  }, [entries, filterType, searchTerm])

  // Formateador de texto por tipo de evento
  const getEventDetails = (entry: any) => {
    const type = String(entry.type || '').toLowerCase()

    if (type === 'void_expense') {
      return {
        title: 'Anulación de gasto',
        desc: `${entry.category || 'Gasto'} - $${Number(entry.amountUsd || 0).toFixed(2)} (${entry.reason || 'Eliminado'})`,
        icon: TrendingDown,
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
      }
    }

    if (type === 'expense') {
      return {
        title: 'Registro de gasto',
        desc: `${entry.category || 'Gasto'} - $${Number(entry.amountUsd || entry.amount || 0).toFixed(2)}`,
        icon: TrendingDown,
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      }
    }

    if (type === 'void_sale' || type === 'void') {
      return {
        title: 'Venta anulada',
        desc: entry.reason || 'Venta cancelada y stock retornado',
        icon: AlertCircle,
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
      }
    }

    if (type === 'stock_adjust') {
      return {
        title: 'Ajuste de inventario',
        desc: entry.reason || `Producto ID: ${entry.productId || 'N/A'}`,
        icon: Package,
        color: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
      }
    }

    if (type === 'pin_change') {
      return {
        title: 'Cambio de PIN de Dueño',
        desc: 'Actualización de credenciales maestras',
        icon: Key,
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      }
    }

    if (type === 'session_open' || type === 'session_login') {
      return {
        title: 'Apertura de sesión',
        desc: 'Sesión activa en el sistema',
        icon: ShieldCheck,
        color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
      }
    }

    return {
      title: entry.action || entry.title || 'Movimiento del sistema',
      desc: entry.details || entry.reason || entry.note || 'Registro de actividad',
      icon: FileSpreadsheet,
      color: 'text-muted-foreground bg-secondary border-border/50'
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-28">
      {/* Banner de Auditoría */}
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-sm font-bold text-foreground">Registro de Auditoría</h2>
          <p className="text-[11px] text-muted-foreground">Trazabilidad en tiempo real de movimientos y usuarios</p>
        </div>
      </div>

      {/* Barra de Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por usuario, acción o detalle..."
          className="w-full rounded-xl border border-border/60 bg-card py-2.5 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500/50 focus:outline-none"
        />
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-5 gap-1 rounded-xl bg-secondary/50 p-1 text-[11px]">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'sales', label: 'Ventas' },
          { id: 'expenses', label: 'Gastos' },
          { id: 'credit', label: 'Fiados' },
          { id: 'system', label: 'Sistema' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setFilterType(item.id)}
            className={`rounded-lg py-1.5 font-medium transition-colors ${
              filterType === item.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Lista de Registros */}
      {loading ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          Cargando registros de auditoría...
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
          No se encontraron registros de auditoría.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredEntries.map((entry: any) => {
            const date = new Date(getMillis(entry))
            const formattedTime = date.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })
            const formattedDate = date.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })
            const info = getEventDetails(entry)
            const Icon = info.icon

            return (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border ${info.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{info.title}</span>
                      {entry.user && (
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                          {entry.user}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{info.desc}</p>
                  </div>
                </div>

                <div className="text-right text-[10px] text-muted-foreground">
                  <p className="font-semibold text-foreground">{formattedTime}</p>
                  <p>{formattedDate}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
