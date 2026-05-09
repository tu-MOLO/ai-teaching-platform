import api from './api'

export interface LoginData {
  username: string
  password: string
  remember_me?: boolean
}

export interface TokenData {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  refresh_expires_in: number
}

export interface UserAuthInfo {
  id: string
  username: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: string
  is_active: boolean
}

export interface LoginResponse {
  token: TokenData
  user: UserAuthInfo
}

export interface RegisterData {
  username: string
  email: string
  password: string
  full_name?: string
  security_question: string
  security_answer: string
}

export interface PasswordChangeData {
  current_password: string
  new_password: string
}

export interface PasswordResetData {
  username: string
  new_password: string
  security_answer: string
}

export interface SecurityQuestionData {
  username: string
}

export interface SecurityQuestionResponse {
  username: string
  security_question: string
  is_legacy: boolean
}

export interface RefreshTokenData {
  refresh_token: string
}

export const authService = {
  /**
   * 用户登录
   */
  login: async (data: LoginData): Promise<{ access_token: string; refresh_token: string; user: UserAuthInfo }> => {
    const response: LoginResponse = await api.post('/auth/login', data)
    return {
      access_token: response.token.access_token,
      refresh_token: response.token.refresh_token,
      user: response.user
    }
  },

  /**
   * 用户登出
   */
  logout: async (): Promise<void> => {
    return api.post('/auth/logout')
  },

  /**
   * 获取当前用户信息
   */
  getProfile: async (): Promise<UserAuthInfo> => {
    return api.get('/auth/me')
  },

  /**
   * 用户注册
   */
  register: async (data: RegisterData): Promise<{ message: string; code: string }> => {
    return api.post('/auth/register', data)
  },

  /**
   * 刷新访问令牌
   */
  refreshToken: async (refreshToken: string): Promise<TokenData> => {
    return api.post('/auth/refresh', { refresh_token: refreshToken })
  },

  /**
   * 修改密码
   */
  changePassword: async (data: PasswordChangeData): Promise<{ message: string; code: string }> => {
    return api.post('/auth/password/change', data)
  },

  /**
   * 本地密码重置
   */
  resetPassword: async (data: PasswordResetData): Promise<{ message: string; code: string }> => {
    return api.post('/auth/password/reset', data)
  },

  /**
   * 获取安全问题
   */
  getSecurityQuestion: async (data: SecurityQuestionData): Promise<SecurityQuestionResponse> => {
    return api.post('/auth/password/reset/question', data)
  }
}

export default authService
