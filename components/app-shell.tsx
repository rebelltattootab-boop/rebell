'use client'

import { useState } from 'react'
import { Package, Users, Wallet, Zap } from 'lucide-react'
import { useRates } from '@/hooks/use-rates'
import { useSession } from '@/context/session-context'
import { BrandLogo } from './brand-logo'
import { LiveRatesWidget } from './live-rates-widget'
import { InventoryView } from './inventory-view'
import { SalesView } from './sales-view'
import { DashboardView } from './dashboard-view'
import { AuditView } from './audit-view'
import { SettingsView } from './settings-view'
import { CustomersView } from './customers-view'
import { ReceivablesView } from './receivables-view'

type Tab = 'sales' | 'inventory' | 'clients' | 'admin'
type ClientSub = 'directory' | 'receivables'
type AdminSub = 'finance' | 'audit' | 'backups'

const TABS: { id: Tab; label: string; icon: typeof Zap }[] = [
  { id: 'sales', label: 'Ventas', icon: Zap },
  { id: 'inventory', label: 'Inventario', icon: Package },
  { id: 'clients', label: 'Clientes', icon: Users },
  { id: 'admin', label: 'Administración', icon: Wallet },
]

export function AppShell() {
  const [currentTab, setCurrentTab] = useState<Tab>('sales')
  const [clientSubTab, setClientSubTab] = useState<ClientSub>('directory')
  const [adminSubTab, setAdminSubTab] = useState<AdminSub>('finance')
  
  const { rates, loading: ratesLoading } = useRates()
  const { activeUser } = useSession()

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col pb-20 select-none">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800/60 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo />
            <div>
              <h1 className="text-sm font-semibold text-white tracking-wide">
                Rebell Tattoo Supply
              </h1>
              <p className="text-xs text-neutral-400">
                Perfil activo · <span className="text-neutral-200 font-medium">{activeUser}</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-4">
        <LiveRatesWidget rates={rates} loading={ratesLoading} />

        {currentTab === 'sales' && <SalesView />}
        {currentTab === 'inventory' && <InventoryView />}
        {currentTab === 'clients' && (
          <div className="space-y-4">
            <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
              <button
                onClick={() => setClientSubTab('directory')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  clientSubTab === 'directory'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Directorio
              </button>
              <button
                onClick={() => setClientSubTab('receivables')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  clientSubTab === 'receivables'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Cuentas por cobrar
              </button>
            </div>
            {clientSubTab === 'directory' ? <CustomersView /> : <ReceivablesView />}
          </div>
        )}
        {currentTab === 'admin' && (
          <div className="space-y-4">
            <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
              <button
                onClick={() => setAdminSubTab('finance')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  adminSubTab === 'finance'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Finanzas
              </button>
              <button
                onClick={() => setAdminSubTab('audit')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  adminSubTab === 'audit'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Auditoría
              </button>
              <button
                onClick={() => setAdminSubTab('backups')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  adminSubTab === 'backups'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Ajustes
              </button>
            </div>
            {adminSubTab === 'finance' && <DashboardView />}
            {adminSubTab === 'audit' && <AuditView />}
            {adminSubTab === 'backups' && <SettingsView />}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/90 backdrop-blur-lg border-t border-neutral-800/80 px-4 py-2">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = currentTab === id
            return (
              <button
                key={id}
                onClick={() => setCurrentTab(id)}
                className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'text-emerald-400 font-medium'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                <span className="text-[10px] mt-1">{label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
