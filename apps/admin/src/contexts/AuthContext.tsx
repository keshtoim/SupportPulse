import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { UserDTO } from '@supportpulse/shared'
import { authApi } from '../api/auth'
import { getToken } from '../api/client'

export interface AuthContextValue {
  user: UserDTO | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(() => authApi.currentUser())
  const [token, setToken] = useState<string | null>(() => getToken())

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password)
    setUser(data.user)
    setToken(data.accessToken)
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
    setToken(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
