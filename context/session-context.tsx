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
import { PinModal } from '@/components/pin-modal'
import { ACTIVE_USERS, type ActiveUser } from '@/lib/types'

const STORAGE_KEY = 'rt-active-user'

type SessionValue = {
  activeUser: ActiveUser
  setActiveUser: (u: ActiveUser) => void
  // Opens the PIN modal and resolves true when the correct PIN is entered.
  requestPin: () => Promise<boolean>
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [activeUser, setActiveUserState] = useState<ActiveUser>('José')
  const [pinOpen, setPinOpen] = useState(false)
  const resolverRef = useRef<((ok: boolean) => void) | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && (ACTIVE_USERS as readonly string[]).includes(stored)) {
      setActiveUserState(stored as ActiveUser)
    }
  }, [])

  const setActiveUser = useCallback((u: ActiveUser) => {
    setActiveUserState(u)
    localStorage.setItem(STORAGE_KEY, u)
  }, [])

  const requestPin = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        resolverRef.current = resolve
        setPinOpen(true)
      }),
    [],
  )

  const handleResult = useCallback((ok: boolean) => {
    setPinOpen(false)
    resolverRef.current?.(ok)
    resolverRef.current = null
  }, [])

  const value = useMemo<SessionValue>(
    () => ({ activeUser, setActiveUser, requestPin }),
    [activeUser, setActiveUser, requestPin],
  )

  return (
    <SessionContext.Provider value={value}>
      {children}
      {pinOpen && <PinModal onResult={handleResult} />}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession debe usarse dentro de SessionProvider')
  return ctx
}
