import { create } from 'zustand'

interface User {
  id: string
  username: string
  email: string
  role: string
}

interface UserState {
  user: User | null
  setUser: (user: User) => void
  clearUser: () => void
  logout: () => void
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user: User) => set({ user }),
  clearUser: () => set({ user: null }),
  logout: () => set({ user: null })
}))