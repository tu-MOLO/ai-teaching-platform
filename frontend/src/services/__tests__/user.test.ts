import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()

vi.mock('../api', () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    put: (...args: any[]) => mockPut(...args),
    delete: (...args: any[]) => mockDelete(...args),
  }
}))

describe('user service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('userService.getUserProfile', () => {
    it('calls api.get with /auth/me', async () => {
      const { userService } = await import('../user')

      const profileData = { id: '1', email: 'test@test.com', username: 'testuser' }
      mockGet.mockResolvedValue(profileData)

      const result = await userService.getUserProfile()

      expect(mockGet).toHaveBeenCalledWith('/auth/me')
      expect(result).toBe(profileData)
    })
  })

  describe('userService.updateUserProfile', () => {
    it('calls api.get(/auth/me) first then api.put(/users/{id}, data)', async () => {
      const { userService } = await import('../user')
      const data = { username: 'updateduser', full_name: 'Updated Name' }

      mockGet.mockResolvedValue({ id: 'user-1', email: 'test@test.com', username: 'olduser' })
      mockPut.mockResolvedValue({ id: 'user-1', username: 'updateduser', full_name: 'Updated Name' })

      const result = await userService.updateUserProfile(data)

      expect(mockGet).toHaveBeenCalledWith('/auth/me')
      expect(mockPut).toHaveBeenCalledWith('/users/user-1', data)
      expect(result).toEqual({ id: 'user-1', username: 'updateduser', full_name: 'Updated Name' })
    })
  })

  describe('userService.changePassword', () => {
    it('calls api.post with /auth/password/change and {current_password, new_password}', async () => {
      const { userService } = await import('../user')

      mockPost.mockResolvedValue(undefined)

      await userService.changePassword('oldpass', 'newpass')

      expect(mockPost).toHaveBeenCalledWith('/auth/password/change', {
        current_password: 'oldpass',
        new_password: 'newpass',
      })
    })
  })
})