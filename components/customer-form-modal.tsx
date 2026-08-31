'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { createCustomer, updateCustomer } from '@/lib/store'
import type { Customer } from '@/lib/types'

type Props = {
  open: boolean
  // When editing, pass the existing customer; omit for a new one.
  customer?: Customer | null
  // Prefill the name field (e.g. from an autocomplete search term).
  initialName?: string
  onClose: () => void
  // Fired after a successful create with the new id + name.
  onCreated?: (result: { id: string; name: string }) => void
}

// Quick create/edit modal for CRM customers.
export function CustomerFormModal({
  open,
  customer,
  initialName,
  onClose,
  onCreated,
}: Props) {
  const [form, setForm] = useState({
    name: '',
    studio: '',
    whatsapp: '',
    instagram: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm({
        name: customer?.name ?? initialName ?? '',
        studio: customer?.studio ?? '',
        whatsapp: customer?.whatsapp ?? '',
        instagram: customer?.instagram ?? '',
      })
      setError(null)
    }
  }, [open, customer, initialName])

  if (!open) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (customer) {
        await updateCustomer(customer.id, {
          name: form.name.trim(),
          studio: form.studio.trim(),
          whatsapp: form.whatsapp.replace(/\D/g, ''),
          instagram: form.instagram.trim().replace(/^@/, ''),
        })
        onClose()
      } else {
        const result = await createCustomer(form)
        onCreated?.(result)
        onClose()
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-border bg-card p-6 pb-8 sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {customer ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground active:opacity-70"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Nombre">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="Nombre del cliente"
            />
          </Field>
          <Field label="Estudio">
            <input
              value={form.studio}
              onChange={(e) => setForm({ ...form, studio: e.target.value })}
              className="input"
              placeholder="Nombre del estudio (opcional)"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="WhatsApp">
              <input
                inputMode="tel"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                className="input"
                placeholder="584121234567"
              />
            </Field>
            <Field label="Instagram">
              <input
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                className="input"
                placeholder="@usuario"
              />
            </Field>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-1 flex h-13 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground active:opacity-80 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-5 w-5 animate-spin" />}
            {customer ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  )
}
