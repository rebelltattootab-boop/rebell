'use client'

import { useState } from 'react'
import { ShieldCheck, Search, ArrowUpRight, ArrowDownLeft, AlertCircle, History, Filter } from 'lucide-react'
import { useSession } from '@/context/session-context'

interface AuditLog {
  id: string
  timestamp: string
  user: string
  action: string
  type: 'sale' | 'restock' | 'expense' | 'price_change' | 'credit'
  details: string
  amountUSD?: number
}

export function AuditView() {
  const { activeUser } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  // Obtener logs de auditoría guardados o mostrar demo/seguros
  const [logs] = useState<AuditLog[]>(() => {
    try {
      const stored = localStorage.getItem('rebell_audit_logs')
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {
      // Ignorar error de JSON parse
    }
    return [
      {
        id: 'log-1',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        user: activeUser || 'Sistema',
        action: 'Apertura de sesión',
        type: 'price_change',
        details: 'Sesión activa en el sistema',
      }
    ]
  })

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || log.type === filterType
    return matchesSearch && matchesType
  })

  const getTypeIcon = (type: AuditLog['type']) => {
    switch (type) {
      case 'sale':
        return <ArrowUpRight className="h-4 w-4 text-emerald-400" />
      case 'expense':
        return <ArrowDownLeft className="h-4 w-4 text-rose-400" />
      case 'credit':
        return <AlertCircle className="h-4 w-4 text-amber-400" />
      default:
        return <History className="h-4 w-4 text-sky-400" />
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Encabezado */}
      <div className="flex items-center justify-between rounded-xl bg-secondary/30 p-3 border border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Registro de Auditoría</h2>
            <p className="text-xs text-muted-foreground">Trazabilidad de movimientos y usuarios</p>
          </div>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por usuario, acción o detalle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-4 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {[
            { id: 'all', label: 'Todos' },
            { id: 'sale', label: 'Ventas' },
            { id: 'expense', label: 'Gastos' },
            { id: 'credit', label: 'Fiados' },
            { id: 'price_change', label: 'Sistema' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterType(item.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors shrink-0 ${
                filterType === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Registros */}
      <div className="flex flex-col gap-2">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
            <History className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-xs font-medium text-muted-foreground">No hay registros de auditoría</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start justify-between rounded-xl border border-border/60 bg-card p-3 shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-secondary/80 p-2">
                  {getTypeIcon(log.type)}
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{log.action}</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {log.user}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{log.details}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] text-muted-foreground">{log.timestamp}</span>
                {log.amountUSD !== undefined && (
                  <span className="text-xs font-mono font-bold text-foreground">
                    ${log.amountUSD.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
