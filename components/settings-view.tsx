'use client'

import { useState } from 'react'
import {
  Check,
  Database,
  Download,
  FileSpreadsheet,
  KeyRound,
  Loader2,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { useSession } from '@/context/session-context'
import { updateOwnerPin } from '@/lib/store'
import {
  useAudit,
  useCashClosings,
  useCustomers,
  useExpenses,
  useProducts,
  useSales,
} from '@/hooks/use-collections'
import {
  downloadFile,
  expensesCSV,
  inventoryCSV,
  salesCSV,
  stamp,
} from '@/lib/export'

export function SettingsView() {
  const { user, signOut } = useAuth()
  const { activeUser } = useSession()

  return (
    <div className="flex flex-col gap-5 pb-28">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Ajustes</h1>
        <p className="text-sm text-muted-foreground">
          Sesión: {user?.email ?? '—'} · Perfil activo: {activeUser}
        </p>
      </header>

      <OwnerPinCard />

      <ExportBackupCard />

      <button
        onClick={() => signOut()}
        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-secondary text-sm font-semibold text-secondary-foreground active:opacity-70"
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </button>
    </div>
  )
}

function ExportBackupCard() {
  const { products } = useProducts()
  const { sales } = useSales()
  const { expenses } = useExpenses()
  const { customers } = useCustomers()
  const { closings } = useCashClosings()
  const { entries: audit } = useAudit()
  const [note, setNote] = useState<string | null>(null)

  function flash(text: string) {
    setNote(text)
    setTimeout(() => setNote(null), 3000)
  }

  // Download the three operational sheets as separate CSV files. Excel opens
  // each directly; the UTF-8 BOM keeps Spanish accents intact.
  function exportCSV() {
    const s = stamp()
    downloadFile(`inventario_${s}.csv`, inventoryCSV(products), 'text/csv;charset=utf-8')
    downloadFile(`ventas_${s}.csv`, salesCSV(sales), 'text/csv;charset=utf-8')
    downloadFile(`gastos_${s}.csv`, expensesCSV(expenses), 'text/csv;charset=utf-8')
    flash('3 archivos CSV generados (Inventario, Ventas, Gastos).')
  }

  // Full state snapshot — everything needed to restore or migrate.
  function exportBackup() {
    const backup = {
      app: 'Rebell Tattoo Supply',
      version: 1,
      exportedAt: new Date().toISOString(),
      counts: {
        products: products.length,
        sales: sales.length,
        expenses: expenses.length,
        customers: customers.length,
        closings: closings.length,
        audit: audit.length,
      },
      data: { products, sales, expenses, customers, closings, audit },
    }
    downloadFile(
      `respaldo_rebell_${stamp()}.json`,
      JSON.stringify(backup, null, 2),
      'application/json',
    )
    flash('Copia de seguridad JSON descargada.')
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Database className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <h2 className="text-base font-semibold">Exportación y Respaldos</h2>
          <p className="text-xs text-muted-foreground">
            Descarga tus datos para Excel o guarda una copia completa
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={exportCSV}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground active:opacity-80"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Exportar a Excel / CSV
        </button>

        <button
          onClick={exportBackup}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-secondary text-sm font-semibold text-secondary-foreground active:opacity-70"
        >
          <Download className="h-4 w-4" />
          Descargar Copia de Seguridad (JSON)
        </button>

        <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs text-muted-foreground">
          <Stat label="Productos" value={products.length} />
          <Stat label="Ventas" value={sales.length} />
          <Stat label="Gastos" value={expenses.length} />
        </div>

        {note && <p className="text-sm text-success">{note}</p>}
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-secondary/50 py-2">
      <div className="text-base font-semibold tabular-nums text-foreground">
        {value}
      </div>
      {label}
    </div>
  )
}

function OwnerPinCard() {
  const { activeUser } = useSession()
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (newPin !== confirmPin) {
      setMsg({ ok: false, text: 'El nuevo PIN no coincide' })
      return
    }
    setSaving(true)
    try {
      await updateOwnerPin(oldPin, newPin, activeUser)
      setMsg({ ok: true, text: 'PIN actualizado correctamente' })
      setOldPin('')
      setNewPin('')
      setConfirmPin('')
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <KeyRound className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <h2 className="text-base font-semibold">PIN del propietario</h2>
          <p className="text-xs text-muted-foreground">
            Protege anulaciones y cambios de precio (por defecto 1234)
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <PinField label="PIN actual" value={oldPin} onChange={setOldPin} />
        <PinField label="Nuevo PIN" value={newPin} onChange={setNewPin} />
        <PinField
          label="Confirmar nuevo PIN"
          value={confirmPin}
          onChange={setConfirmPin}
        />

        {msg && (
          <p className={`text-sm ${msg.ok ? 'text-success' : 'text-destructive'}`}>
            {msg.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-1 flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground active:opacity-80 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Actualizar PIN
        </button>
      </form>
    </section>
  )
}

function PinField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        inputMode="numeric"
        type="password"
        maxLength={4}
        placeholder="••••"
        className="input tracking-[0.5em]"
      />
    </label>
  )
}
