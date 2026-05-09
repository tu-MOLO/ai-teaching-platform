import axios, { AxiosError } from 'axios'
import { useAuthStore } from '../stores/auth'
import { BusinessError, getHttpErrorMessage, ApiErrorResponse } from '../types/error'

const request = axios.create({
  baseURL: '/api/v1',
  timeout: 10000
})

let refreshPromise: Promise<string | null> | null = null

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
    const { login, refreshToken: oldRefreshToken } = useAuthStore.getState()

    login(access_token, refresh_token || oldRefreshToken)
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

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null
        })
      }

      const newToken = await refreshPromise

      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return request(originalRequest)
      }

      const { logout } = useAuthStore.getState()
      logout()
    }

    return Promise.reject(handleApiError(error as AxiosError))
  }
)

export default request
