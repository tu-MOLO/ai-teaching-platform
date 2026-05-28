import axios, { AxiosError } from 'axios'
import { useAuthStore } from '../stores/auth'
import { useUserStore } from '../stores/user'
import { BusinessError, getHttpErrorMessage, ApiErrorResponse } from '../types/error'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000
})

let refreshPromise: Promise<string | null> | null = null

function handleAuthExpired(): void {
  if (refreshPromise) return
  const { logout } = useAuthStore.getState()
  const { clearUser } = useUserStore.getState()

  logout()
  clearUser()
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await axios.post('/api/v1/auth/refresh')

    const tokenPayload =
      response.data && typeof response.data === 'object' && response.data.data
        ? response.data.data
        : response.data

    const access_token = tokenPayload?.access_token

    if (!access_token) {
      return null
    }

    useAuthStore.getState().setToken(access_token)
    return access_token
  } catch {
    return null
  }
}

function handleApiError(error: AxiosError): BusinessError {
  if (error.response) {
    const { status, data } = error.response
    const errorData = data as ApiErrorResponse

    if (errorData?.error) {
      return new BusinessError(
        errorData.error,
        errorData.code,
        errorData.details,
        status
      )
    }

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

request.interceptors.request.use(
  (config) => {
    const { token } = useAuthStore.getState()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

request.interceptors.response.use(
  (response) => {
    const responseData = response.data
    const isBinaryResponse =
      response.config.responseType === 'blob' ||
      response.config.responseType === 'arraybuffer'

    if (isBinaryResponse) {
      return responseData
    }

    if (responseData && responseData.data !== undefined) {
      if (responseData.data === null) {
        return null
      }

      const hasListMeta =
        typeof responseData === 'object' &&
        responseData !== null &&
        (['total', 'page', 'page_size'].every((key) => key in responseData) ||
          'items' in responseData)

      if (hasListMeta) {
        return responseData
      }

      return responseData.data
    }

    return responseData
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null
        })
      }

      try {
        const newToken = await refreshPromise

        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return request(originalRequest)
        }
      } catch {
        // 刷新失败，继续执行后续处理
      }

      handleAuthExpired()
      return Promise.reject(handleApiError(error as AxiosError))
    }

    if (error.response?.status === 401) {
      if (refreshPromise) {
        try {
          const newToken = await refreshPromise
          if (newToken && originalRequest) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return request(originalRequest)
          }
        } catch {
          // 刷新失败，继续执行后续处理
        }
      }
      handleAuthExpired()
    }

    return Promise.reject(handleApiError(error as AxiosError))
  }
)

export default request