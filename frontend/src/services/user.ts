import api from './api'

export interface UserProfile {
  id: string
  email: string
  username: string
  full_name: string | null
  phone: string | null
  bio: string | null
  avatar_url: string | null
  role: string
  status: string
  is_active: boolean
  last_login_at: string | null
  login_count: number
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

  uploadAvatar: async (userId: string, file: Blob): Promise<{ avatar_url: string }> => {
    const formData = new FormData()
    formData.append('file', file, 'avatar.png')
    return api.post(`/users/${userId}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    })
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    return api.post('/auth/password/change', {
      current_password: currentPassword,
      new_password: newPassword,
    })
  }
}

export default userService
