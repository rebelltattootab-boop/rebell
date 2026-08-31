'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged, User } from 'firebase/auth'

export type ActiveUser = 'José' | 'Yefferson'

interface SessionContextType {
  activeUser: ActiveUser
  setActiveUser: (user: ActiveUser) => void
  user: User | null
  loading: boolean
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [activeUser, setActiveUser] = useState<ActiveUser>('José')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser?.email) {
        const emailLower = firebaseUser.email.toLowerCase()
        if (emailLower.includes('yefferson')) {
          setActiveUser('Yefferson')
        } else if (emailLower.includes('jose')) {
          setActiveUser('José')
        }
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return (
    <SessionContext.Provider value={{ activeUser, setActiveUser, user, loading }}>
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
