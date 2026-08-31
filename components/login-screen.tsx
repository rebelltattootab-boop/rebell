'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, LogIn } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { BrandLogo } from './brand-logo'

export function LoginScreen() {
  const { signIn, configured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      const code = (err as { code?: string }).code
      setError(
        code === 'auth/invalid-credential' || code === 'auth/wrong-password'
          ? 'Correo o contraseña incorrectos.'
          : 'No se pudo iniciar sesión. Intenta de nuevo.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <BrandLogo size={72} className="mx-auto mb-5 rounded-2xl" />
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Rebell Tattoo Supply
          </h1>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Gestión de inventario, ventas y finanzas
          </p>
        </div>

        {!configured && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-pretty leading-relaxed">
              Firebase no está configurado. Agrega la variable{' '}
              <span className="font-mono text-xs">NEXT_PUBLIC_FIREBASE_API_KEY</span>{' '}
              en la configuración del proyecto para activar el inicio de sesión.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="socio@estudio.com"
              className="h-13 rounded-xl border border-input bg-card px-4 text-base outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-13 rounded-xl border border-input bg-card px-4 text-base outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !configured}
            className="mt-2 flex h-13 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground transition-opacity active:opacity-80 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LogIn className="h-5 w-5" />
            )}
            Iniciar sesión
          </button>
        </form>
      </div>
    </main>
  )
}
