import api from './api'
import { toItem, toListResponse } from './response'

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
  is_verified: boolean
  last_login_at: string | null
  login_count: number
  created_at: string
  updated_at: string
}

export interface User {
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
  is_verified: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface UserListResponse {
  data: User[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface UpdateUserProfileData {
  username?: string
  email?: string
  full_name?: string
  phone?: string
  bio?: string
  avatar_url?: string
}

export interface UpdateUserData {
  full_name?: string
  phone?: string
  bio?: string
  role?: string
  status?: string
  is_active?: boolean
}

export interface CreateUserData {
  email: string
  username: string
  password: string
  full_name?: string
  role?: string
}

export interface UserQueryParams {
  page?: number
  page_size?: number
  role?: string
  status?: string
  keyword?: string
}

export const userService = {
  /**
   * 获取当前用户资料
   */
  getUserProfile: async (): Promise<UserProfile> => {
    return api.get('/auth/me')
  },

  /**
   * 更新当前用户资料
   * 注意：后端 /users/me 端点不存在，使用 /users/{id} 更新当前用户
   */
  updateUserProfile: async (userId: string, data: UpdateUserProfileData): Promise<UserProfile> => {
    return api.put(`/users/${userId}`, data)
  },

  /**
   * 更新用户头像
   * 注意：后端 /users/me/avatar 端点不存在
   */
  updateAvatar: async (userId: string, avatarUrl: string): Promise<{ avatar_url: string }> => {
    return api.put(`/users/${userId}`, { avatar_url: avatarUrl })
  },

  /**
   * 修改密码
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    return api.post('/auth/password/change', {
      current_password: currentPassword,
      new_password: newPassword
    })
  },

  /**
   * 获取用户列表（管理员功能）
   */
  getUsers: async (params?: UserQueryParams): Promise<UserListResponse> => {
    const response = await api.get('/users', { params })
    return toListResponse<User>(response)
  },

  /**
   * 获取单个用户详情
   */
  getUser: async (userId: string): Promise<User> => {
    const response = await api.get(`/users/${userId}`)
    return toItem<User>(response)
  },

  /**
   * 创建用户（管理员功能）
   */
  createUser: async (data: CreateUserData): Promise<User> => {
    const response = await api.post('/users', data)
    return toItem<User>(response)
  },

  /**
   * 更新用户信息
   */
  updateUser: async (userId: string, data: UpdateUserData): Promise<User> => {
    const response = await api.put(`/users/${userId}`, data)
    return toItem<User>(response)
  },

  /**
   * 删除用户
   */
  deleteUser: async (userId: string): Promise<void> => {
    await api.delete(`/users/${userId}`)
  }
}

export default userService
