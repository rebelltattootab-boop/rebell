'use client'

import { useState } from 'react'
import { Package, Users, Wallet, Zap } from 'lucide-react'
import { useRates } from '@/hooks/use-rates'
import { useSession } from '@/context/session-context'
import { ACTIVE_USERS } from '@/lib/types'
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
  const { activeUser, setActiveUser } = useSession()
  const [tab, setTab] = useState<Tab>('sales')
  const [clientSub, setClientSub] = useState<ClientSub>('directory')
  const [adminSub, setAdminSub] = useState<AdminSub>('finance')

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-border bg-background/85 px-5 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={38} />
            <div className="leading-tight">
              <div className="text-sm font-semibold">Rebell Tattoo Supply</div>
              <div className="text-xs text-muted-foreground">
                Perfil activo · {activeUser}
              </div>
            </div>
          </div>
        </div>

        {/* Active profile switcher — stamps every action with this identity */}
        <div
          role="group"
          aria-label="Perfil activo"
          className="flex items-center gap-1 rounded-xl bg-secondary/60 p-1"
        >
          {ACTIVE_USERS.map((u) => {
            const active = activeUser === u
            return (
              <button
                key={u}
                onClick={() => setActiveUser(u)}
                aria-pressed={active}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                    active
                      ? 'bg-primary-foreground/20'
                      : 'bg-secondary text-foreground'
                  }`}
                >
                  {u.charAt(0)}
                </span>
                {u}
              </button>
            )
          })}
        </div>
      </header>

      {/* Live rates */}
      <div className="px-5 pt-4">
        <LiveRatesWidget rates={rates} />
      </div>

      {/* Content */}
      <main className="flex-1 px-5 pt-4">
        {tab === 'sales' && <SalesView rates={rates} />}

        {tab === 'inventory' && <InventoryView rate={rates.bcv} />}

        {tab === 'clients' && (
          <div className="flex flex-col gap-4">
            <SegmentedPills
              ariaLabel="Sección de clientes"
              value={clientSub}
              onChange={setClientSub}
              options={[
                { id: 'directory', label: 'Directorio' },
                { id: 'receivables', label: 'Fiados Pendientes' },
              ]}
            />
            {clientSub === 'directory' ? (
              <CustomersView />
            ) : (
              <ReceivablesView rate={rates.bcv} />
            )}
          </div>
        )}

        {tab === 'admin' && (
          <div className="flex flex-col gap-4">
            <SegmentedPills
              ariaLabel="Sección de administración"
              value={adminSub}
              onChange={setAdminSub}
              options={[
                { id: 'finance', label: 'Finanzas y Caja' },
                { id: 'audit', label: 'Auditoría' },
                { id: 'backups', label: 'Respaldos' },
              ]}
            />
            {adminSub === 'finance' && <DashboardView rate={rates.bcv} />}
            {adminSub === 'audit' && <AuditView />}
            {adminSub === 'backups' && <SettingsView />}
          </div>
        )}
      </main>

      {/* Bottom nav — 4 spacious, touch-friendly tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-border bg-background/90 backdrop-blur-md">
        <div className="flex items-stretch justify-around gap-1 px-3 pb-[env(safe-area-inset-bottom)] pt-2">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-pressed={active}
                className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl py-2.5 text-[11px] font-semibold transition-colors ${
                  active ? 'text-emerald-400' : 'text-muted-foreground'
                }`}
              >
                <span
                  className={`flex h-9 w-full max-w-[64px] items-center justify-center rounded-xl transition-colors ${
                    active
                      ? 'bg-emerald-500/15 shadow-[0_0_16px_-4px] shadow-emerald-500/50 ring-1 ring-emerald-500/40'
                      : ''
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
