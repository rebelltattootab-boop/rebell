'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type ActiveUser = 'José' | 'Yefferson'

interface SessionContextType {
  activeUser: ActiveUser
  setActiveUser: (user: ActiveUser) => void
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [activeUser, setActiveUserState] = useState<ActiveUser>('José')

  useEffect(() => {
    const saved = localStorage.getItem('active_user') as ActiveUser | null
    if (saved === 'José' || saved === 'Yefferson') {
      setActiveUserState(saved)
    }
  }, [])

  const setActiveUser = (user: ActiveUser) => {
    setActiveUserState(user)
    localStorage.setItem('active_user', user)
  }

  return (
    <SessionContext.Provider value={{ activeUser, setActiveUser }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}
