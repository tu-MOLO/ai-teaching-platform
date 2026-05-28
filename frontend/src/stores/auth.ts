import { create } from 'zustand'
import axios from 'axios'

interface AuthState {
  token: string | null
  isAuthenticated: boolean
  isInitializing: boolean
  login: (token: string) => void
  logout: () => Promise<void>
  setToken: (token: string) => void
  hydrate: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  isAuthenticated: false,
  isInitializing: true,

  login: (token: string) => {
    set({ token, isAuthenticated: true, isInitializing: false })
  },

  logout: async () => {
    set({ token: null, isAuthenticated: false, isInitializing: false })
    try {
      await axios.post('/api/v1/auth/logout')
    } catch {
      // 即便服务器请求失败，本地状态已经清理
    }
  },

  setToken: (token: string) => {
    set({ token, isAuthenticated: true })
  },

  hydrate: async () => {
    try {
      const response = await axios.post('/api/v1/auth/refresh')
      const payload =
        response.data && typeof response.data === 'object' && response.data.data
          ? response.data.data
          : response.data
      const access_token = payload?.access_token
      if (access_token) {
        set({ token: access_token, isAuthenticated: true, isInitializing: false })
        return
      }
    } catch {
      // Cookie 中无有效 refresh_token，需要重新登录
    }
    set({ token: null, isAuthenticated: false, isInitializing: false })
  },
}))