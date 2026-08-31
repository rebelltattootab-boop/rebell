'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app } from '@/lib/firebase'
import { PinModal } from '@/components/pin-modal'
import { ACTIVE_USERS, type ActiveUser } from '@/lib/types'

const STORAGE_KEY = 'rt-active-user'

type SessionValue = {
  activeUser: ActiveUser
  setActiveUser: (u: ActiveUser) => void
  requestPin: () => Promise<boolean>
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [activeUser, setActiveUserState] = useState<ActiveUser>('José')
  const [pinOpen, setPinOpen] = useState(false)
  const [pinReason, setPinReason] = useState<string | undefined>()
  const resolverRef = useRef<((ok: boolean) => void) | null>(null)

  // Detectar usuario automáticamente por el login de Firebase Auth
  useEffect(() => {
    try {
      const auth = getAuth(app)
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user?.email) {
          const email = user.email.toLowerCase()
          if (email.includes('yefferson') || email.includes('jefferson')) {
            setActiveUserState('Yefferson')
            localStorage.setItem(STORAGE_KEY, 'Yefferson')
          } else if (email.includes('jose')) {
            setActiveUserState('José')
            localStorage.setItem(STORAGE_KEY, 'José')
          }
        } else {
          // Fallback a localStorage si existe
          const saved = localStorage.getItem(STORAGE_KEY) as ActiveUser | null
          if (saved && ACTIVE_USERS.includes(saved)) {
            setActiveUserState(saved)
          }
        }
      })
      return () => unsubscribe()
    } catch {
      // Si auth aún no está listo, recuperar de localStorage
      const saved = localStorage.getItem(STORAGE_KEY) as ActiveUser | null
      if (saved && ACTIVE_USERS.includes(saved)) {
        setActiveUserState(saved)
      }
    }
  }, [])

  const setActiveUser = useCallback((u: ActiveUser) => {
    setActiveUserState(u)
    try {
      localStorage.setItem(STORAGE_KEY, u)
    } catch {
      // Ignore
    }
  }, [])

  const requestPin = useCallback((reason?: string) => {
    setPinReason(reason)
    setPinOpen(true)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const handlePinSuccess = useCallback(() => {
    setPinOpen(false)
    resolverRef.current?.(true)
    resolverRef.current = null
  }, [])

  const handlePinCancel = useCallback(() => {
    setPinOpen(false)
    resolverRef.current?.(false)
    resolverRef.current = null
  }, [])

  const value = useMemo(
    () => ({ activeUser, setActiveUser, requestPin }),
    [activeUser, setActiveUser, requestPin]
  )

  return (
    <SessionContext.Provider value={value}>
      {children}
      <PinModal
        open={pinOpen}
        onSuccess={handlePinSuccess}
        onCancel={handlePinCancel}
        reason={pinReason}
      />
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return ctx
}
