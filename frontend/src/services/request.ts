import axios, { AxiosError } from 'axios'
import { useAuthStore } from '../stores/auth'
import { BusinessError, getHttpErrorMessage, ApiErrorResponse } from '../types/error'

// 创建axios实例
const request = axios.create({
  baseURL: '/api/v1',
  timeout: 10000
})

// 是否正在刷新token
let isRefreshing = false
// 等待token刷新的请求队列
let refreshSubscribers: ((token: string) => void)[] = []

// 订阅token刷新
function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback)
}

// 通知所有订阅者新token
function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach(callback => callback(newToken))
  refreshSubscribers = []
}

// 刷新token
async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = useAuthStore.getState()

  if (!refreshToken) {
    return null
  }

  try {
    const response = await axios.post('/api/v1/auth/refresh', {
      refresh_token: refreshToken
    })

    const { access_token, refresh_token } = response.data
    const { setToken } = useAuthStore.getState()

    // 更新token
    setToken(access_token)
    // 同时更新refresh token
    localStorage.setItem('refreshToken', refresh_token)

    return access_token
  } catch (error) {
    return null
  }
}

/**
 * 处理API错误响应
 * @param error Axios错误对象
 * @returns BusinessError
 */
function handleApiError(error: AxiosError): BusinessError {
  if (error.response) {
    const { status, data } = error.response
    const errorData = data as ApiErrorResponse

    // 优先使用后端返回的错误信息
    if (errorData?.error) {
      return new BusinessError(
        errorData.error,
        errorData.code,
        errorData.details,
        status
      )
    }

    // 使用HTTP状态码对应的错误消息
    return new BusinessError(
      getHttpErrorMessage(status),
      String(status),
      undefined,
      status
    )
  }

  if (error.request) {
    return new BusinessError('网络错误，请检查网络连接', 'NETWORK_ERROR')
  }

  return new BusinessError(error.message || '请求失败', 'UNKNOWN_ERROR')
}

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const { token } = useAuthStore.getState()
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    // 保留带分页/统计元数据的列表响应，只对单对象响应自动解包。
    const responseData = response.data
    const isBinaryResponse =
      response.config.responseType === 'blob' ||
      response.config.responseType === 'arraybuffer'

    if (isBinaryResponse) {
      return responseData
    }

    if (responseData && responseData.data !== undefined) {
      const hasListMeta =
        typeof responseData === 'object' &&
        responseData !== null &&
        ['total', 'page', 'page_size', 'pages', 'items', 'unread_count'].some(
          (key) => key in responseData
        )

      if (hasListMeta) {
        return responseData
      }

      return responseData.data
    }
    return responseData
  },
  async (error) => {
    const originalRequest = error.config

    // 如果是401错误且不是刷新token的请求
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // 避免重复刷新
      if (isRefreshing) {
        // 等待token刷新完成后重试
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken: string) => {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`
            resolve(request(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const newToken = await refreshAccessToken()

        if (newToken) {
          // 通知所有等待的请求
          onTokenRefreshed(newToken)
          // 重试原请求
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`
          return request(originalRequest)
        } else {
          // 刷新失败，执行登出
          const { logout } = useAuthStore.getState()
          logout()
          window.location.href = '/login'
        }
      } catch (refreshError) {
        // 刷新失败，执行登出
        const { logout } = useAuthStore.getState()
        logout()
        window.location.href = '/login'
      } finally {
        isRefreshing = false
      }
    }

    // 处理错误并抛出统一的业务错误
    const businessError = handleApiError(error as AxiosError)
    return Promise.reject(businessError)
  }
)

export default request
