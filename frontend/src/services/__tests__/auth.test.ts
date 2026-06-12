import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()

vi.mock('../api', () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
  }
}))

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('calls api.post with /auth/login and login data', async () => {
      const { authService } = await import('../auth')
      const loginData = { username: 'testuser', password: 'pass123', remember_me: true }

      mockPost.mockResolvedValue({
        token: { access_token: 'at', refresh_token: 'rt', token_type: 'bearer', expires_in: 3600, refresh_expires_in: 7200 },
        user: { id: '1', username: 'testuser', email: 'test@test.com', full_name: null, avatar_url: null, role: 'teacher', is_active: true }
      })

      await authService.login(loginData)

      expect(mockPost).toHaveBeenCalledWith('/auth/login', loginData)
    })

    it('returns extracted token and user', async () => {
      const { authService } = await import('../auth')

      mockPost.mockResolvedValue({
        token: { access_token: 'at', refresh_token: 'rt', token_type: 'bearer', expires_in: 3600, refresh_expires_in: 7200 },
        user: { id: '1', username: 'testuser', email: 'test@test.com', full_name: 'Test User', avatar_url: null, role: 'teacher', is_active: true }
      })

      const result = await authService.login({ username: 'testuser', password: 'pass123' })

      expect(result).toEqual({
        access_token: 'at',
        refresh_token: 'rt',
        user: { id: '1', username: 'testuser', email: 'test@test.com', full_name: 'Test User', avatar_url: null, role: 'teacher', is_active: true }
      })
    })
  })

  describe('logout', () => {
    it('calls api.post with /auth/logout', async () => {
      const { authService } = await import('../auth')

      mockPost.mockResolvedValue(undefined)

      await authService.logout()

      expect(mockPost).toHaveBeenCalledWith('/auth/logout')
    })
  })

  describe('getProfile', () => {
    it('calls api.get with /auth/me', async () => {
      const { authService } = await import('../auth')

      mockGet.mockResolvedValue({ id: '1', username: 'testuser', email: 'test@test.com', full_name: null, avatar_url: null, role: 'teacher', is_active: true })

      await authService.getProfile()

      expect(mockGet).toHaveBeenCalledWith('/auth/me')
    })

    it('returns user profile', async () => {
      const { authService } = await import('../auth')
      const profile = { id: '1', username: 'testuser', email: 'test@test.com', full_name: 'Test User', avatar_url: null, role: 'teacher', is_active: true }

      mockGet.mockResolvedValue(profile)

      const result = await authService.getProfile()

      expect(result).toBe(profile)
    })
  })

  describe('register', () => {
    it('calls api.post with /auth/register and register data', async () => {
      const { authService } = await import('../auth')
      const registerData = {
        username: 'newuser',
        email: 'new@test.com',
        password: 'pass123',
        full_name: 'New User',
        security_question: 'What is your pet?',
        security_answer: 'dog'
      }

      mockPost.mockResolvedValue({ message: 'success', code: 'OK' })

      await authService.register(registerData)

      expect(mockPost).toHaveBeenCalledWith('/auth/register', registerData)
    })

    it('returns register response', async () => {
      const { authService } = await import('../auth')
      const response = { message: 'success', code: 'OK' }

      mockPost.mockResolvedValue(response)

      const result = await authService.register({
        username: 'newuser', email: 'new@test.com', password: 'pass123',
        security_question: 'q', security_answer: 'a'
      })

      expect(result).toEqual(response)
    })
  })

  describe('changePassword', () => {
    it('calls api.post with /auth/password/change and password data', async () => {
      const { authService } = await import('../auth')
      const passwordData = { current_password: 'old', new_password: 'new' }

      mockPost.mockResolvedValue({ message: 'success', code: 'OK' })

      await authService.changePassword(passwordData)

      expect(mockPost).toHaveBeenCalledWith('/auth/password/change', passwordData)
    })

    it('returns change password response', async () => {
      const { authService } = await import('../auth')
      const response = { message: 'success', code: 'OK' }

      mockPost.mockResolvedValue(response)

      const result = await authService.changePassword({ current_password: 'old', new_password: 'new' })

      expect(result).toEqual(response)
    })
  })

  describe('resetPassword', () => {
    it('calls api.post with /auth/password/reset and reset data', async () => {
      const { authService } = await import('../auth')
      const resetData = { username: 'testuser', new_password: 'newpass', security_answer: 'dog' }

      mockPost.mockResolvedValue({ message: 'success', code: 'OK' })

      await authService.resetPassword(resetData)

      expect(mockPost).toHaveBeenCalledWith('/auth/password/reset', resetData)
    })

    it('returns reset password response', async () => {
      const { authService } = await import('../auth')
      const response = { message: 'success', code: 'OK' }

      mockPost.mockResolvedValue(response)

      const result = await authService.resetPassword({ username: 'u', new_password: 'p', security_answer: 'a' })

      expect(result).toEqual(response)
    })
  })

  describe('getSecurityQuestion', () => {
    it('calls api.post with /auth/password/reset/question and data', async () => {
      const { authService } = await import('../auth')
      const data = { username: 'testuser' }

      mockPost.mockResolvedValue({ username: 'testuser', security_question: 'What is your pet?', is_legacy: false })

      await authService.getSecurityQuestion(data)

      expect(mockPost).toHaveBeenCalledWith('/auth/password/reset/question', data)
    })

    it('returns security question response', async () => {
      const { authService } = await import('../auth')
      const response = { username: 'testuser', security_question: 'What is your pet?', is_legacy: false }

      mockPost.mockResolvedValue(response)

      const result = await authService.getSecurityQuestion({ username: 'testuser' })

      expect(result).toEqual(response)
    })
  })

  describe('error handling', () => {
    it('login throws on network error', async () => {
      const { authService } = await import('../auth')
      mockPost.mockRejectedValue(new Error('Network Error'))
      await expect(authService.login({ username: 'u', password: 'p' })).rejects.toThrow('Network Error')
    })

    it('getProfile throws on network error', async () => {
      const { authService } = await import('../auth')
      mockGet.mockRejectedValue(new Error('Network Error'))
      await expect(authService.getProfile()).rejects.toThrow('Network Error')
    })

    it('register throws on network error', async () => {
      const { authService } = await import('../auth')
      mockPost.mockRejectedValue(new Error('Network Error'))
      await expect(authService.register({ username: 'u', email: 'e', password: 'p', security_question: 'q', security_answer: 'a' })).rejects.toThrow('Network Error')
    })
  })
})