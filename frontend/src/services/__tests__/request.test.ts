import { describe, it, expect, vi, beforeEach } from 'vitest'

let capturedRequestInterceptor: ((config: any) => any) | null = null
let capturedResponseInterceptors: { onFulfilled: any; onRejected: any } | null = null

const mockAuthGetState = vi.fn(() => ({
  token: null,
  logout: vi.fn(),
  setToken: vi.fn(),
}))

const mockUserGetState = vi.fn(() => ({
  clearUser: vi.fn(),
}))

vi.mock('axios', () => {
  const interceptors = {
    request: {
      use: vi.fn((onFulfilled: any, onRejected: any) => {
        capturedRequestInterceptor = onFulfilled
      }),
    },
    response: {
      use: vi.fn((onFulfilled: any, onRejected: any) => {
        capturedResponseInterceptors = { onFulfilled, onRejected }
      }),
    },
  }
  const instance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors,
    defaults: { baseURL: '/api/v1', timeout: 10000 },
  }
  return {
    default: {
      create: vi.fn(() => instance),
      post: vi.fn(),
    },
  }
})

vi.mock('../../stores/auth', () => ({
  useAuthStore: {
    getState: (...args: any[]) => mockAuthGetState(...args),
  },
}))

vi.mock('../../stores/user', () => ({
  useUserStore: {
    getState: (...args: any[]) => mockUserGetState(...args),
  },
}))

describe('request module', () => {
  beforeEach(() => {
    mockAuthGetState.mockReturnValue({
      token: null,
      logout: vi.fn(),
      setToken: vi.fn(),
    })
  })

  it('should create axios instance', async () => {
    await import('../request')
    const axios = (await import('axios')).default
    expect(axios.create).toHaveBeenCalled()
  })

  it('should have request interceptor configured', async () => {
    await import('../request')
    expect(capturedRequestInterceptor).not.toBeNull()
    expect(typeof capturedRequestInterceptor).toBe('function')
  })

  it('should have response interceptor configured', async () => {
    await import('../request')
    expect(capturedResponseInterceptors).not.toBeNull()
    expect(typeof capturedResponseInterceptors!.onFulfilled).toBe('function')
    expect(typeof capturedResponseInterceptors!.onRejected).toBe('function')
  })

  it('should add Authorization header when token exists', async () => {
    await import('../request')
    mockAuthGetState.mockReturnValue({
      token: 'test-token',
      logout: vi.fn(),
      setToken: vi.fn(),
    })

    const config = { headers: {} }
    const result = capturedRequestInterceptor!(config)

    expect(result.headers.Authorization).toBe('Bearer test-token')
  })

  it('should not add Authorization header when token is null', async () => {
    await import('../request')
    mockAuthGetState.mockReturnValue({
      token: null,
      logout: vi.fn(),
      setToken: vi.fn(),
    })

    const config = { headers: {} }
    const result = capturedRequestInterceptor!(config)

    expect(result.headers.Authorization).toBeUndefined()
  })

  it('should return config unchanged from request interceptor', async () => {
    await import('../request')
    mockAuthGetState.mockReturnValue({
      token: null,
      logout: vi.fn(),
      setToken: vi.fn(),
    })

    const config = { headers: {}, url: '/test' }
    const result = capturedRequestInterceptor!(config)

    expect(result.url).toBe('/test')
  })

  it('should extract data from response wrapper', async () => {
    await import('../request')
    const response = {
      data: { data: { id: '1', name: 'test' } },
      config: { responseType: undefined },
    }

    const result = capturedResponseInterceptors!.onFulfilled(response)
    expect(result).toEqual({ id: '1', name: 'test' })
  })

  it('should return null when response data is null', async () => {
    await import('../request')
    const response = {
      data: { data: null },
      config: { responseType: undefined },
    }

    const result = capturedResponseInterceptors!.onFulfilled(response)
    expect(result).toBeNull()
  })

  it('should return raw data when no data wrapper', async () => {
    await import('../request')
    const response = {
      data: { message: 'success' },
      config: { responseType: undefined },
    }

    const result = capturedResponseInterceptors!.onFulfilled(response)
    expect(result).toEqual({ message: 'success' })
  })

  it('should return binary response data as-is for blob', async () => {
    await import('../request')
    const blobData = new Blob(['test'])
    const response = {
      data: blobData,
      config: { responseType: 'blob' },
    }

    const result = capturedResponseInterceptors!.onFulfilled(response)
    expect(result).toBe(blobData)
  })
})
