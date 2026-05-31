import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useUserStore } from '../user'

describe('useUserStore', () => {
  beforeEach(() => {
    useUserStore.setState({
      user: null,
    })
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have null user', () => {
      expect(useUserStore.getState().user).toBeNull()
    })
  })

  describe('setUser', () => {
    it('should set user data correctly', () => {
      const user = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'teacher',
      }

      useUserStore.getState().setUser(user)

      const state = useUserStore.getState()
      expect(state.user).toEqual(user)
      expect(state.user?.id).toBe('1')
      expect(state.user?.username).toBe('testuser')
      expect(state.user?.email).toBe('test@example.com')
      expect(state.user?.full_name).toBe('Test User')
      expect(state.user?.role).toBe('teacher')
    })

    it('should update user when called with different data', () => {
      const firstUser = {
        id: '1',
        username: 'first',
        email: 'first@example.com',
        full_name: 'First User',
        role: 'teacher',
      }

      const secondUser = {
        id: '2',
        username: 'second',
        email: 'second@example.com',
        full_name: 'Second User',
        role: 'admin',
      }

      useUserStore.getState().setUser(firstUser)
      expect(useUserStore.getState().user).toEqual(firstUser)

      useUserStore.getState().setUser(secondUser)
      expect(useUserStore.getState().user).toEqual(secondUser)
    })
  })

  describe('clearUser', () => {
    it('should set user to null', () => {
      useUserStore.getState().clearUser()

      expect(useUserStore.getState().user).toBeNull()
    })

    it('should clear previously set user', () => {
      useUserStore.getState().setUser({
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'teacher',
      })

      expect(useUserStore.getState().user).not.toBeNull()

      useUserStore.getState().clearUser()

      expect(useUserStore.getState().user).toBeNull()
    })
  })

  describe('logout', () => {
    it('should set user to null', () => {
      useUserStore.getState().setUser({
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'teacher',
      })

      useUserStore.getState().logout()

      expect(useUserStore.getState().user).toBeNull()
    })
  })

  describe('displayName', () => {
    it('should return empty string when no user', () => {
      expect(useUserStore.getState().displayName()).toBe('')
    })

    it('should return full_name when available', () => {
      useUserStore.getState().setUser({
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User Full Name',
        role: 'teacher',
      })

      expect(useUserStore.getState().displayName()).toBe('Test User Full Name')
    })

    it('should return username when full_name is null', () => {
      useUserStore.getState().setUser({
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        full_name: null,
        role: 'teacher',
      })

      expect(useUserStore.getState().displayName()).toBe('testuser')
    })
  })
})
