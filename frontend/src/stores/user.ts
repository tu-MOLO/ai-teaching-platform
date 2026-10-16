import { create } from 'zustand'

interface User {
  id: string
  username: string
  email: string | null
  full_name: string | null
  /** 头像地址（后端返回相对路径，可直接用于 <img>） */
  avatar_url?: string | null
  role: string
}

interface UserState {
  user: User | null
  setUser: (user: User) => void
  clearUser: () => void
  logout: () => void
  displayName: () => string
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  setUser: (user: User) => set({ user }),
  clearUser: () => set({ user: null }),
  logout: () => set({ user: null }),
  displayName: () => {
    const { user } = get()
    if (!user) return ''
    return user.full_name || user.username
  }
}))