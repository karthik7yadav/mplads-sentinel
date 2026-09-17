import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Role, User } from '../types'
import { USERS } from '../data/realData'

interface AuthContextType {
  currentUser: User
  role: Role
  users: User[]
  login: (role: Role) => void
  logout: () => void
  switchRole: (role: Role) => void
  switchUser: (userId: string) => void
  isDm: boolean
  isMp: boolean
  isStateNodal: boolean
  isMospi: boolean
  canUpdateExecution: boolean
  canSanction: boolean
  canRecordFinding: boolean
  canAssignVerification: boolean
  canEscalate: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = 'mplads_sentinel_user_id'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedId = localStorage.getItem(STORAGE_KEY)
    if (savedId) {
      const found = USERS.find((u) => u.id === savedId)
      if (found) return found
    }
    // Default to District Collector Rajsamand, Rajasthan (contains top anomaly test cases)
    return USERS[0]
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, currentUser.id)
  }, [currentUser])

  const login = (role: Role) => {
    const user = USERS.find((u) => u.role === role) || USERS[0]
    setCurrentUser(user)
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setCurrentUser(USERS[0])
  }

  const switchRole = (role: Role) => {
    const user = USERS.find((u) => u.role === role) || USERS[0]
    setCurrentUser(user)
  }

  const switchUser = (userId: string) => {
    const user = USERS.find((u) => u.id === userId)
    if (user) setCurrentUser(user)
  }

  const role = currentUser.role
  const isDm = role === 'dm'
  const isMp = role === 'mp'
  const isStateNodal = role === 'nodal'
  const isMospi = role === 'mospi'

  const value: AuthContextType = {
    currentUser,
    role,
    users: USERS,
    login,
    logout,
    switchRole,
    switchUser,
    isDm,
    isMp,
    isStateNodal,
    isMospi,
    // Role-specific operational permissions
    canUpdateExecution: isDm,
    canSanction: isDm,
    canRecordFinding: isDm,
    canAssignVerification: isDm || isStateNodal,
    canEscalate: isDm || isStateNodal,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
