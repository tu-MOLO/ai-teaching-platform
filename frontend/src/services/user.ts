import api from './api'

export interface UserProfile {
  id: string
  email: string
  username: string
  full_name: string | null
  avatar_url: string | null
  role: string
  status: string
  is_active: boolean
  last_login_at: string | null
  login_count: number
  permissions: string[]
}

export interface UpdateUserProfileData {
  username?: string
  email?: string
  full_name?: string
  phone?: string
  bio?: string
  avatar_url?: string
}

export const userService = {
  getUserProfile: async (): Promise<UserProfile> => {
    return api.get('/auth/me')
  },

  updateUserProfile: async (data: UpdateUserProfileData): Promise<UserProfile> => {
    const currentUser = await api.get('/auth/me') as UserProfile
    return api.put(`/users/${currentUser.id}`, data)
  },

  updateAvatar: async (userId: string, avatarUrl: string): Promise<{ avatar_url: string }> => {
    return api.put(`/users/${userId}`, { avatar_url: avatarUrl })
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    return api.post('/auth/password/change', {
      current_password: currentPassword,
      new_password: newPassword,
    })
  }
}

export default userService
