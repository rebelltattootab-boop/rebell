'use client'

import { useState } from 'react'
import { Package, Users, Wallet, Zap } from 'lucide-react'
import { useRates } from '@/hooks/use-rates'
import { useSession } from '@/context/session-context'
import { BrandLogo } from './brand-logo'
import { LiveRatesWidget } from './live-rates-widget'
import { SegmentedPills } from './segmented-pills'
import { InventoryView } from './inventory-view'
import { SalesView } from './sales-view'
import { DashboardView } from './dashboard-view'
import { AuditView } from './audit-view'
import { SettingsView } from './settings-view'
import { CustomersView } from './customers-view'
import { ReceivablesView } from './receivables-view'

type Tab = 'sales' | 'inventory' | 'clients' | 'admin'

const TABS: { id: Tab; label: string; icon: typeof Zap }[] = [
  { id: 'sales', label: 'Ventas', icon: Zap },
  { id: 'inventory', label: 'Inventario', icon: Package },
  { id: 'clients', label: 'Clientes', icon: Users },
  { id: 'admin', label: 'Administración', icon: Wallet },
]

type ClientSub = 'directory' | 'receivables'
type AdminSub = 'finance' | 'audit' | 'backups'

export function AppShell() {
  const rates = useRates()
  const { activeUser } = useSession()
  const [tab, setTab] = useState<Tab>('sales')
  const [clientSub, setClientSub] = useState<ClientSub>('directory')
  const [adminSub, setAdminSub] = useState<AdminSub>('finance')

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-border/40 bg-background/80 px-5 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={38} />
            <div className="leading-tight">
              <div className="text-sm font-semibold">Rebell Tattoo Supply</div>
              <div className="text-xs text-muted-foreground">
                Perfil activo: <span className="font-semibold text-emerald-400">{activeUser}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Live rates */}
      <div className="px-5 pt-4">
        <LiveRatesWidget rates={rates} />
      </div>

      {/* Main content */}
      <main className="flex-1 px-5 pt-4">
        {tab === 'sales' && <SalesView rate={rates.bcv} />}
        {tab === 'inventory' && <InventoryView rate={rates.bcv} />}
        {tab === 'clients' && (
          <div className="flex flex-col gap-4">
            <SegmentedPills
              options={[
                { id: 'directory', label: 'Directorio' },
                { id: 'receivables', label: 'Cuentas por Cobrar' },
              ]}
              value={clientSub}
              onChange={(v) => setClientSub(v as ClientSub)}
            />
            {clientSub === 'directory' && <CustomersView rate={rates.bcv} />}
            {clientSub === 'receivables' && <ReceivablesView rate={rates.bcv} />}
          </div>
        )}
        {tab === 'admin' && (
          <div className="flex flex-col gap-4">
            <SegmentedPills
              options={[
                { id: 'finance', label: 'Finanzas y Caja' },
                { id: 'audit', label: 'Auditoría' },
                { id: 'backups', label: 'Respaldos' },
              ]}
              value={adminSub}
              onChange={(v) => setAdminSub(v as AdminSub)}
            />
            {adminSub === 'finance' && <DashboardView rate={rates.bcv} />}
            {adminSub === 'audit' && <AuditView />}
            {adminSub === 'backups' && <SettingsView />}
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-border/40 bg-background/90 backdrop-blur-lg">
        <div className="flex items-stretch justify-around gap-1 px-3 pb-[env(safe-area-inset-bottom)] pt-1.5">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-pressed={active}
                className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl py-2 text-[11px] font-medium transition-colors ${
                  active ? 'text-emerald-400' : 'text-muted-foreground'
                }`}
              >
                <span
                  className={`flex h-9 w-full max-w-[64px] items-center justify-center rounded-2xl transition-colors ${
                    active ? 'bg-emerald-500/15' : ''
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
 