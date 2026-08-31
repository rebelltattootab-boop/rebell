'use client'

import { Loader2 } from 'lucide-react'
import { AuthProvider, useAuth } from '@/context/auth-context'
import { SessionProvider } from '@/context/session-context'
import { LoginScreen } from '@/components/login-screen'
import { AppShell } from '@/components/app-shell'

function Gate() {
  const { user, loading, configured } = useAuth()

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    )
  }

  if (!user || !configured) {
    return <LoginScreen />
  }

  return (
    <SessionProvider>
      <AppShell />
    </SessionProvider>
  )
}

export default function Page() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
