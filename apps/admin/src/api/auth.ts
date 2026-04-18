import type { LoginResponse, LogoutResponse, UserDTO } from '@supportpulse/shared'
import { http, setToken, clearToken } from './client'

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const data = await http.post<LoginResponse>('/auth/login', { email, password })
    setToken(data.accessToken)
    localStorage.setItem('sp_user', JSON.stringify(data.user))
    return data
  },

  logout: async (): Promise<void> => {
    await http.post<LogoutResponse>('/auth/logout', {}).catch(() => {})
    clearToken()
  },

  currentUser: (): UserDTO | null => {
    const raw = localStorage.getItem('sp_user')
    if (!raw) return null
    try { return JSON.parse(raw) as UserDTO } catch { return null }
  },
}
