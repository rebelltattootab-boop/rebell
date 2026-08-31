'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type ActiveUser = 'José' | 'Yefferson'

interface SessionContextType {
  activeUser: ActiveUser
  setActiveUser: (user: ActiveUser) => void
}

const SessionContext = createContext<SessionContextType>({
  activeUser: 'José',
  setActiveUser: () => {},
})

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [activeUser, setActiveUserState] = useState<ActiveUser>('José')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem('active_user') as ActiveUser | null
      if (saved === 'José' || saved === 'Yefferson') {
        setActiveUserState(saved)
      }
    } catch {
      // Ignorar errores de acceso a almacenamiento
    }
  }, [])

  const setActiveUser = (user: ActiveUser) => {
    setActiveUserState(user)
    try {
      localStorage.setItem('active_user', user)
    } catch {
      // Ignorar errores de almacenamiento
    }
  }

  return (
    <SessionContext.Provider value={{ activeUser, setActiveUser }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}
 