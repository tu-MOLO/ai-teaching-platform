import { create } from 'zustand'
import request from '../services/request'

interface AuthState {
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isInitializing: boolean
  login: (token: string, refreshToken: string) => void
  logout: () => void
  setToken: (token: string) => void
  initializeAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('token'),
  isInitializing: true,
  login: (token: string, refreshToken: string) => {
    localStorage.setItem('token', token)
    localStorage.setItem('refreshToken', refreshToken)
    set({ token, refreshToken, isAuthenticated: true, isInitializing: false })
  },
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    set({ token: null, refreshToken: null, isAuthenticated: false, isInitializing: false })
  },
  setToken: (token: string) => {
    localStorage.setItem('token', token)
    set({ token, isAuthenticated: true })
  },
  initializeAuth: async () => {
    const { token, refreshToken, login, logout } = get()
    if (!token) {
      set({ isInitializing: false })
      return
    }
    try {
      await request.get('/api/v1/auth/me')
      set({ isInitializing: false })
    } catch {
      try {
        const data: any = await request.post('/api/v1/auth/refresh', {
          refresh_token: refreshToken
        })
        const access_token = data.access_token
        const new_refresh_token = data.refresh_token
        login(access_token, new_refresh_token || refreshToken!)
        set({ isInitializing: false })
      } catch {
        logout()
        set({ isInitializing: false })
      }
    }
  }
}))
