import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from '../auth'

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}))

import axios from 'axios'

const mockedAxios = vi.mocked(axios)

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      isAuthenticated: false,
      isInitializing: true,
    })
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have null token', () => {
      expect(useAuthStore.getState().token).toBeNull()
    })

    it('should not be authenticated', () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })

    it('should be initializing', () => {
      expect(useAuthStore.getState().isInitializing).toBe(true)
    })
  })

  describe('login', () => {
    it('should set token and mark as authenticated', () => {
      useAuthStore.getState().login('test-token-123')

      const state = useAuthStore.getState()
      expect(state.token).toBe('test-token-123')
      expect(state.isAuthenticated).toBe(true)
      expect(state.isInitializing).toBe(false)
    })

    it('should update state correctly on different token values', () => {
      useAuthStore.getState().login('another-token')

      const state = useAuthStore.getState()
      expect(state.token).toBe('another-token')
      expect(state.isAuthenticated).toBe(true)
    })
  })

  describe('logout', () => {
    it('should clear token and mark as unauthenticated', async () => {
      useAuthStore.setState({ token: 'existing-token', isAuthenticated: true })

      mockedAxios.post.mockResolvedValueOnce({})

      await useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.isInitializing).toBe(false)
    })

    it('should call logout API endpoint', async () => {
      mockedAxios.post.mockResolvedValueOnce({})

      await useAuthStore.getState().logout()

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/v1/auth/logout')
    })

    it('should clear local state even if API call fails', async () => {
      useAuthStore.setState({ token: 'existing-token', isAuthenticated: true })

      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'))

      await useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('setToken', () => {
    it('should set token and mark as authenticated', () => {
      useAuthStore.getState().setToken('new-token')

      const state = useAuthStore.getState()
      expect(state.token).toBe('new-token')
      expect(state.isAuthenticated).toBe(true)
    })

    it('should not change isInitializing', () => {
      useAuthStore.setState({ isInitializing: true })

      useAuthStore.getState().setToken('new-token')

      expect(useAuthStore.getState().isInitializing).toBe(true)
    })
  })

  describe('hydrate', () => {
    it('should set token from refresh response', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { data: { access_token: 'refreshed-token' } },
      })

      await useAuthStore.getState().hydrate()

      const state = useAuthStore.getState()
      expect(state.token).toBe('refreshed-token')
      expect(state.isAuthenticated).toBe(true)
      expect(state.isInitializing).toBe(false)
    })

    it('should clear auth state when refresh fails', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('No refresh token'))

      await useAuthStore.getState().hydrate()

      const state = useAuthStore.getState()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.isInitializing).toBe(false)
    })

    it('should clear auth state when response has no access_token', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { data: {} },
      })

      await useAuthStore.getState().hydrate()

      const state = useAuthStore.getState()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })
})
